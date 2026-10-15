import { fail, nowId, ok } from '@/lib/http';
import { getSnapshot, insertAlert } from '@/lib/store';
import type { SustainabilityAlert } from '@/lib/types';

const severities = new Set(['low', 'medium', 'high', 'critical']);
const sources = new Set(['ai_image_analysis', 'simulated_sensor', 'real_sensor', 'operator']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const snapshot = await getSnapshot();
  let alerts = snapshot.alerts;
  if (url.searchParams.get('facilityId')) alerts = alerts.filter((alert) => alert.facilityId === url.searchParams.get('facilityId'));
  if (url.searchParams.get('status')) alerts = alerts.filter((alert) => alert.status === url.searchParams.get('status'));
  return ok({ alerts });
}

export async function POST(request: Request) {
  let body: Partial<SustainabilityAlert>;
  try { body = await request.json() as Partial<SustainabilityAlert>; } catch { return fail('Request body must be valid JSON'); }
  const snapshot = await getSnapshot();
  if (!body.facilityId || !snapshot.facilities.some((facility) => facility.id === body.facilityId)) return fail('A valid facilityId is required', 404, 'FACILITY_NOT_FOUND');
  if (!body.description || !body.category || !body.severity || !severities.has(body.severity)) return fail('category, description and a valid severity are required');
  if (body.evidenceSource && !sources.has(body.evidenceSource)) return fail('Invalid evidence source');
  const alert: SustainabilityAlert = { id: nowId('alert'), facilityId: body.facilityId, category: body.category, severity: body.severity, description: body.description, evidenceSource: body.evidenceSource || 'operator', createdAt: new Date().toISOString(), recommendedAction: body.recommendedAction || 'Inspect the facility and record the corrective action.', status: 'open' };
  await insertAlert(alert);
  return ok({ alert }, { status: 201 });
}
