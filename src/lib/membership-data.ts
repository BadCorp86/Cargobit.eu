import type { MembershipPlan, MembershipTier, AIPriceRecommendation, UserRole } from '@/types';

// ==========================================
// MEMBERSHIP PLANS
// ==========================================
//
// GESCHÄFTSREGELN:
//
// 1. SPEDITEUR / FAHRER → zahlen monatliches Abo + Provision/Wallet-Gebühr
// 2. TRANSPORTUNTERNEHMER / VERLADER (Auktionsersteller) → KEIN monatliches Abo!
//    Nur 4% Vermittlungsgebühr/Auktionsprovision auf den Zuschlagspreis.
//    Beispiel: Auktion startet bei €1.000, endet bei €800 → Verlader zahlt 4% von €800 = €32
// 3. KOSTENLOSER ZUGANG → 2 Monate Starter-Limitiert:
//    - Kann alles SEHEN aber nicht alles nutzen
//    - Max. 5 Aufträge annehmen & durchführen
//    - Transportprovision: 14% pro abgeschlossenem Auftrag
//    - Wallet-Gebühr: 3,5%
// ==========================================

// Vermittlungsgebühr für Verlader/Auktionsersteller (4% auf Zuschlagspreis)
export const VERLADER_BROKERAGE_FEE = 4.0;

// Free-Tier Konfiguration
export const FREE_TIER = {
  maxOrdersInTrial: 5,
  trialMonths: 2,
  transportCommission: 14,
  walletFee: 3.5,
  canViewEverything: true,
  canUseEverything: false,
};

export const membershipPlans: MembershipPlan[] = [
  {
    id: 'plan-starter',
    tier: 'starter',
    name: 'Starter',
    nameEn: 'Starter',
    description: 'Perfekt für den Einstieg in die digitale Frachtbörse',
    descriptionEn: 'Perfect for getting started with digital freight exchange',
    priceMonthly: 89,
    priceYearly: 890,
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
    // Spediteur provisionen
    transportCommission: {
      admin: 0,
      dispatcher: 8,
      driver: 0,
      shipper: 0, // Verlader zahlt KEIN Abo, nur 4% Auktionsprovision
      support: 0,
    },
    walletFee: {
      admin: 0,
      dispatcher: 3, // Starter: 3% Wallet-Gebühr für Disponenten
      driver: 0,
      shipper: 0,
      support: 0,
    },
  },
  {
    id: 'plan-professional',
    tier: 'professional',
    name: 'Professional',
    nameEn: 'Professional',
    description: 'Für wachsende Transportunternehmen mit erweitertem Bedarf',
    descriptionEn: 'For growing transport companies with advanced needs',
    priceMonthly: 499,
    priceYearly: 4990,
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
      shipper: 0, // Verlader zahlt KEIN Abo
      support: 0,
    },
    walletFee: {
      admin: 0,
      dispatcher: 2.5, // Professional: 2.5% Wallet-Gebühr für Disponenten
      driver: 0,
      shipper: 0,
      support: 0,
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
    priceMonthly: 899,
    priceYearly: 8990,
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
      dispatcher: 3.5,  // was 2, now 3.5%
      driver: 0,
      shipper: 0, // Verlader zahlt KEIN Abo
      support: 0,
    },
    walletFee: {
      admin: 0,
      dispatcher: 2, // Enterprise: 2% Wallet-Gebühr für Disponenten
      driver: 0,
      shipper: 0,
      support: 0,
    },
  },
];

// ==========================================
// COMMISSION HELPERS
// ==========================================

/**
 * Transportprovision für Spediteur/Fahrer (Abo-basiert)
 * Verlader hat hier immer 0% – sie zahlen stattdessen die Auktionsprovision
 */
export function getTransportCommission(tier: MembershipTier, role: UserRole): number {
  if (role === 'admin' || role === 'support') return 0;
  if (role === 'shipper') return 0; // Verlader zahlt keine Transportprovision, nur Auktionsprovision

  if (tier === 'free') return FREE_TIER.transportCommission;

  const plan = membershipPlans.find((p) => p.tier === tier);
  if (!plan) return FREE_TIER.transportCommission;
  return plan.transportCommission[role] ?? FREE_TIER.transportCommission;
}

/**
 * Wallet-Gebühr für Disponenten (Abo-basiert)
 * Disponenten erhalten das Geld auf ihr Wallet, daher zahlen sie die Wallet-Gebühr
 */
