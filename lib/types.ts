export type FacilityStatus = 'normal' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'in_progress' | 'resolved';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceSource = 'ai_image_analysis' | 'simulated_sensor' | 'real_sensor' | 'operator';

export interface Facility {
  id: string;
  name: string;
  shortName: string;
  type: string;
  building: string;
  room: string;
  description: string;
  position: [number, number, number];
  size: [number, number, number];
  accent: string;
  status: FacilityStatus;
  statusLabel: string;
  statusReason: string;
  thresholds: { energyKwh: number; waterLitres: number };
  demoData: boolean;
}

export interface SensorReading {
  id: string;
  facilityId: string;
  recordedAt: string;
  energyKwh: number;
  waterLitres: number;
  occupancy: number | null;
  temperatureC: number | null;
  source: 'simulated' | 'real';
}

export interface AnalysisIssue {
  category: 'occupancy' | 'energy' | 'water' | 'waste' | 'resource_utilization' | 'no_confirmed_issue';
  title: string;
  evidence: string;
  severity: Severity;
  confidence: number | null;
  recommendedAction: string;
}

export interface ImageAnalysis {
  id: string;
  facilityId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  imageDataUrl: string;
  analyzedAt: string;
  status: 'completed' | 'failed';
  summary: string;
  limitations: string[];
  issues: AnalysisIssue[];
  model: string;
  source: 'gemini';
}

export interface SustainabilityAlert {
  id: string;
  facilityId: string;
  category: string;
  severity: Severity;
  description: string;
  evidenceSource: EvidenceSource;
  createdAt: string;
  recommendedAction: string;
  status: AlertStatus;
  analysisId?: string;
}

export interface Recommendation {
  id: string;
  facilityId: string;
  analysisId?: string;
  createdAt: string;
  title: string;
  detail: string;
  priority: Severity;
  source: 'ai' | 'rule';
}

export interface SustainabilityReport {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  source: 'ai' | 'fallback';
}

export interface StoreData {
  facilities: Facility[];
  readings: SensorReading[];
  analyses: ImageAnalysis[];
  alerts: SustainabilityAlert[];
  recommendations: Recommendation[];
  reports: SustainabilityReport[];
}

export interface FacilitySnapshot extends Facility {
  readings: SensorReading[];
  analyses: ImageAnalysis[];
  alerts: SustainabilityAlert[];
  recommendations: Recommendation[];
}
