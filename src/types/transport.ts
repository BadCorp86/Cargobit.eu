// ============================================
// CARGOBIT API TYPES
// Enterprise Logistics Platform
// ============================================

// ============================================
// VEHICLE REQUIREMENTS
// ============================================

export type VehicleType = 
  | 'sprinter'
  | 'koffer'
  | 'plane'
  | 'curtainsider'
  | 'kipper'
  | 'silo'
  | 'mulde'
  | 'tankauflieger'
  | 'autotransporter'
  | 'tieflader'
  | 'tiefbett'
  | 'containerchassis'
  | 'reefer'
  | 'langauflieger'
  | 'jumbo'
  | 'ibc_transporter';

export type EmissionClass = 'EURO_3' | 'EURO_4' | 'EURO_5' | 'EURO_6' | 'EEV';
export type LoadingSystem = 'floor' | 'ceiling' | 'side' | 'rear' | 'top';
export type TunnelCode = 'A' | 'B' | 'C' | 'D' | 'E';
export type ADRClass = '1' | '2' | '3' | '4.1' | '4.2' | '4.3' | '5.1' | '5.2' | '6.1' | '6.2' | '7' | '8' | '9';

export interface VehicleRequirements {
  vehicleType: VehicleType[];
  minPayload_kg?: number;
  minVolume_m3?: number;
  minLength_m?: number;
  minWidth_m?: number;
  minHeight_m?: number;
  adrRequired?: boolean;
  adrClasses?: ADRClass[];
  tunnelCodes?: TunnelCode[];
  coolingRequired?: boolean;
  temperatureMin?: number;
  temperatureMax?: number;
  craneRequired?: boolean;
  liftRequired?: boolean;
  rampRequired?: boolean;
  escortVehicleRequired?: boolean;
  palletSpaces?: number;
  internationalAllowed?: boolean;
  emissionClass?: EmissionClass;
  loadingSystem?: LoadingSystem;
}

// ============================================
// DRIVER REQUIREMENTS
// ============================================

export type DriverLicenseClass = 'C1' | 'C1E' | 'C' | 'CE' | 'D1' | 'D1E' | 'D' | 'DE';
export type VehicleExperience = 
  | 'schuettgut'
  | 'tank'
  | 'kuehltransport'
  | 'autotransport'
  | 'tieflader'
  | 'container'
  | 'gefangut'
  | 'sattelauflieger'
  | 'koffer';

export interface DriverRequirements {
  adrLicenseRequired?: boolean;
  adrClasses?: ADRClass[];
  languages?: string[];
  minLanguages?: number;
  internationalExperience?: boolean;
  vehicleExperience?: VehicleExperience[];
  countryExperience?: string[];
  noDamageHistory?: boolean;
  maxDamageCount?: number;
  minRating?: number;
  minCompletedTransports?: number;
  validDriverCard?: boolean;
  driverLicenseClass?: DriverLicenseClass[];
  visaRequired?: boolean;
  visaCountries?: string[];
  backgroundCheck?: boolean;
  minAge?: number;
  minDrivingExperience?: number;
}

// ============================================
// INTERNATIONAL REQUIREMENTS
// ============================================

export type TollSystem = 
  | 'toll_collect'
  | 'etoll'
  | 'myto_cz'
  | 'vignettes'
  | 'via_toll'
  | 'e_toll_pl'
  | 'telepass'
  | 'tis_pl';

export type CustomsDocument = 
  | 'T1'
  | 'T2'
  | 'EX'
  | 'import_declaration'
  | 'export_declaration'
  | 'transit_document'
  | 'carnet_tir'
  | 'carnet_ata';

export type RouteType = 'fastest' | 'shortest' | 'eco' | 'balanced';

export interface TollRequirement {
  country: string;
  system: TollSystem;
  required?: boolean;
}

export interface BorderCrossing {
  fromCountry: string;
  toCountry: string;
  crossingPoint?: string;
  adrAllowed?: boolean;
  tunnelRestriction?: TunnelCode[];
}

export interface RoutePreferences {
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  avoidTunnels?: boolean;
  preferHighways?: boolean;
  routeType?: RouteType;
}

export interface InsuranceRequirement {
  cmr_insurance?: boolean;
  cargo_insurance?: boolean;
  minCoverage_eur?: number;
}

