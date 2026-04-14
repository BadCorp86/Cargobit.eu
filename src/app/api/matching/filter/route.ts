import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FilterCandidatesRequest, FilterCandidatesResponse, Candidate, ApiErrorResponse } from '@/types/matching';

// POST /api/matching/filter - Hard filter candidates based on requirements
export async function POST(request: NextRequest) {
  try {
    const body: FilterCandidatesRequest = await request.json();

    if (!body.transportId) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required field: transportId',
        code: 'MISSING_TRANSPORT_ID'
      }, { status: 400 });
    }

    // Get transport with addresses
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

    // Merge requirements from body and transport
    const vehicleReqs = body.requirements.vehicle || 
      (transport.transportDetail?.vehicleRequirements ? JSON.parse(transport.transportDetail.vehicleRequirements) : {});
    const driverReqs = body.requirements.driver || 
      (transport.transportDetail?.driverRequirements ? JSON.parse(transport.transportDetail.driverRequirements) : {});
    const intlReqs = body.requirements.international || 
      (transport.transportDetail?.internationalRequirements ? JSON.parse(transport.transportDetail.internationalRequirements) : {});

    const isInternational = transport.pickupAddress.country !== transport.deliveryAddress.country;

    // ========== FIND ALL DRIVERS ==========

    const drivers = await db.driver.findMany({
      where: {
        user: { status: 'ACTIVE' }
      },
      include: {
        user: true,
        driverVehicles: {
          include: {
            vehicle: { where: { status: 'ACTIVE' } }
          }
        },
        driverPermissions: { where: { isAllowed: true } }
      }
    });

    // ========== APPLY FILTERS ==========

    const candidates: Candidate[] = [];
    let vehicleTypeMatch = 0;
    let locationMatch = 0;
    let requirementMatch = 0;
    let internationalMatch = 0;

    for (const driver of drivers) {
      // Check each vehicle
      for (const dv of driver.driverVehicles) {
        const vehicle = dv.vehicle;
        let passed = true;
        const warnings: string[] = [];
        const matchReasons: string[] = [];

        // ===== VEHICLE TYPE FILTER =====
        if (vehicleReqs.vehicleTypes?.length) {
          if (!vehicleReqs.vehicleTypes.includes(vehicle.type)) {
            passed = false;
            continue;
          }
          vehicleTypeMatch++;
          matchReasons.push('Fahrzeugtyp: ✓');
        }

        // ===== PAYLOAD FILTER =====
        if (vehicleReqs.minPayload_kg) {
          if ((vehicle.maxPayloadKg || 0) < vehicleReqs.minPayload_kg) {
            passed = false;
            continue;
          }
          matchReasons.push('Nutzlast: ✓');
        }

        // ===== VOLUME FILTER =====
        if (vehicleReqs.minVolume_m3) {
          if ((vehicle.volumeM3 || 0) < vehicleReqs.minVolume_m3) {
            passed = false;
            continue;
          }
          matchReasons.push('Volumen: ✓');
        }

        // ===== DIMENSIONS FILTER =====
        if (vehicleReqs.minLength_m && vehicle.lengthM) {
          if (vehicle.lengthM < vehicleReqs.minLength_m) {
            passed = false;
            continue;
          }
        }

        if (vehicleReqs.minHeight_m && vehicle.heightM) {
          if (vehicle.heightM < vehicleReqs.minHeight_m) {
            passed = false;
            continue;
          }
        }

        // ===== ADR FILTER =====
        if (vehicleReqs.adrRequired) {
          if (!vehicle.adrApproved) {
            passed = false;
            continue;
          }

          // Check specific ADR classes if required
          if (vehicleReqs.adrClasses?.length && vehicle.adrClasses) {
            const vehicleAdrClasses = JSON.parse(vehicle.adrClasses);
            const hasAllClasses = vehicleReqs.adrClasses.every(
              (c: string) => vehicleAdrClasses.includes(c)
            );
            if (!hasAllClasses) {
              passed = false;
              continue;
            }
          }
          matchReasons.push('ADR: ✓');
        }

        // ===== COOLING FILTER =====
        if (vehicleReqs.coolingRequired) {
          if (!vehicle.coolingAvailable) {
            passed = false;
            continue;
          }
          
          // Check temperature range
          if (vehicleReqs.temperatureRange) {
            matchReasons.push(`Temperatur: ${vehicleReqs.temperatureRange.min}°C bis ${vehicleReqs.temperatureRange.max}°C`);
          } else {
            matchReasons.push('Kühlung: ✓');
          }
        }

        // ===== CRANE/LIFT FILTER =====
        if (vehicleReqs.craneRequired && !vehicle.hasCrane) {
          passed = false;
          continue;
        }

        if (vehicleReqs.liftRequired && !vehicle.hasLift) {
          passed = false;
          continue;
        }

        // ===== DRIVER REQUIREMENTS =====
        requirementMatch++;

        // ADR License
        if (driverReqs.adrLicenseRequired && !driver.adrLicense) {
          passed = false;
          continue;
        }

        // Rating
        if (driverReqs.minRating && driver.ratingAvg < driverReqs.minRating) {
          passed = false;
          continue;
        }

        // Completed transports
        if (driverReqs.minCompletedTransports && 
            driver.completedTransports < driverReqs.minCompletedTransports) {
          passed = false;
          continue;
        }

        // Damage history
        if (driverReqs.maxDamageCount !== undefined && 
            driver.damageCount > driverReqs.maxDamageCount) {
          passed = false;
          continue;
        }

        // ===== INTERNATIONAL FILTER =====
        if (isInternational) {
          internationalMatch++;

          // Check driver international permission
          if (!driver.internationalExperience) {
            passed = false;
            continue;
          }

          // Check country permissions
          const allowedCountries = driver.driverPermissions
            .filter(p => p.isAllowed)
            .map(p => p.countryCode);

          // Target country
          if (!allowedCountries.includes(transport.deliveryAddress.country)) {
            passed = false;
            continue;
          }

          // Transit countries
          if (intlReqs.transitCountries?.length) {
            const transitOk = intlReqs.transitCountries.every(
              (c: string) => allowedCountries.includes(c)
            );
            if (!transitOk) {
              passed = false;
              continue;
            }
          }

          // Tunnel codes
          if (vehicleReqs.tunnelCodesAllowed?.length && vehicle.tunnelCodes) {
            matchReasons.push('Tunnelcode: ✓');
          }

          matchReasons.push('International: ✓');
        }

        // ===== LOCATION FILTER =====
        locationMatch++;

        // ===== AVAILABILITY CHECK =====
        if (!body.timeWindow && !driver.isAvailable) {
          passed = false;
        }

        // If all filters passed, add to candidates
        if (passed) {
          candidates.push({
            driverId: driver.id,
            vehicleId: vehicle.id,
            score: 0, // Score calculated in rank step
            matchReasons,
            warnings
          });
        }
      }
    }

    return NextResponse.json<FilterCandidatesResponse>({
      transportId: body.transportId,
      candidates,
      totalFound: candidates.length,
      filterStats: {
        vehicleTypeMatch,
        locationMatch,
        requirementMatch,
        internationalMatch
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Filter candidates error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to filter candidates',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
