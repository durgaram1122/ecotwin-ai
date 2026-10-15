import { ok } from '@/lib/http';
import { getGeminiConfigStatus } from '@/lib/gemini';
import { getSnapshot } from '@/lib/store';

export async function GET() {
  const data = await getSnapshot();
  const activeAlerts = data.alerts.filter((alert) => alert.status !== 'resolved');
  const resolved = data.alerts.filter((alert) => alert.status === 'resolved').length;
  const energy = data.readings.reduce((sum, reading) => sum + reading.energyKwh, 0);
  const water = data.readings.reduce((sum, reading) => sum + reading.waterLitres, 0);
  const analyzed = new Set(data.analyses.map((analysis) => analysis.facilityId)).size;
  const issueCategories = ['energy', 'water', 'waste', 'occupancy', 'resource_utilization'].map((category) => ({ category, count: data.analyses.flatMap((analysis) => analysis.issues).filter((issue) => issue.category === category).length + data.alerts.filter((alert) => alert.category === category).length }));
  const severity = ['low', 'medium', 'high', 'critical'].map((level) => ({ severity: level, count: data.alerts.filter((alert) => alert.severity === level).length }));
  const facilityConsumption = data.facilities.map((facility) => ({ name: facility.shortName, energy: Number(data.readings.filter((reading) => reading.facilityId === facility.id).reduce((sum, reading) => sum + reading.energyKwh, 0).toFixed(1)), water: Number(data.readings.filter((reading) => reading.facilityId === facility.id).reduce((sum, reading) => sum + reading.waterLitres, 0).toFixed(1)) }));
  const trend = Array.from({ length: 6 }, (_, index) => { const day = new Date(Date.now() - (5 - index) * 24 * 60 * 60 * 1000); const readings = data.readings.filter((reading) => new Date(reading.recordedAt).toDateString() === day.toDateString()); return { day: day.toLocaleDateString('en-IN', { weekday: 'short' }), energy: Number(readings.reduce((sum, reading) => sum + reading.energyKwh, 0).toFixed(1)), water: Number(readings.reduce((sum, reading) => sum + reading.waterLitres, 0).toFixed(1)) }; });
  return ok({ kpis: { totalFacilities: data.facilities.length, analyzedFacilities: analyzed, activeAlerts: activeAlerts.length, energyKwh: Number(energy.toFixed(1)), waterLitres: Number(water.toFixed(1)), resolvedIssues: resolved }, trend, facilityConsumption, issueCategories, severity, recentAnalyses: data.analyses.slice(0, 5), recentAlerts: activeAlerts.slice(0, 6), recommendations: data.recommendations.slice(0, 6), dataMode: process.env.DATABASE_URL ? 'MANAGED DATABASE' : 'LOCAL DEMO STORE', gemini: getGeminiConfigStatus() });
}
