import { getSnapshot } from '@/lib/store';
import { ok } from '@/lib/http';

export async function GET() {
  const snapshot = await getSnapshot();
  return ok({ facilities: snapshot.facilities, dataMode: process.env.DATABASE_URL ? 'managed_database' : 'local_json_demo' });
}
