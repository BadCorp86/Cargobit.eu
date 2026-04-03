import type { MembershipPlan, MembershipTier, AIPriceRecommendation, UserRole } from '@/types';

// ==========================================
// MEMBERSHIP PLANS
// ==========================================

const zeroCommissions: Record<UserRole, number> = {
  admin: 0,
  dispatcher: 0,
  driver: 0,
  shipper: 0,
  warehouse: 0,
  support: 0,
  finance: 0,
  customer: 0,
};

export const membershipPlans: MembershipPlan[] = [
  {
    id: 'plan-starter',
    tier: 'starter',
    name: 'Starter',
    nameEn: 'Starter',
    description: 'Perfekt für den Einstieg in die digitale Frachtbörse',
    descriptionEn: 'Perfect for getting started with digital freight exchange',
    priceMonthly: 29,
    priceYearly: 290,
    freeTrialMonths: 2,
    maxShipments: 50,
    features: [
      '50 Sendungen/Monat',
      'Basis-Analytik',
      'E-Mail-Support',
      'KI-Preisempfehlung',
      'Auktionsfunktion',
      'Sendungsverfolgung',
    ],
    featuresEn: [
      '50 Shipments/month',
      'Basic Analytics',
      'Email Support',
      'AI Price Recommendation',
      'Auction Feature',
      'Shipment Tracking',
    ],
    transportCommission: {
      admin: 0,
      dispatcher: 8,
      driver: 0,
      shipper: 6,
      warehouse: 0,
      support: 0,
      finance: 0,
      customer: 0,
    },
    walletFee: {
      admin: 0,
      dispatcher: 0,
      driver: 3,
      shipper: 0,
      warehouse: 0,
      support: 0,
      finance: 0,
      customer: 0,
    },
  },
  {
    id: 'plan-professional',
    tier: 'professional',
    name: 'Professional',
    nameEn: 'Professional',
    description: 'Für wachsende Transportunternehmen mit erweitertem Bedarf',
    descriptionEn: 'For growing transport companies with advanced needs',
    priceMonthly: 79,
    priceYearly: 790,
    freeTrialMonths: 2,
    maxShipments: 500,
    features: [
      '500 Sendungen/Monat',
      'Erweiterte Analytik + KI-Preisempfehlung',
      'Prioritäts-Support',
      'Auktionsfunktion',
      'API-Zugang',
      'Sendungsverfolgung',
      'Flottenmanagement',
      'Kapazitätsabgleich',
    ],
    featuresEn: [
      '500 Shipments/month',
      'Advanced Analytics + AI Pricing',
      'Priority Support',
      'Auction Feature',
      'API Access',
      'Shipment Tracking',
      'Fleet Management',
      'Capacity Matching',
    ],
    transportCommission: {
      admin: 0,
      dispatcher: 5,
      driver: 0,
      shipper: 4,
      warehouse: 0,
      support: 0,
      finance: 0,
      customer: 0,
    },
    walletFee: {
      admin: 0,
      dispatcher: 0,
      driver: 2,
      shipper: 0,
      warehouse: 0,
      support: 0,
      finance: 0,
      customer: 0,
    },
    popular: true,
  },
  {
    id: 'plan-enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    nameEn: 'Enterprise',
    description: 'Maximale Leistung für große Logistikunternehmen',
    descriptionEn: 'Maximum performance for large logistics companies',
    priceMonthly: 199,
    priceYearly: 1990,
    freeTrialMonths: 2,
    maxShipments: null, // unlimited
    features: [
      'Unbegrenzte Sendungen',
      'Vollständige Analytik + KI + API-Zugang',
      'Dedizierter Support',
      'Auktionsfunktion',
      'Volle API-Zugang',
      'Sendungsverfolgung',
      'Flottenmanagement',
      'Kapazitätsabgleich',
      'Individualisierung',
      'SLA-Garantie',
    ],
    featuresEn: [
      'Unlimited Shipments',
      'Full Analytics + AI + API Access',
      'Dedicated Support',
      'Auction Feature',
      'Full API Access',
      'Shipment Tracking',
      'Fleet Management',
      'Capacity Matching',
      'Customization',
      'SLA Guarantee',
    ],
    transportCommission: {
      admin: 0,
      dispatcher: 2,
      driver: 0,
      shipper: 1.5,
      warehouse: 0,
      support: 0,
      finance: 0,
      customer: 0,
    },
    walletFee: {
      admin: 0,
      dispatcher: 0,
      driver: 0.5,
      shipper: 0,
      warehouse: 0,
      support: 0,
      finance: 0,
      customer: 0,
    },
  },
];

