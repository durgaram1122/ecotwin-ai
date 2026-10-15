import type { Facility, SensorReading, StoreData } from './types';

export const seedFacilities: Facility[] = [
  {
    id: 'academic-a', name: 'Academic Block A', shortName: 'Classrooms', type: 'Academic / Classrooms', building: 'A Block', room: 'A-101 → A-306',
    description: 'Three-storey teaching block with daylight-facing classrooms, active corridors and a shared faculty wing.',
    position: [-8, 0, -1], size: [7.4, 4.6, 5.5], accent: '#55e6a5', status: 'normal', statusLabel: 'Healthy', statusReason: 'No open sustainability alerts', thresholds: { energyKwh: 58, waterLitres: 210 }, demoData: true
  },
  {
    id: 'computer-lab', name: 'Innovation Computer Lab', shortName: 'Computer Lab', type: 'Computer Laboratory', building: 'Tech Hub', room: 'T-204',
    description: 'High-density computer lab with visible workstation loads and a dedicated cooling zone.',
    position: [1.8, 0, -1.2], size: [6.4, 4.1, 5], accent: '#54d7f2', status: 'warning', statusLabel: 'Watch', statusReason: 'Simulated energy reading is near threshold', thresholds: { energyKwh: 42, waterLitres: 140 }, demoData: true
  },
  {
    id: 'library', name: 'Knowledge Commons Library', shortName: 'Library', type: 'Library', building: 'Library', room: 'L-001',
    description: 'Quiet library with north-light reading hall, media stacks and a central indoor planting spine.',
    position: [9.5, 0, -0.7], size: [6.1, 3.8, 4.7], accent: '#8e9cff', status: 'normal', statusLabel: 'Healthy', statusReason: 'No open sustainability alerts', thresholds: { energyKwh: 47, waterLitres: 120 }, demoData: true
  },
  {
    id: 'washrooms', name: 'North Washroom Core', shortName: 'Washrooms', type: 'Washrooms', building: 'Student Services', room: 'G-012 / G-013',
    description: 'Accessible washroom core beside the student commons; water readings are simulation-only until meters are connected.',
    position: [-1.4, 0, 6.4], size: [4.4, 2.8, 3.2], accent: '#f2bb63', status: 'normal', statusLabel: 'Healthy', statusReason: 'No open sustainability alerts', thresholds: { energyKwh: 16, waterLitres: 95 }, demoData: true
  },
  {
    id: 'corridor-east', name: 'East Connector Corridor', shortName: 'Corridor', type: 'College Corridor', building: 'Central Spine', room: 'C-01',
    description: 'Covered connector linking the academic block, canteen and library with a long visual axis to the courtyard.',
    position: [3.1, 0, 4.2], size: [8.2, 2.6, 2.2], accent: '#d4b483', status: 'normal', statusLabel: 'Healthy', statusReason: 'No open sustainability alerts', thresholds: { energyKwh: 22, waterLitres: 60 }, demoData: true
  },
  {
    id: 'canteen', name: 'Saffron Courtyard Canteen', shortName: 'Canteen', type: 'Canteen', building: 'Commons Pavilion', room: 'C-101',
    description: 'Open-sided canteen pavilion with shaded seating, food service counter and waste-sorting point.',
    position: [-8.2, 0, 6], size: [5.8, 3.2, 4.5], accent: '#ff9f6e', status: 'warning', statusLabel: 'Watch', statusReason: 'Simulated water demand is elevated', thresholds: { energyKwh: 33, waterLitres: 175 }, demoData: true
  },
  {
    id: 'green-courtyard', name: 'Central Learning Courtyard', shortName: 'Courtyard', type: 'Green Campus Area', building: 'Open Space', room: 'C-00',
    description: 'Biodiverse courtyard with shaded benches, rain garden and a small outdoor classroom.',
    position: [0, 0, -8], size: [7.2, 0.6, 5.2], accent: '#72d68b', status: 'normal', statusLabel: 'Healthy', statusReason: 'No open sustainability alerts', thresholds: { energyKwh: 8, waterLitres: 75 }, demoData: true
  },
  {
    id: 'parking', name: 'Solar Mobility Court', shortName: 'Mobility', type: 'Roads & Parking', building: 'South Edge', room: 'P-01',
    description: 'Permeable parking court with canopy solar panels and EV-ready bays.',
    position: [8.5, 0, 6.1], size: [6.5, 0.7, 4.2], accent: '#a1b4c7', status: 'normal', statusLabel: 'Healthy', statusReason: 'No open sustainability alerts', thresholds: { energyKwh: 14, waterLitres: 30 }, demoData: true
  }
];

export function seedReadings(): SensorReading[] {
  const now = Date.now();
  return seedFacilities.flatMap((facility, facilityIndex) => Array.from({ length: 6 }, (_, index) => {
    const offset = (5 - index) * 24 * 60 * 60 * 1000;
    const phase = facilityIndex * 0.7 + index * 0.55;
    return {
      id: `reading-seed-${facility.id}-${index}`,
      facilityId: facility.id,
      recordedAt: new Date(now - offset).toISOString(),
      energyKwh: Number((facility.thresholds.energyKwh * (0.67 + Math.sin(phase) * 0.12)).toFixed(1)),
      waterLitres: Number((facility.thresholds.waterLitres * (0.68 + Math.cos(phase) * 0.11)).toFixed(1)),
      occupancy: facility.type.includes('Class') || facility.type.includes('Laboratory') ? Math.round(18 + Math.abs(Math.sin(phase)) * 38) : null,
      temperatureC: Number((24 + Math.cos(phase) * 1.8).toFixed(1)),
      source: 'simulated' as const
    };
  }));
}

export function createSeedStore(): StoreData {
  return {
    facilities: structuredClone(seedFacilities),
    readings: seedReadings(),
    analyses: [],
    alerts: [],
    recommendations: [],
    reports: []
  };
}
