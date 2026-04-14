// ============================================
// CARGOBIT MATCHING API TYPES
// Enterprise Matching System
// ============================================

// ============================================
// COMMON TYPES
// ============================================

export interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// ============================================
// MATCHING TRIGGER TYPES
// ============================================

export type MatchingPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface StartMatchingRequest {
  transportId: string;
  priority?: MatchingPriority;
  autoAssign?: boolean;
  maxCandidates?: number;
  expireInMinutes?: number;
}

export interface StartMatchingResponse {
  matchingId: string;
  status: 'started' | 'queued' | 'no_candidates';
  estimatedCandidates?: number;
  estimatedCompletion?: string;
}

export interface UpdateMatchingRequest {
  transportId: string;
  event: 'new_driver_available' | 'driver_location_changed' | 'requirements_updated' | 'price_changed';
  data?: Record<string, unknown>;
}

export interface UpdateMatchingResponse {
  matchingId: string;
  status: 'updated' | 'recalculating' | 'completed';
}

export interface StopMatchingRequest {
  transportId: string;
  reason?: string;
}

export interface StopMatchingResponse {
  matchingId: string;
  status: 'stopped';
  stoppedAt: string;
}

// ============================================
// MATCHING ENGINE TYPES
// ============================================

export interface FilterCandidatesRequest {
  transportId: string;
  requirements: {
    vehicle?: VehicleFilterRequirements;
    driver?: DriverFilterRequirements;
    international?: InternationalFilterRequirements;
  };
  location?: {
    pickupRadius?: number; // km
    pickupCountry?: string;
  };
  timeWindow?: {
    availableFrom?: string;
    availableTo?: string;
  };
}

export interface VehicleFilterRequirements {
  vehicleTypes?: string[];
  minPayload_kg?: number;
  minVolume_m3?: number;
  minLength_m?: number;
  minHeight_m?: number;
  adrRequired?: boolean;
  adrClasses?: string[];
  coolingRequired?: boolean;
  temperatureRange?: { min: number; max: number };
  craneRequired?: boolean;
  liftRequired?: boolean;
}

export interface DriverFilterRequirements {
  adrLicenseRequired?: boolean;
  adrClasses?: string[];
  languages?: string[];
  minRating?: number;
  minCompletedTransports?: number;
  maxDamageCount?: number;
  internationalExperience?: boolean;
  driverLicenseClass?: string[];
}

export interface InternationalFilterRequirements {
  targetCountries?: string[];
  transitCountries?: string[];
  tunnelCodesAllowed?: string[];
  customsDocumentsRequired?: string[];
}

export interface Candidate {
  driverId: string;
  vehicleId: string;
  score: number;
  distance?: number;
  matchReasons: string[];
  warnings?: string[];
}

export interface FilterCandidatesResponse {
  transportId: string;
  candidates: Candidate[];
  totalFound: number;
  filterStats: {
    vehicleTypeMatch: number;
    locationMatch: number;
    requirementMatch: number;
    internationalMatch: number;
  };
}

// ============================================
// EVALUATION TYPES
// ============================================

export interface EvaluateCandidateRequest {
  transportId: string;
  candidateId: string;
  vehicleId?: string;
}

export interface RuleCheckResult {
  ruleName: string;
  passed: boolean;
  score: number;
  message?: string;
}

export interface EvaluateCandidateResponse {
  candidateId: string;
  vehicleId?: string;
  rulesPassed: boolean;
  failedRules: string[];
  ruleResults: RuleCheckResult[];
  totalScore: number;
  warnings: string[];
}

// ============================================
// RANKING TYPES
// ============================================

export interface RankCandidatesRequest {
  transportId: string;
  candidates: Array<{
    driverId: string;
    vehicleId: string;
    baseScore?: number;
  }>;
  rankingWeights?: RankingWeights;
}

export interface RankingWeights {
  distance?: number;      // 0-1, default 0.2
  reputation?: number;    // 0-1, default 0.2
  price?: number;         // 0-1, default 0.15
  experience?: number;    // 0-1, default 0.15
  language?: number;      // 0-1, default 0.1
  returnLoad?: number;    // 0-1, default 0.1
  history?: number;       // 0-1, default 0.1
}

export interface RankedCandidate {
  driverId: string;
  vehicleId: string;
  score: number;
  rank: number;
  scoreBreakdown: {
    distanceScore: number;
    reputationScore: number;
    priceScore: number;
    experienceScore: number;
    languageScore: number;
    returnLoadScore: number;
    historyScore: number;
  };
  matchReasons: string[];
  price?: number;
  estimatedArrival?: string;
}

export interface RankCandidatesResponse {
  transportId: string;
  rankedCandidates: RankedCandidate[];
  rankingMethod: string;
}

