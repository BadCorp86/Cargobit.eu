/**
 * CargoBit Matching Service
 * International transport-driver matching with smart algorithms
 */

import { prisma } from '@/lib/db';
import {
  VehicleRequirements,
  DriverRequirements,
  InternationalRequirements,
  MatchType,
  MatchingResult
} from '@/types/transport';

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

export interface MatchingInput {
  transportId: string;
  pickupCountry: string;
  deliveryCountry: string;
  pickupLocation?: { lat: number; lng: number };
  deliveryLocation?: { lat: number; lng: number };
  vehicleRequirements?: VehicleRequirements;
  driverRequirements?: DriverRequirements;
  internationalRequirements?: InternationalRequirements;
  isInternational: boolean;
}

export interface MatchedDriver {
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
  languageMatch: boolean;
  experienceBonus: number;
  ratingBonus: number;
  returnLoadBonus: number;
}

/**
 * Find matching drivers for a transport
 */
export async function findMatchingDrivers(input: MatchingInput): Promise<MatchedDriver[]> {
  console.log(`[Matching] Finding drivers for transport ${input.transportId}`);
  
  const matches: MatchedDriver[] = [];
  
  // Step 1: Find available drivers with correct vehicle type
  const candidateDrivers = await findCandidateDrivers(input);
  console.log(`[Matching] Found ${candidateDrivers.length} candidate drivers`);
  
  // Step 2: Score each candidate
  for (const driver of candidateDrivers) {
    const score = await scoreDriver(driver, input);
    if (score.matchScore > 0) {
      matches.push(score);
    }
  }
  
  // Step 3: Sort by match score (descending)
  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  // Step 4: Store matching results
  await storeMatchingResults(input.transportId, matches);
  
  return matches.slice(0, 20); // Return top 20 matches
}

// ============================================
// CANDIDATE FINDING
// ============================================

async function findCandidateDrivers(input: MatchingInput) {
  // Build filter conditions
  const whereConditions: Record<string, unknown> = {
    role: { in: ['DRIVER_SELF_EMPLOYED', 'DISPATCHER'] },
    status: 'ACTIVE',
    isAvailable: true
  };
  
  // For international transports, filter by international permission
  if (input.isInternational) {
    whereConditions.internationalAllowed = true;
  }
  
  // Get drivers with their vehicles and permissions
  const drivers = await prisma.user.findMany({
    where: whereConditions,
    include: {
      vehicles: {
        where: { isActive: true }
      },
      driverPermissions: {
        where: { isAllowed: true }
      }
    }
  });
  
  return drivers;
}

// ============================================
// DRIVER SCORING
// ============================================

