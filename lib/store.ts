import fs from 'node:fs/promises';
import path from 'node:path';
import { createPool, type Pool } from 'mysql2/promise';
import { createSeedStore, seedFacilities, seedReadings } from './seed';
import type { AlertStatus, Facility, FacilitySnapshot, ImageAnalysis, Recommendation, StoreData, SustainabilityAlert, SustainabilityReport, SensorReading } from './types';

const localPath = path.join(process.cwd(), 'data', 'ecotwin.json');
let pool: Pool | null = null;
let mysqlReady: Promise<void> | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = createPool(process.env.DATABASE_URL);
  return pool;
}

async function ensureLocal() {
  try { return JSON.parse(await fs.readFile(localPath, 'utf8')) as StoreData; } catch {
    const seed = createSeedStore();
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, JSON.stringify(seed, null, 2));
    return seed;
  }
}

async function saveLocal(data: StoreData) {
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, JSON.stringify(data, null, 2));
}

async function ensureMysql() {
  const db = getPool();
  if (!db) return;
  if (!mysqlReady) mysqlReady = (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS facilities (id VARCHAR(64) PRIMARY KEY, name VARCHAR(160) NOT NULL, short_name VARCHAR(100) NOT NULL, type VARCHAR(100) NOT NULL, building VARCHAR(100) NOT NULL, room VARCHAR(100) NOT NULL, description TEXT NOT NULL, position_json TEXT NOT NULL, size_json TEXT NOT NULL, accent VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, status_label VARCHAR(40) NOT NULL, status_reason VARCHAR(255) NOT NULL, energy_threshold DECIMAL(10,2) NOT NULL, water_threshold DECIMAL(10,2) NOT NULL, demo_data BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await db.query(`CREATE TABLE IF NOT EXISTS uploaded_images (id VARCHAR(64) PRIMARY KEY, facility_id VARCHAR(64) NOT NULL, file_name VARCHAR(255) NOT NULL, mime_type VARCHAR(80) NOT NULL, file_size INT NOT NULL, image_data LONGTEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_uploaded_facility (facility_id), CONSTRAINT fk_uploaded_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS image_analyses (id VARCHAR(64) PRIMARY KEY, facility_id VARCHAR(64) NOT NULL, uploaded_image_id VARCHAR(64) NOT NULL, status VARCHAR(20) NOT NULL, summary TEXT NOT NULL, limitations_json TEXT NOT NULL, issues_json LONGTEXT NOT NULL, model VARCHAR(120) NOT NULL, analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_analysis_facility (facility_id), CONSTRAINT fk_analysis_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS sensor_readings (id VARCHAR(64) PRIMARY KEY, facility_id VARCHAR(64) NOT NULL, recorded_at TIMESTAMP NOT NULL, energy_kwh DECIMAL(10,2) NOT NULL, water_litres DECIMAL(10,2) NOT NULL, occupancy INT NULL, temperature_c DECIMAL(5,2) NULL, source VARCHAR(20) NOT NULL, INDEX idx_sensor_facility_time (facility_id, recorded_at), CONSTRAINT fk_sensor_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS sustainability_alerts (id VARCHAR(64) PRIMARY KEY, facility_id VARCHAR(64) NOT NULL, category VARCHAR(80) NOT NULL, severity VARCHAR(20) NOT NULL, description TEXT NOT NULL, evidence_source VARCHAR(40) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, recommended_action TEXT NOT NULL, status VARCHAR(20) NOT NULL, analysis_id VARCHAR(64) NULL, INDEX idx_alert_facility_status (facility_id, status), CONSTRAINT fk_alert_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS recommendations (id VARCHAR(64) PRIMARY KEY, facility_id VARCHAR(64) NOT NULL, analysis_id VARCHAR(64) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, title VARCHAR(180) NOT NULL, detail TEXT NOT NULL, priority VARCHAR(20) NOT NULL, source VARCHAR(20) NOT NULL, CONSTRAINT fk_rec_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE)`);
    await db.query(`CREATE TABLE IF NOT EXISTS sustainability_reports (id VARCHAR(64) PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, title VARCHAR(180) NOT NULL, body LONGTEXT NOT NULL, source VARCHAR(20) NOT NULL)`);
    const [countRows] = await db.query('SELECT COUNT(*) AS count FROM facilities');
    if (Number((countRows as Array<{ count: number }>)[0]?.count ?? 0) === 0) {
      for (const facility of seedFacilities) await db.query('INSERT INTO facilities (id,name,short_name,type,building,room,description,position_json,size_json,accent,status,status_label,status_reason,energy_threshold,water_threshold,demo_data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [facility.id, facility.name, facility.shortName, facility.type, facility.building, facility.room, facility.description, JSON.stringify(facility.position), JSON.stringify(facility.size), facility.accent, facility.status, facility.statusLabel, facility.statusReason, facility.thresholds.energyKwh, facility.thresholds.waterLitres, facility.demoData]);
    }
    const [readingCountRows] = await db.query('SELECT COUNT(*) AS count FROM sensor_readings');
    if (Number((readingCountRows as Array<{ count: number }>)[0]?.count ?? 0) === 0) {
      for (const reading of seedReadings()) await db.query('INSERT INTO sensor_readings (id,facility_id,recorded_at,energy_kwh,water_litres,occupancy,temperature_c,source) VALUES (?,?,?,?,?,?,?,?)', [reading.id, reading.facilityId, reading.recordedAt, reading.energyKwh, reading.waterLitres, reading.occupancy, reading.temperatureC, reading.source]);
    }
  })();
  await mysqlReady;
}

function mapFacility(row: Record<string, unknown>): Facility {
  return { id: String(row.id), name: String(row.name), shortName: String(row.short_name), type: String(row.type), building: String(row.building), room: String(row.room), description: String(row.description), position: JSON.parse(String(row.position_json)) as [number, number, number], size: JSON.parse(String(row.size_json)) as [number, number, number], accent: String(row.accent), status: row.status as Facility['status'], statusLabel: String(row.status_label), statusReason: String(row.status_reason), thresholds: { energyKwh: Number(row.energy_threshold), waterLitres: Number(row.water_threshold) }, demoData: Boolean(row.demo_data) };
}

export async function getSnapshot(): Promise<StoreData> {
  const db = getPool();
  if (!db) return ensureLocal();
  await ensureMysql();
  const [facilityRows, readingRows, analysisRows, alertRows, recommendationRows, reportRows] = await Promise.all([
    db.query('SELECT * FROM facilities ORDER BY name'), db.query('SELECT * FROM sensor_readings ORDER BY recorded_at DESC'), db.query('SELECT ia.*, ui.file_name, ui.mime_type, ui.file_size, ui.image_data FROM image_analyses ia LEFT JOIN uploaded_images ui ON ui.id = ia.uploaded_image_id ORDER BY ia.analyzed_at DESC'), db.query('SELECT * FROM sustainability_alerts ORDER BY created_at DESC'), db.query('SELECT * FROM recommendations ORDER BY created_at DESC'), db.query('SELECT * FROM sustainability_reports ORDER BY created_at DESC')
  ]);
  return {
    facilities: (facilityRows[0] as Record<string, unknown>[]).map(mapFacility),
    readings: (readingRows[0] as Record<string, unknown>[]).map((r) => ({ id: String(r.id), facilityId: String(r.facility_id), recordedAt: new Date(String(r.recorded_at)).toISOString(), energyKwh: Number(r.energy_kwh), waterLitres: Number(r.water_litres), occupancy: r.occupancy == null ? null : Number(r.occupancy), temperatureC: r.temperature_c == null ? null : Number(r.temperature_c), source: r.source as 'simulated' | 'real' })),
    analyses: (analysisRows[0] as Record<string, unknown>[]).map((r) => ({ id: String(r.id), facilityId: String(r.facility_id), fileName: String(r.file_name ?? 'uploaded-image'), mimeType: String(r.mime_type ?? 'image/jpeg'), fileSize: Number(r.file_size ?? 0), imageDataUrl: String(r.image_data ?? ''), analyzedAt: new Date(String(r.analyzed_at)).toISOString(), status: r.status as ImageAnalysis['status'], summary: String(r.summary), limitations: JSON.parse(String(r.limitations_json)) as string[], issues: JSON.parse(String(r.issues_json)) as ImageAnalysis['issues'], model: String(r.model), source: 'gemini' })),
    alerts: (alertRows[0] as Record<string, unknown>[]).map((r) => ({ id: String(r.id), facilityId: String(r.facility_id), category: String(r.category), severity: r.severity as SustainabilityAlert['severity'], description: String(r.description), evidenceSource: r.evidence_source as SustainabilityAlert['evidenceSource'], createdAt: new Date(String(r.created_at)).toISOString(), recommendedAction: String(r.recommended_action), status: r.status as SustainabilityAlert['status'], analysisId: r.analysis_id ? String(r.analysis_id) : undefined })),
    recommendations: (recommendationRows[0] as Record<string, unknown>[]).map((r) => ({ id: String(r.id), facilityId: String(r.facility_id), analysisId: r.analysis_id ? String(r.analysis_id) : undefined, createdAt: new Date(String(r.created_at)).toISOString(), title: String(r.title), detail: String(r.detail), priority: r.priority as Recommendation['priority'], source: r.source as Recommendation['source'] })),
    reports: (reportRows[0] as Record<string, unknown>[]).map((r) => ({ id: String(r.id), createdAt: new Date(String(r.created_at)).toISOString(), title: String(r.title), body: String(r.body), source: r.source as SustainabilityReport['source'] }))
  };
}

export async function getFacilitySnapshot(facilityId: string): Promise<FacilitySnapshot | null> {
  const data = await getSnapshot();
  const facility = data.facilities.find((item) => item.id === facilityId);
  if (!facility) return null;
  return { ...facility, readings: data.readings.filter((item) => item.facilityId === facilityId), analyses: data.analyses.filter((item) => item.facilityId === facilityId), alerts: data.alerts.filter((item) => item.facilityId === facilityId), recommendations: data.recommendations.filter((item) => item.facilityId === facilityId) };
}

export async function mutateStore(mutator: (data: StoreData) => void) {
  const db = getPool();
  if (db) throw new Error('Use a typed database mutation for managed persistence');
  const data = await ensureLocal();
  mutator(data);
  await saveLocal(data);
  return data;
}

export async function persistAnalysis(analysis: ImageAnalysis, recommendation: Recommendation, alerts: SustainabilityAlert[]) {
  const db = getPool();
  if (!db) { await mutateStore((data) => { data.analyses.unshift(analysis); data.recommendations.unshift(recommendation); data.alerts.unshift(...alerts); updateStatuses(data); }); return; }
  await ensureMysql();
  const imageId = `image-${analysis.id}`;
  await db.query('INSERT INTO uploaded_images (id,facility_id,file_name,mime_type,file_size,image_data) VALUES (?,?,?,?,?,?)', [imageId, analysis.facilityId, analysis.fileName, analysis.mimeType, analysis.fileSize, analysis.imageDataUrl]);
  await db.query('INSERT INTO image_analyses (id,facility_id,uploaded_image_id,status,summary,limitations_json,issues_json,model) VALUES (?,?,?,?,?,?,?,?)', [analysis.id, analysis.facilityId, imageId, analysis.status, analysis.summary, JSON.stringify(analysis.limitations), JSON.stringify(analysis.issues), analysis.model]);
  await db.query('INSERT INTO recommendations (id,facility_id,analysis_id,title,detail,priority,source) VALUES (?,?,?,?,?,?,?)', [recommendation.id, recommendation.facilityId, recommendation.analysisId ?? null, recommendation.title, recommendation.detail, recommendation.priority, recommendation.source]);
  for (const alert of alerts) await insertAlert(alert);
}

export async function insertAlert(alert: SustainabilityAlert) {
  const db = getPool();
  if (!db) { await mutateStore((data) => { data.alerts.unshift(alert); updateStatuses(data); }); return; }
  await ensureMysql();
  await db.query('INSERT INTO sustainability_alerts (id,facility_id,category,severity,description,evidence_source,recommended_action,status,analysis_id) VALUES (?,?,?,?,?,?,?,?,?)', [alert.id, alert.facilityId, alert.category, alert.severity, alert.description, alert.evidenceSource, alert.recommendedAction, alert.status, alert.analysisId ?? null]);
  await refreshFacilityStatus(alert.facilityId);
}

export async function updateAlertStatus(id: string, status: AlertStatus) {
  const db = getPool();
  if (!db) { await mutateStore((data) => { const alert = data.alerts.find((item) => item.id === id); if (alert) alert.status = status; updateStatuses(data); }); return; }
  await ensureMysql();
  await db.query('UPDATE sustainability_alerts SET status=? WHERE id=?', [status, id]);
  const [rows] = await db.query('SELECT facility_id FROM sustainability_alerts WHERE id=?', [id]);
  const facilityId = String((rows as Array<{ facility_id: string }>)[0]?.facility_id ?? '');
  if (facilityId) await refreshFacilityStatus(facilityId);
}

export async function addReading(reading: SensorReading, thresholdAlert?: SustainabilityAlert) {
  const db = getPool();
  if (!db) { await mutateStore((data) => { data.readings.unshift(reading); if (thresholdAlert) data.alerts.unshift(thresholdAlert); updateStatuses(data); }); return; }
  await ensureMysql();
  await db.query('INSERT INTO sensor_readings (id,facility_id,recorded_at,energy_kwh,water_litres,occupancy,temperature_c,source) VALUES (?,?,?,?,?,?,?,?)', [reading.id, reading.facilityId, reading.recordedAt, reading.energyKwh, reading.waterLitres, reading.occupancy, reading.temperatureC, reading.source]);
  if (thresholdAlert) await insertAlert(thresholdAlert);
}

async function refreshFacilityStatus(facilityId: string) {
  const db = getPool(); if (!db) return;
  const [rows] = await db.query('SELECT severity FROM sustainability_alerts WHERE facility_id=? AND status <> "resolved" ORDER BY FIELD(severity,"critical","high","medium","low") LIMIT 1', [facilityId]);
  const severity = (rows as Array<{ severity: string }>)[0]?.severity;
  const status = severity === 'critical' || severity === 'high' ? 'critical' : severity ? 'warning' : 'normal';
  await db.query('UPDATE facilities SET status=?,status_label=?,status_reason=? WHERE id=?', [status, status === 'normal' ? 'Healthy' : status === 'critical' ? 'Critical' : 'Watch', severity ? `Open ${severity} alert` : 'No open sustainability alerts', facilityId]);
}

function updateStatuses(data: StoreData) {
  for (const facility of data.facilities) {
    const open = data.alerts.filter((alert) => alert.facilityId === facility.id && alert.status !== 'resolved');
    const severity = open.some((alert) => alert.severity === 'critical' || alert.severity === 'high') ? 'critical' : open.length ? 'warning' : 'normal';
    facility.status = severity; facility.statusLabel = severity === 'normal' ? 'Healthy' : severity === 'critical' ? 'Critical' : 'Watch'; facility.statusReason = open.length ? `${open.length} open sustainability alert${open.length > 1 ? 's' : ''}` : 'No open sustainability alerts';
  }
}

export function hasManagedDatabase() { return Boolean(process.env.DATABASE_URL); }