export function getWalletFee(tier: MembershipTier, role: UserRole): number {
  if (role !== 'dispatcher') return 0;

  if (tier === 'free') return FREE_TIER.walletFee;

  const plan = membershipPlans.find((p) => p.tier === tier);
  if (!plan) return FREE_TIER.walletFee;
  return plan.walletFee[role] ?? FREE_TIER.walletFee;
}

/**
 * Vermittlungsgebühr/Auktionsprovision für Verlader/Auktionsersteller
 * IMMER 4% auf den Zuschlagspreis, unabhängig vom Abo-Tier
 * Beispiel: Zuschlag bei €800 → 4% von €800 = €32 Vermittlungsgebühr
 */
export function getVerladerBrokerageFee(): number {
  return VERLADER_BROKERAGE_FEE;
}

/**
 * Berechnet die tatsächliche Vermittlungsgebühr für den Verlader
 * @param winningBidAmount Der Zuschlagspreis (Betrag, den der Transporteur erhält)
 * @returns Die Vermittlungsgebühr, die der Verlader an CargoBit zahlt
 */
export function calculateVerladerFee(winningBidAmount: number): number {
  return Math.round(winningBidAmount * (VERLADER_BROKERAGE_FEE / 100) * 100) / 100;
}

/**
 * Maximale Sendungen je Tier
 */
export function getMaxShipments(tier: MembershipTier): number | null {
  if (tier === 'free') return FREE_TIER.maxOrdersInTrial;
  const plan = membershipPlans.find((p) => p.tier === tier);
  if (!plan) return FREE_TIER.maxOrdersInTrial;
  return plan.maxShipments;
}

export function getPlan(tier: MembershipTier): MembershipPlan | undefined {
  return membershipPlans.find((p) => p.tier === tier);
}

/**
 * Prüft ob eine Rolle ein monatliches Abo benötigt
 * Verlader (shipper) benötigen KEIN Abo – nur 4% Auktionsprovision
 */
export function requiresMonthlyFee(role: UserRole): boolean {
  return role !== 'shipper';
}

// ==========================================
// AI PRICE RECOMMENDATION
// ==========================================

const HIDDEN_MARKUP = 0.20; // 20% versteckter Aufschlag
const BID_FLOOR_DISCOUNT = 0.65; // 35% unter dem empfohlenen Preis

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

  // Basispreis-Formel: (Distanz × 0,12€) + (Gewicht × 0,08€)
  const baseDistanceCost = distance * 0.12;
  const baseWeightCost = weight * 0.08;
  let basePrice = baseDistanceCost + baseWeightCost;

  // Prioritätsmultiplikator
  const pMultiplier = priorityMultiplier[priority] ?? 1.0;
  basePrice = basePrice * pMultiplier;

  // Fahrzeugtyp-Multiplikator
  if (vehicleType) {
    const vMultiplier = vehicleTypeMultiplier[vehicleType] ?? 1.0;
    basePrice = basePrice * vMultiplier;
  }

  // Auf 2 Dezimalstellen runden
  basePrice = Math.round(basePrice * 100) / 100;

  // 20% versteckter Aufschlag → Empfohlener Preis (Erschaffer sieht NUR diesen)
  const recommendedPrice = Math.round(basePrice * (1 + HIDDEN_MARKUP) * 100) / 100;

  // Mindestgebot = 35% unter dem empfohlenen Preis
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

/**
 * Berechnet die Transporteur-Provision auf den Zuschlagspreis
 * Transporteur = Spediteur (dispatcher), der die Auktion gewinnt
 * @param winningBidAmount Der Zuschlagspreis
 * @param tier Das Abo-Tier des Transporteurs
 * @returns Die Provision, die der Transporteur an CargoBit zahlt
 */
export function calculateTransporteurCommission(winningBidAmount: number, tier: MembershipTier): number {
  const commissionPercent = getTransportCommission(tier, 'dispatcher');
  return Math.round(winningBidAmount * (commissionPercent / 100) * 100) / 100;
}

/**
 * Berechnet den Netto-Betrag den der Transporteur nach Abzug der Provision erhält
 */
export function calculateTransporteurNetIncome(winningBidAmount: number, tier: MembershipTier): number {
  const commission = calculateTransporteurCommission(winningBidAmount, tier);
  return Math.round((winningBidAmount - commission) * 100) / 100;
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
