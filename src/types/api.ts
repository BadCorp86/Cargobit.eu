/**
 * CargoBit API Types
 * Shared types for frontend and backend integration
 */

// ============================================
// Insurance Types
// ============================================

export interface InsuranceQuoteRequest {
  orderId: string;
  value: number;
  origin: string;
  destination: string;
  weight?: number;
}

export interface InsuranceQuoteResponse {
  premium: number;
  currency: string;
  coverage: number;
  provider: string;
  quoteId: string;
  validUntil: string;
  riskFactors: Array<{
    factor: string;
    multiplier: number;
  }>;
  tiers: InsuranceTier[];
}

export interface InsuranceTier {
  name: 'Basis' | 'Standard' | 'Premium';
  premium: number;
  coverage: number;
  features: string[];
  recommended?: boolean;
}

export interface InsurancePolicyRequest {
  quoteId: string;
  orderId: string;
  customerId: string;
  tier: 'basis' | 'standard' | 'premium';
}

export interface InsurancePolicyResponse {
  policyId: string;
  quoteId: string;
  orderId: string;
  customerId: string;
  provider: string;
  premium: number;
  commission: number;
  coverage: number;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  tier: string;
  createdAt: string;
  validFrom: string;
  validUntil: string;
  pdfUrl: string;
  policyNumber: string;
}

export interface InsurancePoliciesListResponse {
  policies: InsurancePolicyResponse[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================
// Ad Types
// ============================================

export interface AdSlot {
  slot: string;
  name: string;
  size: string;
  description: string;
  position: string;
  formats: string[];
  maxFileSize: number;
  eCPM: number;
  fillRate: number;
  dailyImpressions: number;
}

export interface AdSlotsResponse {
  slots: AdSlot[];
  total: number;
}

export interface AdRenderRequest {
  slot: string;
  userId?: string;
  riskLevel?: 'green' | 'yellow' | 'red';
  origin?: string;
  destination?: string;
}

export interface AdRenderResponse {
  adId: string;
  imageUrl: string;
  targetUrl: string;
  impressionId: string;
  provider: string;
  alt: string;
}

export interface AdImpressionRequest {
  impressionId: string;
  timestamp?: number;
  viewable?: boolean;
  viewDuration?: number;
}

export interface AdClickRequest {
  impressionId: string;
  adId: string;
  timestamp?: number;
  clickPosition?: { x: number; y: number };
}

export interface AdCampaignRequest {
  name: string;
  slot: string;
  budget: number;
  cpc?: number;
  cpm?: number;
  imageUrl: string;
  targetUrl: string;
  startDate?: string;
  endDate?: string;
  targeting?: {
    riskLevels?: string[];
    routes?: string[];
    countries?: string[];
  };
}

export interface AdCampaignResponse {
  campaignId: string;
  name: string;
  slot: string;
  budget: number;
  cpc: number | null;
  cpm: number | null;
  imageUrl: string;
  targetUrl: string;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'completed';
  createdAt: string;
  startDate: string;
  endDate: string;
  targeting: Record<string, unknown>;
  stats: {
    impressions: number;
    clicks: number;
    ctr: number;
    spend: number;
    remaining: number;
  };
  reviewStatus: string;
  estimatedDailyImpressions: number;
}

// ============================================
// Commission Types
// ============================================

export interface Commission {
  id: string;
  type: 'insurance' | 'ads' | 'transport' | 'wallet';
  referenceId: string;
  referenceType: string;
  partnerId: string;
  partnerType: 'user' | 'company';
  amountEur: number;
  ratePercent: number;
  baseAmountEur: number;
  periodMonth: string;
  status: 'accrued' | 'invoiced' | 'paid' | 'cancelled';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Risk Types
// ============================================

export type RiskLevel = 'green' | 'yellow' | 'red';

export interface RiskScore {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  weight: number;
  passed: boolean;
  value?: string | number;
}

// ============================================
// Transport Types
// ============================================

export interface Transport {
  id: string;
  shipperId: string;
  carrierId?: string;
  status: TransportStatus;
  origin: Address;
  destination: Address;
  pickupDate: string;
  deliveryDate?: string;
  valueEur: number;
  weightKg?: number;
  riskLevel: RiskLevel;
  cargoType: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export type TransportStatus =
  | 'draft'
  | 'open'
  | 'matched'
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

// ============================================
// API Error Types
// ============================================

export interface ApiError {
  error: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