export interface InternationalRequirements {
  isInternational?: boolean;
  transitCountries?: string[];
  tollSystems?: TollRequirement[];
  customsRequired?: boolean;
  customsDocuments?: CustomsDocument[];
  cmrRequired?: boolean;
  adrDocuments?: boolean;
  insuranceRequired?: InsuranceRequirement;
  borderCrossings?: BorderCrossing[];
  routePreferences?: RoutePreferences;
  deliveryInstructions?: string;
}

// ============================================
// TRANSPORT API
// ============================================

export interface LocationInput {
  address: string;
  city?: string;
  postalCode?: string;
  country: string;
  date: string;
  timeFrom?: string;
  timeTo?: string;
  contact?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

export interface PricingInput {
  proposedPrice: number;
  currency?: string;
  priceNegotiable?: boolean;
}

export interface TransportRequirements {
  vehicle?: VehicleRequirements;
  driver?: DriverRequirements;
  international?: InternationalRequirements;
}

export interface CreateTransportRequest {
  shipperId: string;
  pickup: LocationInput;
  delivery: LocationInput;
  transportType: TransportType;
  details: Record<string, unknown>;
  pricing: PricingInput;
  requirements?: TransportRequirements;
  description?: string;
}

export interface CreateTransportResponse {
  transportId: string;
  status: 'created';
  matchingStarted: boolean;
  estimatedMatches?: number;
}

// ============================================
// TRANSPORT STATUS
// ============================================

export type TransportStatus = 
  | 'draft'
  | 'pending'
  | 'published'
  | 'offers_received'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type TransportType = 
  | 'pallet'
  | 'bulk'
  | 'liquid'
  | 'oversize'
  | 'lowloader'
  | 'car_transport'
  | 'cooling'
  | 'hazmat'
  | 'container';

// ============================================
// OFFER API
// ============================================

export interface CreateOfferRequest {
  transportId: string;
  driverId: string;
  price: number;
  currency?: string;
  message?: string;
  estimatedDuration?: string;
  validUntil?: string;
}

export interface OfferResponse {
  offerId: string;
  status: 'pending';
  transportId: string;
}

// ============================================
// ASSIGN TRANSPORT
// ============================================

export interface AssignTransportRequest {
  transportId: string;
  driverId: string;
  offerId?: string;
}

export interface AssignTransportResponse {
  transportId: string;
  status: 'confirmed';
  driverId: string;
  escrowCreated: boolean;
  escrowAmount?: number;
}

// ============================================
// STATUS UPDATE
// ============================================

export type TransportStatusUpdate = 
  | 'accepted'
  | 'on_route'
  | 'pickup_done'
  | 'delivery_done'
  | 'completed';

export interface UpdateTransportStatusRequest {
  transportId: string;
  status: TransportStatusUpdate;
  location?: {
    latitude: number;
    longitude: number;
  };
  note?: string;
  photoUrl?: string;
}

export interface UpdateTransportStatusResponse {
  transportId: string;
  status: TransportStatusUpdate;
  timestamp: string;
}

// ============================================
// MATCHING RESULT
// ============================================

export type MatchType = 'EXACT' | 'REGIONAL' | 'RETURN_LOAD' | 'INTERNATIONAL';
export type MatchStatus = 'PENDING' | 'NOTIFIED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface MatchingResult {
  id: string;
  transportId: string;
  driverId: string;
  matchScore: number;
  matchReasons: string[];
  matchType: MatchType;
  vehicleMatch: boolean;
  driverMatch: boolean;
  routeMatch: boolean;
  internationalMatch: boolean;
  countryPermissionsOk: boolean;
  documentsOk: boolean;
  tunnelCodesOk: boolean;
  distanceToPickup?: number;
  estimatedArrival?: string;
  languageMatch: boolean;
  experienceBonus: number;
  ratingBonus: number;
  returnLoadBonus: number;
  status: MatchStatus;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface TransportDetails {
  id: string;
  shipperId: string;
  driverId?: string;
  status: TransportStatus;
  transportType: TransportType;
  pickup: LocationInput;
  delivery: LocationInput;
  distanceKm?: number;
  estimatedDuration?: string;
  pricing: {
    proposedPrice: number;
    agreedPrice?: number;
    currency: string;
  };
  requirements: TransportRequirements;
  isInternational: boolean;
  matchingResults?: MatchingResult[];
  createdAt: string;
  updatedAt: string;
}
