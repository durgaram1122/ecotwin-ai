import { getFacilitySnapshot } from '@/lib/store';
import { fail, ok } from '@/lib/http';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const facility = await getFacilitySnapshot(id);
  if (!facility) return fail('Facility not found', 404, 'FACILITY_NOT_FOUND');
  return ok({ facility });
}