// ==========================================
// COMMISSION HELPERS
// ==========================================

export function getTransportCommission(tier: MembershipTier, role: UserRole): number {
  if (role === 'admin' || role === 'support' || role === 'finance' || role === 'warehouse' || role === 'customer') return 0;
  const plan = membershipPlans.find((p) => p.tier === tier);
  if (!plan) return 0;
  return plan.transportCommission[role] ?? 0;
}

export function getWalletFee(tier: MembershipTier, role: UserRole): number {
  if (role === 'admin' || role === 'support' || role === 'finance' || role === 'warehouse' || role === 'customer' || role === 'dispatcher' || role === 'shipper') return 0;
  const plan = membershipPlans.find((p) => p.tier === tier);
  if (!plan) return 0;
  return plan.walletFee[role] ?? 0;
}

export function getMaxShipments(tier: MembershipTier): number | null {
  if (tier === 'free') return 5;
  const plan = membershipPlans.find((p) => p.tier === tier);
  if (!plan) return 5;
  return plan.maxShipments;
}

export function getPlan(tier: MembershipTier): MembershipPlan | undefined {
  return membershipPlans.find((p) => p.tier === tier);
}

// ==========================================
// AI PRICE RECOMMENDATION
// ==========================================

const HIDDEN_MARKUP = 0.20; // 20%
const BID_FLOOR_DISCOUNT = 0.65; // 35% below recommended price

const priorityMultiplier: Record<string, number> = {
  standard: 1.0,
  express: 1.15,
  overnight: 1.35,
};

const vehicleTypeMultiplier: Record<string, number> = {
  semi_trailer: 1.0,
  box_truck: 0.9,
  van: 0.75,
  refrigerated: 1.2,
  flatbed: 1.1,
};

export interface AIPricingParams {
  distance: number; // km
  weight: number; // kg
  priority: 'standard' | 'express' | 'overnight';
  vehicleType?: string;
}

export function calculateAIRecommendedPrice(params: AIPricingParams): AIPriceRecommendation {
  const { distance, weight, priority, vehicleType } = params;

  // Base price formula: (distance * 0.12) + (weight * 0.08)
  const baseDistanceCost = distance * 0.12;
  const baseWeightCost = weight * 0.08;
  let basePrice = baseDistanceCost + baseWeightCost;

  // Apply priority multiplier
  const pMultiplier = priorityMultiplier[priority] ?? 1.0;
  basePrice = basePrice * pMultiplier;

  // Apply vehicle type multiplier if provided
  if (vehicleType) {
    const vMultiplier = vehicleTypeMultiplier[vehicleType] ?? 1.0;
    basePrice = basePrice * vMultiplier;
  }

  // Round base price to 2 decimal places
  basePrice = Math.round(basePrice * 100) / 100;

  // Apply 20% hidden markup to get recommended price
  const recommendedPrice = Math.round(basePrice * (1 + HIDDEN_MARKUP) * 100) / 100;

  // Bid floor = 35% below recommended price
  const bidFloor = Math.round(recommendedPrice * BID_FLOOR_DISCOUNT * 100) / 100;

  return {
    basePrice,
    markup: HIDDEN_MARKUP * 100,
    recommendedPrice,
    bidFloor,
    currency: 'EUR',
    factors: {
      distance,
      weight,
      priority,
      vehicleType,
    },
  };
}

// ==========================================
// FORMAT HELPERS
// ==========================================

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
