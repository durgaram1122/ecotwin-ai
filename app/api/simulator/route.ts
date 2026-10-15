import { fail, nowId, ok } from '@/lib/http';
import { addReading, getSnapshot } from '@/lib/store';
import type { SensorReading, SustainabilityAlert } from '@/lib/types';

export async function POST(request: Request) {
  const snapshot = await getSnapshot();
  let body: { facilityId?: string } = {};
  try { body = await request.json() as typeof body; } catch { /* optional body */ }
  const facility = body.facilityId ? snapshot.facilities.find((item) => item.id === body.facilityId) : snapshot.facilities[Math.floor(Math.random() * snapshot.facilities.length)];
  if (!facility) return fail('Facility not found', 404, 'FACILITY_NOT_FOUND');
  const reading: SensorReading = { id: nowId('reading'), facilityId: facility.id, recordedAt: new Date().toISOString(), energyKwh: Number((facility.thresholds.energyKwh * (0.74 + Math.random() * 0.48)).toFixed(1)), waterLitres: Number((facility.thresholds.waterLitres * (0.72 + Math.random() * 0.5)).toFixed(1)), occupancy: facility.type.includes('Class') || facility.type.includes('Laboratory') ? Math.round(10 + Math.random() * 52) : null, temperatureC: Number((23 + Math.random() * 5).toFixed(1)), source: 'simulated' };
  const exceedsEnergy = reading.energyKwh > facility.thresholds.energyKwh;
  const exceedsWater = reading.waterLitres > facility.thresholds.waterLitres;
  const thresholdAlert: SustainabilityAlert | undefined = exceedsEnergy || exceedsWater ? { id: nowId('alert'), facilityId: facility.id, category: exceedsEnergy ? 'energy' : 'water', severity: exceedsEnergy && exceedsWater ? 'high' : 'medium', description: `${exceedsEnergy ? `Electricity ${reading.energyKwh} kWh is above the ${facility.thresholds.energyKwh} kWh threshold.` : `Water ${reading.waterLitres} L is above the ${facility.thresholds.waterLitres} L threshold.`}`, evidenceSource: 'simulated_sensor', createdAt: new Date().toISOString(), recommendedAction: 'Verify the reading against a physical meter and inspect the facility before taking corrective action.', status: 'open' } : undefined;
  await addReading(reading, thresholdAlert);
  return ok({ reading, alert: thresholdAlert || null, dataSource: 'SIMULATED DATA' });
}
