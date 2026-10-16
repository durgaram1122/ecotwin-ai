import { analyzeCampusImage, topSeverity, validateIssues } from '@/lib/gemini';
import { fail, nowId, ok } from '@/lib/http';
import { getSnapshot, persistAnalysis } from '@/lib/store';
import type { ImageAnalysis, Recommendation, SustainabilityAlert } from '@/lib/types';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 6 * 1024 * 1024;

function decodeAndValidateImage(imageDataUrl: string, mimeType: string) {
  const prefix = `data:${mimeType};base64,`;
  if (!imageDataUrl.startsWith(prefix)) throw new Error('INVALID_IMAGE_PAYLOAD');
  const encoded = imageDataUrl.slice(prefix.length);
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error('INVALID_IMAGE_PAYLOAD');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new Error('INVALID_IMAGE_PAYLOAD');
  if (bytes.byteLength > maxBytes) throw new Error('IMAGE_TOO_LARGE');
  const isJpeg = mimeType === 'image/jpeg' && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  const isPng = mimeType === 'image/png' && bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && bytes.subarray(12, 16).toString('ascii') === 'IHDR' && bytes.subarray(-8, -4).toString('ascii') === 'IEND';
  const isWebp = mimeType === 'image/webp' && bytes.length >= 20 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) throw new Error('INVALID_IMAGE_CONTENT');
  return bytes.byteLength;
}

export async function POST(request: Request) {
  let body: { facilityId?: string; fileName?: string; mimeType?: string; fileSize?: number; imageDataUrl?: string };
  try { body = await request.json() as typeof body; } catch { return fail('Request body must be valid JSON', 400, 'INVALID_JSON'); }
  if (!body.facilityId || !body.fileName || !body.mimeType || !body.imageDataUrl) return fail('facilityId, fileName, mimeType and imageDataUrl are required');
  if (!allowed.has(body.mimeType)) return fail('Only JPEG, PNG and WebP images are supported', 415, 'UNSUPPORTED_IMAGE_TYPE');
  let decodedBytes: number;
  try { decodedBytes = decodeAndValidateImage(body.imageDataUrl, body.mimeType); }
  catch (error) {
    const code = error instanceof Error ? error.message : 'INVALID_IMAGE_PAYLOAD';
    if (code === 'IMAGE_TOO_LARGE' || Number(body.fileSize || 0) > maxBytes) return fail('Image must be 6 MB or smaller', 413, 'IMAGE_TOO_LARGE');
    if (code === 'INVALID_IMAGE_CONTENT') return fail('Image content does not match the selected JPEG, PNG or WebP type', 415, 'INVALID_IMAGE_CONTENT');
    return fail('Image payload is not a valid base64 image data URL', 400, 'INVALID_IMAGE_PAYLOAD');
  }
  if (Number(body.fileSize || decodedBytes) > maxBytes) return fail('Image must be 6 MB or smaller', 413, 'IMAGE_TOO_LARGE');
  const snapshot = await getSnapshot();
  const facility = snapshot.facilities.find((item) => item.id === body.facilityId);
  if (!facility) return fail('Facility not found', 404, 'FACILITY_NOT_FOUND');
  try {
    const result = await analyzeCampusImage({ facility, imageDataUrl: body.imageDataUrl });
    const issues = validateIssues(result.issues);
    const analysis: ImageAnalysis = { id: nowId('analysis'), facilityId: facility.id, fileName: body.fileName, mimeType: body.mimeType, fileSize: decodedBytes, imageDataUrl: body.imageDataUrl, analyzedAt: new Date().toISOString(), status: 'completed', summary: result.summary, limitations: result.limitations, issues, model: result.model, source: 'gemini' };
    const severity = topSeverity(issues);
    const recommendation: Recommendation = { id: nowId('recommendation'), facilityId: facility.id, analysisId: analysis.id, createdAt: new Date().toISOString(), title: 'Next inspection step', detail: result.overallRecommendation, priority: severity, source: 'ai' };
    const alerts: SustainabilityAlert[] = issues.filter((issue) => issue.category !== 'no_confirmed_issue' && (issue.severity === 'high' || issue.severity === 'critical')).map((issue) => ({ id: nowId('alert'), facilityId: facility.id, category: issue.category, severity: issue.severity, description: `${issue.title}: ${issue.evidence}`, evidenceSource: 'ai_image_analysis', createdAt: new Date().toISOString(), recommendedAction: issue.recommendedAction, status: 'open', analysisId: analysis.id }));
    try {
      await persistAnalysis(analysis, recommendation, alerts);
    } catch (persistError) {
      console.error('[Analyses] persistAnalysis failed', persistError);
      return fail('Analysis was generated but failed to save to storage. Please retry.', 500, 'PERSISTENCE_ERROR');
    }
    return ok({ analysis, recommendation, alerts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI analysis failed';
    if (message === 'AI_NOT_CONFIGURED') return fail('Gemini is not configured. Add GEMINI_API_KEY on the server and retry. GEMINI_MODEL defaults to gemini-3.1-flash-lite unless overridden. No analysis was saved.', 503, 'AI_NOT_CONFIGURED');
    if (message === 'AI_INVALID_KEY') return fail('Gemini rejected the server key (HTTP 401/403). Check GEMINI_API_KEY in the managed project secrets. No analysis was saved.', 502, 'AI_INVALID_KEY');
    if (message === 'AI_MODEL_UNAVAILABLE') return fail('The configured Gemini model is unavailable (HTTP 404) for this key. Set GEMINI_MODEL to a model returned by the Gemini models endpoint that supports generateContent. No analysis was saved.', 502, 'AI_MODEL_UNAVAILABLE');
    if (message === 'AI_QUOTA_EXCEEDED') return fail('Gemini quota or rate limits were reached (HTTP 429). Retry later or review the project quota. No analysis was saved.', 429, 'AI_QUOTA_EXCEEDED');
    if (message === 'AI_REQUEST_INVALID') return fail('Gemini rejected the image-analysis request (HTTP 400). Check the configured model and image payload. No analysis was saved.', 502, 'AI_REQUEST_INVALID');
    if (message === 'AI_TIMEOUT') return fail('Gemini timed out before responding. Retry with the same image. No analysis was saved.', 504, 'AI_TIMEOUT');
    if (message === 'AI_PROVIDER_UNAVAILABLE') return fail('Gemini accepted the request but returned a temporary provider error (HTTP 5xx). Retry shortly. No analysis was saved.', 503, 'AI_PROVIDER_UNAVAILABLE');
    if (message === 'AI_NETWORK_ERROR') return fail('The EcoTwin server could not reach Gemini. Check outbound network access from the server runtime and retry. No analysis was saved.', 503, 'AI_NETWORK_ERROR');
    if (message === 'AI_INVALID_JSON' || message === 'AI_EMPTY_RESPONSE') return fail('Gemini returned an unusable response. No analysis was saved; retry after checking the selected model.', 502, message);
    if (message === 'AI_INVALID_RESPONSE') return fail('Gemini returned JSON that did not match EcoTwin\'s analysis format. No analysis was saved; retry with the selected model.', 502, 'AI_INVALID_RESPONSE');
    return fail('Gemini returned an unexpected provider error. No analysis was saved.', 502, 'AI_PROVIDER_ERROR');
  }
}
