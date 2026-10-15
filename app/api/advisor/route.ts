import { generateAdvisorText } from '@/lib/gemini';
import { fail, ok } from '@/lib/http';
import { getFacilitySnapshot, getSnapshot } from '@/lib/store';

function fallbackReason(code: string) {
  if (code === 'AI_NOT_CONFIGURED') return 'Gemini is not configured on the server. Add GEMINI_API_KEY to the managed server secrets.';
  if (code === 'AI_INVALID_KEY') return 'Gemini rejected the server key (HTTP 401/403). Check the managed GEMINI_API_KEY secret.';
  if (code === 'AI_MODEL_UNAVAILABLE') return 'The configured Gemini model is unavailable for this key (HTTP 404).';
  if (code === 'AI_QUOTA_EXCEEDED') return 'Gemini quota or rate limits were reached (HTTP 429).';
  if (code === 'AI_REQUEST_INVALID') return 'Gemini rejected the Advisor request (HTTP 400).';
  if (code === 'AI_TIMEOUT') return 'Gemini timed out before responding.';
  if (code === 'AI_PROVIDER_UNAVAILABLE') return 'Gemini returned a temporary provider error (HTTP 5xx).';
  if (code === 'AI_NETWORK_ERROR') return 'The EcoTwin server could not reach Gemini.';
  if (code === 'AI_INVALID_JSON' || code === 'AI_EMPTY_RESPONSE' || code === 'AI_INVALID_RESPONSE') return 'Gemini returned an unusable response.';
  return 'Gemini returned an unexpected provider error.';
}

export async function POST(request: Request) {
  let body: { question?: string; facilityId?: string };
  try { body = await request.json() as typeof body; } catch { return fail('Request body must be valid JSON'); }
  const question = body.question?.trim();
  if (!question) return fail('question is required');
  const snapshot = await getSnapshot();
  const facility = body.facilityId ? await getFacilitySnapshot(body.facilityId) : undefined;
  if (body.facilityId && !facility) return fail('Facility not found', 404, 'FACILITY_NOT_FOUND');
  const scopedAlerts = snapshot.alerts.filter((alert) => !facility || alert.facilityId === facility.id);
  const scopedReadings = snapshot.readings.filter((reading) => !facility || reading.facilityId === facility.id).slice(0, 10);
  const scopedAnalyses = (facility ? facility.analyses : snapshot.analyses).slice(0, 4);
  const scopedRecommendations = (facility ? facility.recommendations : snapshot.recommendations).slice(0, 4);
  const recentAnalyses = scopedAnalyses.map((analysis) => ({
    id: analysis.id,
    fileName: analysis.fileName,
    analyzedAt: analysis.analyzedAt,
    status: analysis.status,
    summary: analysis.summary,
    limitations: analysis.limitations,
    issues: analysis.issues,
    model: analysis.model,
    source: analysis.source
  }));
  const context = JSON.stringify({
    selectedFacility: facility ? { id: facility.id, name: facility.name, type: facility.type, building: facility.building, room: facility.room, description: facility.description } : undefined,
    thresholds: facility?.thresholds,
    openAlerts: scopedAlerts.filter((alert) => alert.status !== 'resolved'),
    recentReadings: scopedReadings,
    recentAnalyses,
    recommendations: scopedRecommendations,
    historicalRecordCount: snapshot.readings.length
  });
  try {
    const answer = await generateAdvisorText({ question, facility: facility || undefined, context });
    return ok({ answer, source: 'gemini', status: 'gemini', dataSource: process.env.DATABASE_URL ? 'managed_database' : 'local_json_demo' });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'AI_PROVIDER_ERROR';
    const reason = fallbackReason(code);
    console.warn('[Advisor] Gemini fallback', { code, reason });
    const lead = facility ? `${facility.name} has ${scopedAlerts.filter((alert) => alert.status !== 'resolved').length} open alert(s).` : `The campus has ${scopedAlerts.filter((alert) => alert.status !== 'resolved').length} open alert(s).`;
    return ok({ answer: `${lead}\n\nRules-based fallback: ${reason} Verify simulated readings against physical meters, inspect the highest-severity open alert first, and record the corrective action before resolving it.`, source: 'fallback', status: 'fallback', dataSource: process.env.DATABASE_URL ? 'managed_database' : 'local_json_demo', warning: reason, errorCode: code });
  }
}
