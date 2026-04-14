import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { InternationalCheckRequest, InternationalCheckResponse, BorderCheck, ApiErrorResponse } from '@/types/matching';

// POST /api/matching/international/check - Check international transport requirements
export async function POST(request: NextRequest) {
  try {
    const body: InternationalCheckRequest = await request.json();

    if (!body.transportId || !body.driverId || !body.vehicleId) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required fields: transportId, driverId, vehicleId',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Get transport with route details
    const transport = await db.transport.findUnique({
      where: { id: body.transportId },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        transportDetail: true
      }
    });

    if (!transport) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Transport not found',
        code: 'TRANSPORT_NOT_FOUND'
      }, { status: 404 });
    }

    // Get driver with permissions
    const driver = await db.driver.findUnique({
      where: { id: body.driverId },
      include: {
        driverPermissions: true,
        user: {
          include: {
            verifications: true
          }
        }
      }
    });

    if (!driver) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Driver not found',
        code: 'DRIVER_NOT_FOUND'
      }, { status: 404 });
    }

    // Get vehicle
    const vehicle = await db.vehicle.findUnique({
      where: { id: body.vehicleId }
    });

    if (!vehicle) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Vehicle not found',
        code: 'VEHICLE_NOT_FOUND'
      }, { status: 404 });
    }

    const issues: string[] = [];
    const borderChecks: BorderCheck[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Get transit countries
    const transitCountries = transport.transportDetail?.internationalRequirements 
      ? JSON.parse(transport.transportDetail.internationalRequirements).transitCountries || []
      : [];
    
    // Build route countries
    const routeCountries = [
      transport.pickupAddress.country,
      ...transitCountries,
      transport.deliveryAddress.country
    ];

    // ===== CHECK DRIVER PERMISSIONS =====
    
    const driverAllowedCountries = driver.driverPermissions
      .filter(p => p.isAllowed)
      .map(p => p.countryCode);

    const missingPermissions = routeCountries.filter(
      country => !driverAllowedCountries.includes(country)
    );

    if (missingPermissions.length > 0) {
      issues.push(`Fehlende Ländergenehmigungen: ${missingPermissions.join(', ')}`);
      riskLevel = 'high';
    }

    // ===== CHECK BORDER CROSSINGS =====

    for (let i = 0; i < routeCountries.length - 1; i++) {
      const fromCountry = routeCountries[i];
      const toCountry = routeCountries[i + 1];

      // Get border crossing info
      const borderCrossing = await db.borderCrossing.findFirst({
        where: {
          fromCountry,
          toCountry,
          isActive: true
        }
      });

      const borderCheck: BorderCheck = {
        fromCountry,
        toCountry,
        crossingPoint: borderCrossing?.crossingName,
        allowed: true,
        issues: [],
        adrAllowed: borderCrossing?.adrAllowed ?? true
      };

      // Check ADR compatibility
      if (vehicle.adrApproved && borderCrossing && !borderCrossing.adrAllowed) {
        borderCheck.allowed = false;
        borderCheck.issues.push('ADR nicht erlaubt an diesem Grenzübergang');
        borderCheck.adrAllowed = false;
      }

      // Check tunnel codes
      if (borderCrossing?.tunnelCode && vehicle.tunnelCodes) {
        const vehicleTunnelCodes = JSON.parse(vehicle.tunnelCodes);
        if (!vehicleTunnelCodes.includes(borderCrossing.tunnelCode)) {
          borderCheck.tunnelRestrictions = [`Tunnelcode ${borderCrossing.tunnelCode} erforderlich`];
          borderCheck.issues.push('Tunnelcode nicht kompatibel');
        }
      }

      // Check if visa required
      const driverPermission = driver.driverPermissions.find(
        p => p.countryCode === toCountry
      );
      
      if (driverPermission?.visaRequired && !driverPermission.visaValid) {
        borderCheck.allowed = false;
        borderCheck.issues.push(`Visum für ${toCountry} erforderlich aber nicht gültig`);
        issues.push(`Visum für ${toCountry} erforderlich`);
      }

      borderChecks.push(borderCheck);

      if (!borderCheck.allowed) {
        riskLevel = 'high';
      }
    }

    // ===== CHECK DOCUMENTS =====

    const driverVerifications = driver.user.verifications;
    const requiredDocs: string[] = ['KYC'];
    const presentDocs: string[] = [];

    // KYC
    const kycVerification = driverVerifications.find(v => v.type === 'KYC' && v.status === 'APPROVED');
    if (kycVerification) presentDocs.push('KYC');

    // Driver license
    const licenseVerification = driverVerifications.find(v => v.type === 'DRIVER_LICENSE' && v.status === 'APPROVED');
    requiredDocs.push('DRIVER_LICENSE');
    if (licenseVerification) presentDocs.push('DRIVER_LICENSE');

    // ADR if needed
    if (vehicle.adrApproved) {
      requiredDocs.push('ADR');
      const adrVerification = driverVerifications.find(v => v.type === 'ADR' && v.status === 'APPROVED');
      if (adrVerification) presentDocs.push('ADR');
    }

    // International documents
    if (routeCountries.some(c => !['DE', 'AT', 'CH'].includes(c))) {
      requiredDocs.push('CMR_INSURANCE');
    }

    const missingDocs = requiredDocs.filter(doc => !presentDocs.includes(doc));

    // ===== CHECK TOLL SYSTEMS =====

    const tollSystems: InternationalCheckResponse['tollSystems'] = [];

    for (const country of routeCountries) {
      const tollSystem = await db.tollSystem.findFirst({
        where: { countryCode: country, isActive: true }
      });

      if (tollSystem) {
        let estimated = 0;
        
        // Estimate toll based on system type
        if (tollSystem.systemType === 'DISTANCE' && transport.distanceKm) {
          const rate = tollSystem.euro6Rate || tollSystem.euro5Rate || 0.15;
          estimated = transport.distanceKm * rate;
        } else if (tollSystem.systemType === 'VIGNETTE') {
          estimated = tollSystem.vignetteWeekly || tollSystem.vignetteMonthly || 0;
        }

        tollSystems.push({
          country: country,
          system: tollSystem.systemName,
          estimated: Math.round(estimated * 100) / 100
        });
      }
    }

    // ===== CHECK TUNNEL CODES =====

    const tunnelCodes = {
      required: [] as string[],
      vehicle: vehicle.tunnelCodes ? JSON.parse(vehicle.tunnelCodes) : [],
      compatible: true
    };

    // Get required tunnel codes from borders
    for (const border of borderChecks) {
      if (border.tunnelRestrictions) {
        tunnelCodes.required.push(...border.tunnelRestrictions);
      }
    }

    // ===== DETERMINE OVERALL ALLOWED STATUS =====

    const allowed = issues.length === 0 && 
                    missingDocs.length === 0 && 
                    borderChecks.every(b => b.allowed);

    if (missingDocs.length > 0) {
      issues.push(`Fehlende Dokumente: ${missingDocs.join(', ')}`);
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }

    return NextResponse.json<InternationalCheckResponse>({
      allowed,
      issues,
      borderChecks,
      documents: {
        required: requiredDocs,
        present: presentDocs,
        missing: missingDocs
      },
      tollSystems,
      tunnelCodes,
      riskLevel
    }, { status: 200 });

  } catch (error) {
    console.error('International check error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to perform international check',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
