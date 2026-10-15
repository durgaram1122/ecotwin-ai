import { fail, ok } from '@/lib/http';
import { getSnapshot, updateAlertStatus } from '@/lib/store';
import type { AlertStatus } from '@/lib/types';

const statuses = new Set<AlertStatus>(['open', 'in_progress', 'resolved']);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: { status?: AlertStatus };
  try { body = await request.json() as { status?: AlertStatus }; } catch { return fail('Request body must be valid JSON'); }
  if (!body.status || !statuses.has(body.status)) return fail('status must be open, in_progress or resolved');
  const snapshot = await getSnapshot();
  if (!snapshot.alerts.some((alert) => alert.id === id)) return fail('Alert not found', 404, 'ALERT_NOT_FOUND');
  await updateAlertStatus(id, body.status);
  const next = (await getSnapshot()).alerts.find((alert) => alert.id === id);
  return ok({ alert: next });
}