async function scoreDriver(
  driver: any,
  input: MatchingInput
): Promise<MatchedDriver> {
  let score = 0;
  const matchReasons: string[] = [];
  let vehicleMatch = false;
  let driverMatch = false;
  let routeMatch = false;
  let internationalMatch = true;
  let countryPermissionsOk = true;
  let documentsOk = true;
  let tunnelCodesOk = true;
  let languageMatch = false;
  let experienceBonus = 0;
  let ratingBonus = 0;
  let returnLoadBonus = 0;
  
  // ========== VEHICLE MATCHING ==========
  if (input.vehicleRequirements) {
    const vehicleResult = checkVehicleMatch(driver.vehicles, input.vehicleRequirements);
    vehicleMatch = vehicleResult.matches;
    if (vehicleResult.matches) {
      score += 25;
      matchReasons.push(...vehicleResult.reasons);
    } else {
      // Vehicle requirements not met - disqualify
      return createEmptyMatch(driver.id);
    }
  } else {
    vehicleMatch = true;
    score += 15; // Base score for having a vehicle
  }
  
  // ========== DRIVER REQUIREMENTS ==========
  if (input.driverRequirements) {
    const driverResult = checkDriverRequirements(driver, input.driverRequirements);
    driverMatch = driverResult.matches;
    documentsOk = driverResult.documentsOk;
    if (driverResult.matches) {
      score += 20;
      matchReasons.push(...driverResult.reasons);
    } else if (!driverResult.critical) {
      // Non-critical requirements not met, reduce score
      score -= 5;
    } else {
      // Critical requirements not met - disqualify
      return createEmptyMatch(driver.id);
    }
  } else {
    driverMatch = true;
    score += 10;
  }
  
  // ========== INTERNATIONAL MATCHING ==========
  if (input.isInternational) {
    const intlResult = await checkInternationalMatch(driver, input);
    internationalMatch = intlResult.matches;
    countryPermissionsOk = intlResult.countryPermissionsOk;
    tunnelCodesOk = intlResult.tunnelCodesOk;
    documentsOk = documentsOk && intlResult.documentsOk;
    
    if (intlResult.matches) {
      score += 30;
      matchReasons.push(...intlResult.reasons);
    } else {
      // International requirements not met - disqualify for international
      return createEmptyMatch(driver.id);
    }
  } else {
    // Regional match bonus
    score += 10;
    routeMatch = true;
  }
  
  // ========== LANGUAGE MATCHING ==========
  if (input.driverRequirements?.languages?.length) {
    const driverLanguages = driver.spokenLanguages ? JSON.parse(driver.spokenLanguages) : [];
    const requiredLanguages = input.driverRequirements.languages;
    const hasLanguage = requiredLanguages.some((lang: string) => driverLanguages.includes(lang));
    if (hasLanguage) {
      languageMatch = true;
      score += 10;
      matchReasons.push('Sprachkenntnisse passen');
    }
  }
  
  // ========== BONUS FACTORS ==========
  
  // Rating bonus
  if (driver.rating >= 4.5) {
    ratingBonus = 10;
    score += 10;
    matchReasons.push('Top Bewertung');
  } else if (driver.rating >= 4.0) {
    ratingBonus = 5;
    score += 5;
  }
  
  // Experience bonus
  if (driver.yearsExperience && driver.yearsExperience >= 5) {
    experienceBonus = 10;
    score += 10;
    matchReasons.push('Erfahrener Fahrer');
  }
  
  // Country experience bonus
  if (input.isInternational && driver.countryExperience) {
    const expCountries = JSON.parse(driver.countryExperience);
    if (expCountries.includes(input.deliveryCountry)) {
      experienceBonus += 5;
      score += 5;
      matchReasons.push(`Erfahrung in ${input.deliveryCountry}`);
    }
  }
  
  // ========== RETURN LOAD DETECTION ==========
  // Check if driver is currently on a route that could include this as return load
  if (driver.currentRoute) {
    const routeCheck = await checkReturnLoadPotential(driver, input);
    if (routeCheck.isReturnLoad) {
      returnLoadBonus = 15;
      score += 15;
      matchReasons.push('Potentielle Rückladung');
    }
  }
  
  // Determine match type
  const matchType: MatchType = input.isInternational 
    ? 'INTERNATIONAL' 
    : returnLoadBonus > 0 
      ? 'RETURN_LOAD' 
      : 'REGIONAL';
  
  return {
    driverId: driver.id,
    matchScore: Math.min(100, score),
    matchReasons,
    matchType,
    vehicleMatch,
    driverMatch,
    routeMatch,
    internationalMatch,
    countryPermissionsOk,
    documentsOk,
    tunnelCodesOk,
    distanceToPickup: undefined, // Would calculate with geolocation API
    languageMatch,
    experienceBonus,
    ratingBonus,
    returnLoadBonus
  };
}

// ============================================
// VEHICLE REQUIREMENTS CHECK
// ============================================

function checkVehicleMatch(
  vehicles: any[],
  requirements: VehicleRequirements
): { matches: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  for (const vehicle of vehicles) {
    let matches = true;
    
    // Check vehicle type
    if (requirements.vehicleType?.length) {
      const vehicleTypeMap: Record<string, string> = {
        'sprinter': 'SPRINTER',
        'koffer': 'KOEFFER',
        'curtainsider': 'CURTAINSIDER',
        'plane': 'PLANE',
        'kipper': 'KIPPER',
        'silo': 'SILO',
        'mulde': 'MULDE',
        'tankauflieger': 'TANKAUFLIEGER',
        'autotransporter': 'AUTOTRANSPORTER',
        'tieflader': 'TIEFLADER',
        'containerchassis': 'CONTAINERCHASSIS',
        'reefer': 'KUEHLFAHRZEUG'
      };
      
      const requiredTypes = requirements.vehicleType.map(t => vehicleTypeMap[t] || t.toUpperCase());
      if (!requiredTypes.includes(vehicle.vehicleType)) {
        matches = false;
        continue;
      }
      reasons.push('Fahrzeugtyp passt');
    }
    
    // Check payload
    if (requirements.minPayload_kg && vehicle.maxWeightKg < requirements.minPayload_kg) {
      matches = false;
      continue;
    }
    
    // Check volume
    if (requirements.minVolume_m3 && vehicle.volumeM3 < requirements.minVolume_m3) {
      matches = false;
      continue;
    }
    
    // Check ADR
    if (requirements.adrRequired && !vehicle.adrCertified) {
      matches = false;
      continue;
    }
    if (requirements.adrRequired) {
      reasons.push('ADR-zertifiziert');
    }
    
    // Check cooling
    if (requirements.coolingRequired && !vehicle.hasCooling) {
      matches = false;
      continue;
    }
    if (requirements.coolingRequired) {
      reasons.push('Kühlfahrzeug verfügbar');
    }
    
    // Check crane
    if (requirements.craneRequired && !vehicle.hasCrane) {
      matches = false;
      continue;
    }
    
    // Check international allowed
    if (requirements.internationalAllowed === false && vehicle.internationalAllowed) {
      // This is fine
    }
    
    if (matches) {
      return { matches: true, reasons };
    }
  }
  
  return { matches: false, reasons: [] };
}