// ============================================
// INTERNATIONAL CHECK TYPES
// ============================================

export interface InternationalCheckRequest {
  transportId: string;
  driverId: string;
  vehicleId: string;
}

export interface BorderCheck {
  fromCountry: string;
  toCountry: string;
  crossingPoint?: string;
  allowed: boolean;
  issues: string[];
  adrAllowed: boolean;
  tunnelRestrictions?: string[];
}

export interface InternationalCheckResponse {
  allowed: boolean;
  issues: string[];
  borderChecks: BorderCheck[];
  documents: {
    required: string[];
    present: string[];
    missing: string[];
  };
  tollSystems: {
    country: string;
    system: string;
    estimated: number;
  }[];
  tunnelCodes: {
    required: string[];
    vehicle: string[];
    compatible: boolean;
  };
  riskLevel: 'low' | 'medium' | 'high';
}

// ============================================
// FRAUD CHECK TYPES
// ============================================

export interface FraudCheckRequest {
  driverId: string;
  transportId?: string;
  checkTypes?: FraudCheckType[];
}

export type FraudCheckType = 
  | 'kyc'
  | 'kyb'
  | 'iban_change'
  | 'gps_plausibility'
  | 'cancellation_rate'
  | 'damage_history'
  | 'fake_documents'
  | 'suspicious_activity'
  | 'all';

export interface FraudCheckResult {
  checkType: string;
  passed: boolean;
  riskScore: number;
  details?: string;
  flags?: string[];
}

export interface FraudCheckResponse {
  safe: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  checks: FraudCheckResult[];
  recommendations: string[];
  blockedReasons: string[];
}

// ============================================
// MATCHING RESULTS TYPES
// ============================================

export interface MatchingResultsResponse {
  transportId: string;
  matchingId: string;
  status: 'in_progress' | 'completed' | 'stopped' | 'no_candidates';
  candidates: RankedCandidate[];
  bestMatch?: RankedCandidate;
  totalCandidates: number;
  matchingDuration?: number;
  startedAt: string;
  completedAt?: string;
}

// ============================================
// AUTO ASSIGN TYPES
// ============================================

export interface AutoAssignRequest {
  transportId: string;
  driverId: string;
  vehicleId?: string;
  skipFraudCheck?: boolean;
}

export interface AutoAssignResponse {
  transportId: string;
  driverId: string;
  vehicleId?: string;
  status: 'assigned' | 'pending_verification' | 'rejected';
  escrowCreated?: boolean;
  escrowAmount?: number;
  rejectionReason?: string;
}

// ============================================
// MONITORING TYPES
// ============================================

export interface MatchingLog {
  id: string;
  matchingId: string;
  transportId: string;
  event: string;
  timestamp: string;
  duration?: number;
  candidatesFound?: number;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface MatchingLogsResponse {
  transportId: string;
  logs: MatchingLog[];
  total: number;
}

export interface MatchingMetrics {
  period: string;
  totalMatchings: number;
  successfulMatchings: number;
  avgMatchingTime: number;
  avgCandidatesPerMatching: number;
  avgMatchScore: number;
  fraudBlocks: number;
  internationalRejections: number;
  autoAssignments: number;
  autoAssignmentSuccessRate: number;
  topRejectionReasons: Array<{
    reason: string;
    count: number;
  }>;
}

// ============================================
// MATCHING SESSION MODEL
// ============================================

export interface MatchingSession {
  id: string;
  transportId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'stopped' | 'failed';
  priority: MatchingPriority;
  autoAssign: boolean;
  startedAt: string;
  completedAt?: string;
  candidatesFound: number;
  bestScore?: number;
  assignedDriverId?: string;
  error?: string;
}

// ============================================
// EXPORT ALL TYPES
// ============================================

export type {
  ApiErrorResponse,
  MatchingPriority,
  StartMatchingRequest,
  StartMatchingResponse,
  UpdateMatchingRequest,
  UpdateMatchingResponse,
  StopMatchingRequest,
  StopMatchingResponse,
  FilterCandidatesRequest,
  VehicleFilterRequirements,
  DriverFilterRequirements,
  InternationalFilterRequirements,
  Candidate,
  FilterCandidatesResponse,
  EvaluateCandidateRequest,
  RuleCheckResult,
  EvaluateCandidateResponse,
  RankCandidatesRequest,
  RankingWeights,
  RankedCandidate,
  RankCandidatesResponse,
  InternationalCheckRequest,
  BorderCheck,
  InternationalCheckResponse,
  FraudCheckRequest,
  FraudCheckType,
  FraudCheckResult,
  FraudCheckResponse,
  MatchingResultsResponse,
  AutoAssignRequest,
  AutoAssignResponse,
  MatchingLog,
  MatchingLogsResponse,
  MatchingMetrics,
  MatchingSession
};
