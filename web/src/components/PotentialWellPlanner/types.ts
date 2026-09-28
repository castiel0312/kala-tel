export type WellType = "Development" | "Appraisal" | "Exploration" | "Infill";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface OffsetWellAnalogue {
  wellId: string;
  wellName: string;
  distanceKm: number;
  bearing: string;
  formationMatchPct: number;
  trajectorySimilarityPct: number;
  eventSimilarityPct: number;
  overallScorePct: number;
  recordedEventsCount: number;
  keyHazardsRecorded: string[];
  actualTd: number;
  operator: string;
  spudDate: string;
}

export interface FormationHazard {
  formation: string;
  topMd: number;
  baseMd: number;
  lithology: string;
  mudLossProb: number;
  stuckPipeProb: number;
  kickProb: number;
  overpressureProb: number;
  riskRating: RiskLevel;
  recMudWeightSG: string;
  historicalIncidents: string;
}

export interface PlanningScenario {
  id: string;
  name: string;
  label: string;
  kopMd: number;
  targetInclinationDeg: number;
  azimuthDeg: number;
  mudWeightSG: number;
  estDrillingDays: number;
  estNptDays: number;
  avgRopMhr: number;
  mudLossRiskPct: number;
  stuckPipeRiskPct: number;
  kickRiskPct: number;
  overallRisk: RiskLevel;
  description: string;
  keyMitigations: string[];
}

export interface DrillingStepRecommendation {
  interval: string;
  depthRange: string;
  formation: string;
  operationalGuideline: string;
  mudWeightAndRheology: string;
  bhaAndBitType: string;
  hydraulicsAndRpm: string;
  hazardPrecaution: string;
}

export interface KeyRiskZone {
  depthRange: string;
  formation: string;
  primaryRisk: string;
  probabilityPct: number;
  severity: RiskLevel;
  nearbyEvidence: string;
  offsetWellCorrelation: string;
}

export interface GeologicalJustification {
  targetStructure: string;
  structuralClosure: string;
  faultSealingIntegrity: string;
  reservoirQualityIndex: string;
  permeabilityPorosityEst: string;
  scientificRationale: string;
  expectedHydrocarbonType: string;
}

export interface PotentialWell {
  id: string;
  name: string;
  code: string;
  field: string;
  basin: string;
  targetFormation: string;
  wellType: WellType;
  targetTdMd: number;
  targetTvd: number;
  surfaceLat: number;
  surfaceLng: number;
  surfaceUtmX: number;
  surfaceUtmY: number;
  crs: string;
  searchRadiusKm: number;
  geologicalJustification: GeologicalJustification;
  offsetWells: OffsetWellAnalogue[];
  formationForecast: FormationHazard[];
  scenarios: PlanningScenario[];
  keyRiskZones: KeyRiskZone[];
  drillingRecommendations: {
    generalSummary: string;
    steps: DrillingStepRecommendation[];
    ecdTorqueMitigation: string;
    lcmPillStrategy: string;
    casingProgram: { section: string; holeSize: string; casingSize: string; shoeDepth: string }[];
  };
  aiRecommendationSummary: string;
}

export interface LandAreaPreset {
  id: string;
  name: string;
  basin: string;
  centerLat: number;
  centerLng: number;
  defaultRadiusKm: number;
  potentialWells: PotentialWell[];
  faultLines: { name: string; type: string; coords: { lat: number; lng: number }[] }[];
  highRiskZones: { name: string; riskType: string; centerLat: number; centerLng: number; radiusKm: number }[];
}