// ============================================
// DRIVER REQUIREMENTS CHECK
// ============================================

function checkDriverRequirements(
  driver: any,
  requirements: DriverRequirements
): { matches: boolean; reasons: string[]; documentsOk: boolean; critical: boolean } {
  const reasons: string[] = [];
  let documentsOk = true;
  
  // Check ADR license
  if (requirements.adrLicenseRequired && !driver.adrCertified) {
    return { matches: false, reasons: [], documentsOk: false, critical: true };
  }
  if (requirements.adrLicenseRequired) {
    reasons.push('ADR-Lizenz vorhanden');
  }
  
  // Check ADR classes
  if (requirements.adrClasses?.length && driver.adrClasses) {
    const driverAdrClasses = JSON.parse(driver.adrClasses);
    const hasAllClasses = requirements.adrClasses.every(c => driverAdrClasses.includes(c));
    if (!hasAllClasses) {
      return { matches: false, reasons: [], documentsOk: false, critical: true };
    }
  }
  
  // Check rating
  if (requirements.minRating && driver.rating < requirements.minRating) {
    return { matches: false, reasons: [], documentsOk: true, critical: true };
  }
  
  // Check completed transports
  if (requirements.minCompletedTransports && driver.completedTransports < requirements.minCompletedTransports) {
    return { matches: false, reasons: [], documentsOk: true, critical: true };
  }
  
  // Check damage history
  if (requirements.noDamageHistory && driver.damageCount > 0) {
    return { matches: false, reasons: [], documentsOk: true, critical: false };
  }
  
  if (requirements.maxDamageCount !== undefined && driver.damageCount > requirements.maxDamageCount) {
    return { matches: false, reasons: [], documentsOk: true, critical: false };
  }
  
  // Check international experience
  if (requirements.internationalExperience && !driver.internationalAllowed) {
    return { matches: false, reasons: [], documentsOk: true, critical: true };
  }
  if (requirements.internationalExperience) {
    reasons.push('Internationale Erfahrung');
  }
  
  // Check driver license class
  if (requirements.driverLicenseClass?.length && driver.driverLicenseClass) {
    if (!requirements.driverLicenseClass.includes(driver.driverLicenseClass)) {
      return { matches: false, reasons: [], documentsOk: false, critical: true };
    }
  }
  
  // Check driver card validity
  if (requirements.validDriverCard && driver.driverCardExpiry) {
    if (new Date(driver.driverCardExpiry) < new Date()) {
      documentsOk = false;
      return { matches: false, reasons: [], documentsOk: false, critical: true };
    }
  }
  
  // Check country experience
  if (requirements.countryExperience?.length && driver.countryExperience) {
    const expCountries = JSON.parse(driver.countryExperience);
    const hasExperience = requirements.countryExperience.some(c => expCountries.includes(c));
    if (!hasExperience) {
      // Not critical, just reduces score
      reasons.push('Keine Erfahrung in Zielland');
    } else {
      reasons.push('Erfahrung in Zielland');
    }
  }
  
  return { matches: true, reasons, documentsOk, critical: false };
}

// ============================================
// INTERNATIONAL MATCHING
// ============================================

