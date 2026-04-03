export type UserRole =
  | 'admin'
  | 'dispatcher'
  | 'driver'
  | 'shipper'
  | 'support';

export type ShipmentStatus =
  | 'pending'
  | 'processing'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type NavigationTab =
  | 'dashboard'
  | 'shipments'
  | 'tracking'
  | 'fleet'
  | 'capacity'
  | 'support'
  | 'analytics'
  | 'blog'
  | 'settings'
  | 'wallet'
  | 'advertising'
  | 'memberships'
  | 'chat';

export type DriverStatus = 'available' | 'en_route' | 'on_break' | 'offline' | 'resting';
export type VehicleStatus = 'active' | 'maintenance' | 'parked' | 'loading' | 'unloading';

export interface FleetDriver {
  id: string;
  name: string;
  phone: string;
  email: string;
  license: string;
  status: DriverStatus;
  currentVehicle: string;
  currentRoute: string;
  completedDeliveries: number;
  rating: number;
  location: string;
  avatar?: string;
  languages: string[];
}

export interface FleetVehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  type: 'semi_trailer' | 'box_truck' | 'van' | 'refrigerated' | 'flatbed';
  status: VehicleStatus;
  maxWeight: number;
  maxVolume: number;
  currentWeight: number;
  currentVolume: number;
  fuelLevel: number;
  mileage: number;
  nextMaintenance: string;
  assignedDriver: string;
  currentRoute: string;
  temperature?: number;
  insuranceExpiry: string;
}

export interface CapacityMatch {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleRoute: string;
  availableWeight: number;
  availableVolume: number;
  shipmentId: string;
  shipmentTracking: string;
  shipmentWeight: number;
  shipmentVolume: number;
  pickupCity: string;
  deliveryCity: string;
  matchScore: number;
  priority: 'standard' | 'express' | 'overnight';
  etaOverlap: boolean;
}

export interface RouteOptimization {
  vehicleId: string;
  vehiclePlate: string;
  driverName: string;
  currentRoute: string;
  totalDistance: number;
  estimatedTime: string;
  utilizationPercent: number;
  suggestedStops: SuggestedStop[];
}

export interface SuggestedStop {
  city: string;
  availableCapacityWeight: number;
  availableCapacityVolume: number;
  matchingShipments: number;
  detourMinutes: number;
}

export type Language =
  | 'de'
  | 'en'
  | 'pl'
  | 'cs'
  | 'el'
  | 'tr'
  | 'sl'
  | 'hu'
  | 'ro';

export interface RoleConfig {
  id: UserRole;
  label: string;
  icon: string;
  description: string;
  availableTabs: NavigationTab[];
  isPublic?: boolean; // true = publicly selectable on login, false/undefined = owner-assigned only
  ownerOnly?: boolean; // true = only the platform owner can create/assign this role
  marketingByApplication?: boolean; // true = access only after approved application to owner
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  sender: string;
  senderAddress: string;
  receiver: string;
  receiverAddress: string;
  status: ShipmentStatus;
  weight: number;
  dimensions: string;
  pickupDate: string;
  deliveryDate: string;
  estimatedDelivery: string;
  driver: string;
  vehicle: string;
  route: string;
  cost: number;
  insurance: boolean;
  priority: 'standard' | 'express' | 'overnight';
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  customer: string;
  shipmentId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isAgent: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'shipment' | 'delivery' | 'payment' | 'alert' | 'system';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  category: string;
  tags: string[];
  publishedAt: string;
  readTime: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  shipments: number;
}

export interface RegionalData {
  region: string;
  shipments: number;
  revenue: number;
  growth: number;
}

export interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
}

export interface WalletTransaction {
  id: string;
  type: 'transport_fee' | 'commission' | 'auction_fee' | 'express_surcharge' | 'refund' | 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
  description: string;
  shipmentId?: string;
  createdAt: string;
  balanceAfter: number;
}

export interface WalletInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  createdAt: string;
  dueDate: string;
  customerName: string;
  shipmentIds: string[];
}

export interface PaymentMethod {
  id: string;
  type: 'bank_transfer' | 'credit_card' | 'sepa';
  label: string;
  details: string;
  isDefault: boolean;
}

export interface AdCampaign {
  id: string;
  name: string;
  advertiser: string;
  status: 'active' | 'pending_review' | 'paused' | 'completed' | 'rejected';
  position: string;
  bannerUrl: string;
  targetUrl: string;
  impressions: number;
  clicks: number;
  budget: number;
  budgetUsed: number;
  startDate: string;
  endDate: string;
  ctr: number;
  createdAt: string;
}

export interface AdPosition {
  id: string;
  name: string;
  location: string;
  dimensions: string;
  pricePerMonth: number;
  available: boolean;
  currentAdvertiser?: string;
}

export interface AdApplication {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  targetAudience: string[];
  budgetRange: string;
  preferredPositions: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export type MembershipTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface MembershipPlan {
  id: string;
  tier: MembershipTier;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  priceMonthly: number;
  priceYearly: number;
  freeTrialMonths: number;
  maxShipments: number | null;
  features: string[];
  featuresEn: string[];
  transportCommission: Record<UserRole, number>;
  walletFee: Record<UserRole, number>;
  popular?: boolean;
}

export interface AIPriceRecommendation {
  basePrice: number;
  markup: number;
  recommendedPrice: number;
  bidFloor: number;
  currency: string;
  factors: {
    distance: number;
    weight: number;
    priority: 'standard' | 'express' | 'overnight';
    vehicleType?: string;
  };
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'outbid';
  reason?: string;
  createdAt: string;
}

export function getDriverStatusColor(status: DriverStatus): string {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'en_route': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'on_break': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'offline': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    case 'resting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

export function getVehicleStatusColor(status: VehicleStatus): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'maintenance': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'parked': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    case 'loading': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'unloading': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}
