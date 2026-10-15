import { z } from 'zod';
import type { AnalysisIssue, Facility, FacilitySnapshot, Severity } from './types';

const issueSchema = z.object({
  category: z.enum(['occupancy', 'energy', 'water', 'waste', 'resource_utilization', 'no_confirmed_issue']),
  title: z.string().min(1).max(160),
  evidence: z.string().min(1).max(900),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1).nullable(),
  recommendedAction: z.string().min(1).max(500)
});

const analysisSchema = z.object({
  summary: z.string().min(1).max(1200),
  limitations: z.array(z.string().min(1).max(300)).max(8),
  issues: z.array(issueSchema).max(8),
  overallRecommendation: z.string().min(1).max(800)
});

export type ValidatedAnalysis = z.infer<typeof analysisSchema>;

const defaultVisionModel = 'gemini-3.1-flash-lite';

type GeminiResponse = {
  error?: { code?: number; status?: string; message?: string };
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function configuredModelName() {
  return (process.env.GEMINI_MODEL?.trim() || defaultVisionModel).replace(/^models\//, '');
}

function configuredModel() {
  const key = process.env.GEMINI_API_KEY;
  const model = configuredModelName();
  if (!key) throw new Error('AI_NOT_CONFIGURED');
  return { key, model };
}

export function getGeminiConfigStatus() {
  return { configured: Boolean(process.env.GEMINI_API_KEY), model: configuredModelName() };
}

function parseJson(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { throw new Error('AI_INVALID_JSON'); }
    }
    throw new Error('AI_INVALID_JSON');
  }
}

async function callGemini(contents: unknown[], json = true) {
  const { key, model } = configuredModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ contents, generationConfig: json ? { temperature: 0.15, responseMimeType: 'application/json' } : { temperature: 0.35 } })
    });
    let payload: GeminiResponse;
    try {
      payload = await response.json() as GeminiResponse;
    } catch {
      console.error('[Gemini] upstream response was not valid JSON', { model, httpStatus: response.status });
      throw new Error('AI_PROVIDER_ERROR');
    }
    if (!response.ok || payload.error) {
      console.error('[Gemini] upstream error', {
        model,
        httpStatus: response.status,
        providerCode: payload.error?.code,
        providerStatus: payload.error?.status,
        providerMessage: payload.error?.message
      });
      if (response.status === 401 || response.status === 403) throw new Error('AI_INVALID_KEY');
      if (response.status === 404) throw new Error('AI_MODEL_UNAVAILABLE');
      if (response.status === 429) throw new Error('AI_QUOTA_EXCEEDED');
      if (response.status === 400) throw new Error('AI_REQUEST_INVALID');
      if (response.status >= 500) throw new Error('AI_PROVIDER_UNAVAILABLE');
      throw new Error('AI_PROVIDER_ERROR');
    }
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!text) throw new Error('AI_EMPTY_RESPONSE');
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('AI_')) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new Error('AI_TIMEOUT');
    console.error('[Gemini] network failure', { model, errorName: error instanceof Error ? error.name : 'unknown', errorMessage: error instanceof Error ? error.message : String(error) });
    throw new Error('AI_NETWORK_ERROR');
  } finally { clearTimeout(timeout); }
}

export async function analyzeCampusImage(input: { facility: Facility; imageDataUrl: string }): Promise<ValidatedAnalysis & { model: string }> {
  const { model } = configuredModel();
  const [header, data] = input.imageDataUrl.split(',', 2);
  const mimeType = header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const prompt = `You are a careful visual sustainability auditor. Analyze only visible evidence in this still image from the facility "${input.facility.name}" (${input.facility.type}, room ${input.facility.room}). Return exactly one JSON object with these keys and types: summary (string), limitations (array of strings), issues (array), and overallRecommendation (string). Each issues item must use exactly these keys: category (one of occupancy, energy, water, waste, resource_utilization, no_confirmed_issue), title (string), evidence (string), severity (one of low, medium, high, critical), confidence (number from 0 to 1 or null), and recommendedAction (string). Do not use alternate keys such as type or explanation. Do not claim hidden leaks, actual electricity/water consumption, how long a room was empty, or operating states that cannot be seen. Occupancy is an estimate from this still image. If evidence is insufficient, return one no_confirmed_issue item with title, evidence, confidence null, recommendedAction, and severity low. JSON only; no markdown fences.`;
  const text = await callGemini([{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data } }] }]);
  let result: ValidatedAnalysis;
  try {
    result = analysisSchema.parse(parseJson(text));
  } catch (error) {
    console.error('[Gemini] response schema validation failed', {
      model,
      issuePaths: error instanceof z.ZodError ? error.issues.slice(0, 8).map((issue) => issue.path.join('.')) : []
    });
    throw new Error(error instanceof z.ZodError ? 'AI_INVALID_RESPONSE' : 'AI_INVALID_JSON');
  }
  return { ...result, model };
}

export async function generateAdvisorText(input: { question: string; facility?: FacilitySnapshot; context: string }) {
  const prompt = `You are EcoTwin AI's sustainability advisor. Use the provided application context, stay honest about simulated readings and visible evidence, and answer the operator's request with concise, actionable markdown. If evidence is insufficient, say what needs verification.\n\nREQUEST: ${input.question}\n\nFACILITY: ${input.facility?.name ?? 'Campus-wide'}\n\nCONTEXT:\n${input.context}`;
  return callGemini([{ role: 'user', parts: [{ text: prompt }] }], false);
}

export function validateIssues(issues: AnalysisIssue[]) { return issues.filter((issue) => issue.title && issue.evidence).slice(0, 8); }

export function topSeverity(issues: AnalysisIssue[]): Severity {
  const rank: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  return issues.reduce<Severity>((best, issue) => rank[issue.severity] > rank[best] ? issue.severity : best, 'low');
}