async function checkInternationalMatch(
  driver: any,
  input: MatchingInput
): Promise<{ matches: boolean; reasons: string[]; countryPermissionsOk: boolean; documentsOk: boolean; tunnelCodesOk: boolean }> {
  const reasons: string[] = [];
  let countryPermissionsOk = true;
  let documentsOk = true;
  let tunnelCodesOk = true;
  
  // Check international permission
  if (!driver.internationalAllowed) {
    return { matches: false, reasons: [], countryPermissionsOk: false, documentsOk: true, tunnelCodesOk: true };
  }
  reasons.push('Internationale Fahrten erlaubt');
  
  // Check country permissions
  const driverPermissions = driver.driverPermissions || [];
  const allowedCountries = driverPermissions
    .filter((p: any) => p.isAllowed)
    .map((p: any) => p.countryCode);
  
  // Check if driver has permission for delivery country
  if (!allowedCountries.includes(input.deliveryCountry)) {
    countryPermissionsOk = false;
    return { matches: false, reasons: [], countryPermissionsOk: false, documentsOk: true, tunnelCodesOk: true };
  }
  reasons.push(`Genehmigung für ${input.deliveryCountry}`);
  
  // Check transit countries
  if (input.internationalRequirements?.transitCountries?.length) {
    for (const transitCountry of input.internationalRequirements.transitCountries) {
      if (!allowedCountries.includes(transitCountry)) {
        countryPermissionsOk = false;
        return { matches: false, reasons: [], countryPermissionsOk: false, documentsOk: true, tunnelCodesOk: true };
      }
    }
    reasons.push('Alle Transitländer abgedeckt');
  }
  
  // Check visa requirements
  if (input.internationalRequirements?.borderCrossings?.length) {
    for (const border of input.internationalRequirements.borderCrossings) {
      // Check ADR restrictions at borders
      if (input.vehicleRequirements?.adrRequired && border.adrAllowed === false) {
        return { matches: false, reasons: [], countryPermissionsOk: true, documentsOk: true, tunnelCodesOk: false };
      }
      
      // Check tunnel codes
      if (border.tunnelRestriction?.length && input.vehicleRequirements?.tunnelCodes?.length) {
        const hasRestrictedCode = input.vehicleRequirements.tunnelCodes.some(
          code => border.tunnelRestriction!.includes(code)
        );
        if (hasRestrictedCode) {
          tunnelCodesOk = false;
          return { matches: false, reasons: [], countryPermissionsOk: true, documentsOk: true, tunnelCodesOk: false };
        }
      }
    }
  }
  
  // Check toll systems (informational)
  if (input.internationalRequirements?.tollSystems?.length) {
    reasons.push('Mautsysteme berücksichtigt');
  }
  
  // Check CMR requirement
  if (input.internationalRequirements?.cmrRequired) {
    reasons.push('CMR verfügbar');
  }
  
  return { matches: true, reasons, countryPermissionsOk, documentsOk, tunnelCodesOk };
}

// ============================================
// RETURN LOAD CHECK
// ============================================

async function checkReturnLoadPotential(
  driver: any,
  input: MatchingInput
): Promise<{ isReturnLoad: boolean }> {
  // In a real implementation, this would check the driver's current route
  // and see if the pickup location is near their destination
  // For now, return false
  return { isReturnLoad: false };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createEmptyMatch(driverId: string): MatchedDriver {
  return {
    driverId,
    matchScore: 0,
    matchReasons: [],
    matchType: 'REGIONAL',
    vehicleMatch: false,
    driverMatch: false,
    routeMatch: false,
    internationalMatch: false,
    countryPermissionsOk: false,
    documentsOk: false,
    tunnelCodesOk: false,
    languageMatch: false,
    experienceBonus: 0,
    ratingBonus: 0,
    returnLoadBonus: 0
  };
}

async function storeMatchingResults(transportId: string, matches: MatchedDriver[]) {
  // Store top matches in database
  for (const match of matches.slice(0, 50)) {
    if (match.matchScore > 0) {
      await prisma.matchingResult.create({
        data: {
          transportId,
          driverId: match.driverId,
          matchScore: match.matchScore,
          matchReasons: JSON.stringify(match.matchReasons),
          matchType: match.matchType,
          vehicleMatch: match.vehicleMatch,
          driverMatch: match.driverMatch,
          routeMatch: match.routeMatch,
          internationalMatch: match.internationalMatch,
          countryPermissionsOk: match.countryPermissionsOk,
          documentsOk: match.documentsOk,
          tunnelCodesOk: match.tunnelCodesOk,
          distanceToPickup: match.distanceToPickup,
          languageMatch: match.languageMatch,
          experienceBonus: match.experienceBonus,
          ratingBonus: match.ratingBonus,
          returnLoadBonus: match.returnLoadBonus,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      }).catch(() => {}); // Ignore errors for duplicate matches
    }
  }
}

// ============================================
// EXPORT
// ============================================

export const matchingService = {
  findMatchingDrivers,
  checkVehicleMatch,
  checkDriverRequirements,
  checkInternationalMatch
};
