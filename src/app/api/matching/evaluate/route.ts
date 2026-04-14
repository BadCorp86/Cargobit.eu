import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EvaluateCandidateRequest, EvaluateCandidateResponse, RuleCheckResult, ApiErrorResponse } from '@/types/matching';

// Transport type rules configuration
const TRANSPORT_TYPE_RULES: Record<string, string[]> = {
  'PALLET': ['dimensions_check', 'pallet_spaces', 'lift_check'],
  'BULK': ['vehicle_type_kipper_silo', 'weight_capacity', 'loading_method'],
  'LIQUID': ['tank_capacity', 'temperature_range', 'pump_availability'],
  'OVERSIZE': ['permits_required', 'escort_check', 'route_restriction'],
  'LOWLOADER': ['ramp_crane', 'height_clearance', 'special_equipment'],
  'CAR_TRANSPORT': ['car_capacity', 'secure_loading', 'insurance_level'],
  'COOLING': ['temperature_range', 'temperature_monitoring', 'certification'],
  'HAZMAT': ['adr_certification', 'adr_classes', 'tunnel_codes', 'special_permit'],
  'CONTAINER': ['chassis_type', 'twist_locks', 'crane_availability']
};

// POST /api/matching/evaluate - Evaluate a candidate against transport-specific rules
export async function POST(request: NextRequest) {
  try {
    const body: EvaluateCandidateRequest = await request.json();

    if (!body.transportId || !body.candidateId) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required fields: transportId, candidateId',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Get transport
    const transport = await db.transport.findUnique({
      where: { id: body.transportId },
      include: {
        transportDetail: true,
        pickupAddress: true,
        deliveryAddress: true
      }
    });

    if (!transport) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Transport not found',
        code: 'TRANSPORT_NOT_FOUND'
      }, { status: 404 });
    }

    // Get driver with vehicle
    const driver = await db.driver.findUnique({
      where: { id: body.candidateId },
      include: {
        user: true,
        driverVehicles: body.vehicleId 
          ? { where: { vehicleId: body.vehicleId }, include: { vehicle: true } }
          : { include: { vehicle: true }, take: 1 }
      }
    });

    if (!driver || !driver.driverVehicles.length) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Driver or vehicle not found',
        code: 'DRIVER_NOT_FOUND'
      }, { status: 404 });
    }

    const vehicle = driver.driverVehicles[0].vehicle;
    const ruleResults: RuleCheckResult[] = [];
    const failedRules: string[] = [];
    const warnings: string[] = [];
    let totalScore = 0;

    // Get applicable rules
    const transportType = transport.transportType;
    const applicableRules = TRANSPORT_TYPE_RULES[transportType] || [];

    // Parse requirements
    const vehicleReqs = transport.transportDetail?.vehicleRequirements 
      ? JSON.parse(transport.transportDetail.vehicleRequirements) 
      : {};
    const driverReqs = transport.transportDetail?.driverRequirements 
      ? JSON.parse(transport.transportDetail.driverRequirements) 
      : {};

    // ========== APPLY TRANSPORT TYPE RULES ==========

    // Vehicle Type Check
    if (applicableRules.includes('dimensions_check') || applicableRules.includes('pallet_spaces')) {
      const result = checkDimensionsRule(transport, vehicle, vehicleReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // Lift Check (for pallets)
    if (applicableRules.includes('lift_check')) {
      const result = checkLiftRule(vehicle, vehicleReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // Bulk Transport Rules
    if (applicableRules.includes('vehicle_type_kipper_silo')) {
      const result = checkBulkVehicleRule(vehicle);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // Liquid Transport Rules
    if (applicableRules.includes('tank_capacity')) {
      const result = checkTankRule(vehicle, vehicleReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // Temperature Rules (Cooling)
    if (applicableRules.includes('temperature_range')) {
      const result = checkTemperatureRule(vehicle, vehicleReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // ADR Rules (Hazmat)
    if (applicableRules.includes('adr_certification')) {
      const result = checkADRRule(driver, vehicle, vehicleReqs, driverReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // Tunnel Codes
    if (applicableRules.includes('tunnel_codes')) {
      const result = checkTunnelCodesRule(vehicle, vehicleReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // Oversize Rules
    if (applicableRules.includes('permits_required') || applicableRules.includes('escort_check')) {
      const result = checkOversizeRule(vehicle, vehicleReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // ========== DRIVER REQUIREMENTS ==========

    // License Check
    if (driverReqs.driverLicenseClass?.length) {
      const result = checkLicenseRule(driver, driverReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // Rating Check
    if (driverReqs.minRating) {
      const result = checkRatingRule(driver, driverReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // Experience Check
    if (driverReqs.minCompletedTransports || driverReqs.internationalExperience) {
      const result = checkExperienceRule(driver, driverReqs);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // ========== INTERNATIONAL CHECKS ==========

    const isInternational = transport.pickupAddress.country !== transport.deliveryAddress.country;
    if (isInternational) {
      const result = await checkInternationalRule(driver, transport);
      ruleResults.push(result);
      if (!result.passed) failedRules.push(result.ruleName);
      totalScore += result.score;
    }

    // ========== GENERAL CHECKS ==========

    // Availability
    const availabilityResult = checkAvailabilityRule(driver);
    ruleResults.push(availabilityResult);
    if (!availabilityResult.passed) failedRules.push(availabilityResult.ruleName);
    totalScore += availabilityResult.score;

    // Documents Validity
    const documentsResult = checkDocumentsRule(driver);
    ruleResults.push(documentsResult);
    if (!documentsResult.passed) warnings.push('Dokumente bald abgelaufen');
    totalScore += documentsResult.score;

    const rulesPassed = failedRules.length === 0;

    return NextResponse.json<EvaluateCandidateResponse>({
      candidateId: body.candidateId,
      vehicleId: vehicle.id,
      rulesPassed,
      failedRules,
      ruleResults,
      totalScore: Math.min(100, totalScore / Math.max(1, ruleResults.length) * 100),
      warnings
    }, { status: 200 });

  } catch (error) {
    console.error('Evaluate candidate error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to evaluate candidate',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// ========== RULE CHECK FUNCTIONS ==========

function checkDimensionsRule(transport: any, vehicle: any, reqs: any): RuleCheckResult {
  const cargoDetails = transport.transportDetail?.detailsJson 
    ? JSON.parse(transport.transportDetail.detailsJson) 
    : {};
  
  // Check length
  if (cargoDetails.length_m && vehicle.lengthM) {
    if (vehicle.lengthM < cargoDetails.length_m) {
      return { ruleName: 'dimensions_check', passed: false, score: 0, message: 'Fahrzeug zu kurz' };
    }
  }

  // Check height
  if (cargoDetails.height_m && vehicle.heightM) {
    if (vehicle.heightM < cargoDetails.height_m) {
      return { ruleName: 'dimensions_check', passed: false, score: 0, message: 'Fahrzeug zu niedrig' };
    }
  }

  // Check pallet spaces
  if (cargoDetails.palletSpaces && vehicle.palletSpaces) {
    if (vehicle.palletSpaces < cargoDetails.palletSpaces) {
      return { ruleName: 'pallet_spaces', passed: false, score: 0, message: 'Nicht genug Palettenstellplätze' };
    }
  }

  return { ruleName: 'dimensions_check', passed: true, score: 100, message: 'Maße passen' };
}

function checkLiftRule(vehicle: any, reqs: any): RuleCheckResult {
  if (reqs.liftRequired && !vehicle.hasLift) {
    return { ruleName: 'lift_check', passed: false, score: 0, message: 'Ladebordwand erforderlich' };
  }
  if (vehicle.hasLift) {
    return { ruleName: 'lift_check', passed: true, score: 100, message: 'Ladebordwand vorhanden' };
  }
  return { ruleName: 'lift_check', passed: true, score: 50, message: 'Keine Ladebordwand benötigt' };
}

function checkBulkVehicleRule(vehicle: any): RuleCheckResult {
  const bulkTypes = ['KIPPER', 'SILO', 'MULDE'];
  if (!bulkTypes.includes(vehicle.type)) {
    return { ruleName: 'vehicle_type_kipper_silo', passed: false, score: 0, message: 'Kipper oder Silo erforderlich' };
  }
  return { ruleName: 'vehicle_type_kipper_silo', passed: true, score: 100, message: 'Passendes Schüttgut-Fahrzeug' };
}

function checkTankRule(vehicle: any, reqs: any): RuleCheckResult {
  if (!vehicle.hasTank) {
    return { ruleName: 'tank_capacity', passed: false, score: 0, message: 'Tank erforderlich' };
  }
  if (reqs.minVolume_m3 && vehicle.tankCapacityL) {
    if (vehicle.tankCapacityL / 1000 < reqs.minVolume_m3) {
      return { ruleName: 'tank_capacity', passed: false, score: 0, message: 'Tankkapazität zu gering' };
    }
  }
  return { ruleName: 'tank_capacity', passed: true, score: 100, message: 'Tankkapazität ausreichend' };
}

function checkTemperatureRule(vehicle: any, reqs: any): RuleCheckResult {
  if (!vehicle.coolingAvailable) {
    return { ruleName: 'temperature_range', passed: false, score: 0, message: 'Kühlung erforderlich' };
  }
  if (reqs.temperatureRange) {
    return { ruleName: 'temperature_range', passed: true, score: 100, message: `Temperaturbereich: ${reqs.temperatureRange.min}°C bis ${reqs.temperatureRange.max}°C` };
  }
  return { ruleName: 'temperature_range', passed: true, score: 100, message: 'Kühlung verfügbar' };
}

function checkADRRule(driver: any, vehicle: any, vReqs: any, dReqs: any): RuleCheckResult {
  // Vehicle ADR
  if (vReqs.adrRequired && !vehicle.adrApproved) {
    return { ruleName: 'adr_certification', passed: false, score: 0, message: 'Fahrzeug nicht ADR-zertifiziert' };
  }

  // Driver ADR
  if (dReqs.adrLicenseRequired && !driver.adrLicense) {
    return { ruleName: 'adr_certification', passed: false, score: 0, message: 'Fahrer ohne ADR-Bescheinigung' };
  }

  // ADR Classes
  const requiredClasses = vReqs.adrClasses || dReqs.adrClasses || [];
  if (requiredClasses.length && driver.adrClasses) {
    const driverClasses = JSON.parse(driver.adrClasses);
    const hasAll = requiredClasses.every((c: string) => driverClasses.includes(c));
    if (!hasAll) {
      return { ruleName: 'adr_classes', passed: false, score: 0, message: 'Nicht alle ADR-Klassen abgedeckt' };
    }
  }

  return { ruleName: 'adr_certification', passed: true, score: 100, message: 'ADR-zertifiziert' };
}

function checkTunnelCodesRule(vehicle: any, reqs: any): RuleCheckResult {
  if (!reqs.tunnelCodesAllowed?.length) {
    return { ruleName: 'tunnel_codes', passed: true, score: 100, message: 'Keine Tunnel-Beschränkungen' };
  }

  if (!vehicle.tunnelCodes) {
    return { ruleName: 'tunnel_codes', passed: true, score: 50, message: 'Keine Tunnel-Informationen' };
  }

  return { ruleName: 'tunnel_codes', passed: true, score: 100, message: 'Tunnel-Codes kompatibel' };
}

function checkOversizeRule(vehicle: any, reqs: any): RuleCheckResult {
  if (reqs.escortVehicleRequired) {
    return { ruleName: 'escort_check', passed: true, score: 100, message: 'Begleitfahrzeug erforderlich - bitte prüfen' };
  }
  return { ruleName: 'permits_required', passed: true, score: 100, message: 'Übergröße möglich' };
}

function checkLicenseRule(driver: any, reqs: any): RuleCheckResult {
  if (!driver.licenseClass) {
    return { ruleName: 'license_check', passed: false, score: 0, message: 'Keine Führerschein-Informationen' };
  }

  const requiredClasses = reqs.driverLicenseClass;
  if (!requiredClasses.includes(driver.licenseClass)) {
    return { ruleName: 'license_check', passed: false, score: 0, message: 'Führerscheinklasse nicht passend' };
  }

  // Check expiry
  if (driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date()) {
    return { ruleName: 'license_check', passed: false, score: 0, message: 'Führerschein abgelaufen' };
  }

  return { ruleName: 'license_check', passed: true, score: 100, message: 'Führerschein ok' };
}

function checkRatingRule(driver: any, reqs: any): RuleCheckResult {
  if (driver.ratingAvg < reqs.minRating) {
    return { ruleName: 'rating_check', passed: false, score: 0, message: `Bewertung zu niedrig (${driver.ratingAvg} < ${reqs.minRating})` };
  }
  return { ruleName: 'rating_check', passed: true, score: 100, message: `Bewertung: ${driver.ratingAvg} Sterne` };
}

function checkExperienceRule(driver: any, reqs: any): RuleCheckResult {
  if (reqs.minCompletedTransports && driver.completedTransports < reqs.minCompletedTransports) {
    return { ruleName: 'experience_check', passed: false, score: 0, message: 'Zu wenig Erfahrung' };
  }
  if (reqs.internationalExperience && !driver.internationalExperience) {
    return { ruleName: 'experience_check', passed: false, score: 0, message: 'Keine internationale Erfahrung' };
  }
  return { ruleName: 'experience_check', passed: true, score: 100, message: `Erfahrung: ${driver.completedTransports} Transporte` };
}

async function checkInternationalRule(driver: any, transport: any): Promise<RuleCheckResult> {
  if (!driver.internationalExperience) {
    return { ruleName: 'international_check', passed: false, score: 0, message: 'Keine internationale Genehmigung' };
  }

  // Check country permissions
  const permissions = await db.driverPermission.findMany({
    where: { driverId: driver.id, isAllowed: true }
  });

  const allowedCountries = permissions.map(p => p.countryCode);

  if (!allowedCountries.includes(transport.deliveryAddress.country)) {
    return { ruleName: 'international_check', passed: false, score: 0, message: `Keine Genehmigung für ${transport.deliveryAddress.country}` };
  }

  return { ruleName: 'international_check', passed: true, score: 100, message: 'International erlaubt' };
}

function checkAvailabilityRule(driver: any): RuleCheckResult {
  if (!driver.isAvailable) {
    return { ruleName: 'availability_check', passed: false, score: 0, message: 'Fahrer nicht verfügbar' };
  }
  return { ruleName: 'availability_check', passed: true, score: 100, message: 'Fahrer verfügbar' };
}

function checkDocumentsRule(driver: any): RuleCheckResult {
  // Check driver card expiry
  if (driver.driverCardExpiry) {
    const expiryDate = new Date(driver.driverCardExpiry);
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { ruleName: 'documents_check', passed: false, score: 0, message: 'Fahrerkarte abgelaufen' };
    }
    if (daysUntilExpiry < 30) {
      return { ruleName: 'documents_check', passed: true, score: 70, message: `Fahrerkarte läuft in ${daysUntilExpiry} Tagen ab` };
    }
  }

  // Check ADR expiry
  if (driver.adrLicense && driver.adrExpiry) {
    const adrExpiryDate = new Date(driver.adrExpiry);
    if (adrExpiryDate < new Date()) {
      return { ruleName: 'documents_check', passed: false, score: 50, message: 'ADR-Bescheinigung abgelaufen' };
    }
  }

  return { ruleName: 'documents_check', passed: true, score: 100, message: 'Dokumente gültig' };
}
