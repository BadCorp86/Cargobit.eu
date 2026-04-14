import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StartMatchingRequest, StartMatchingResponse, ApiErrorResponse } from '@/types/matching';

// POST /api/matching/start - Start matching for a transport
export async function POST(request: NextRequest) {
  try {
    const body: StartMatchingRequest = await request.json();
    
    // Validate
    if (!body.transportId) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required field: transportId',
        code: 'MISSING_TRANSPORT_ID'
      }, { status: 400 });
    }

    // Get transport with details
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

    // Check if matching session already exists
    const existingSession = await db.matchingSession.findFirst({
      where: {
        transportId: body.transportId,
        status: { in: ['STARTED', 'RUNNING'] }
      }
    });

    if (existingSession) {
      const candidates = await db.matchingCandidate.count({
        where: { matchingSessionId: existingSession.id }
      });
      
      return NextResponse.json<StartMatchingResponse>({
        matchingId: existingSession.id,
        status: 'started',
        estimatedCandidates: candidates
      });
    }

    // Create matching session
    const matchingSession = await db.matchingSession.create({
      data: {
        transportId: body.transportId,
        status: 'STARTED',
        autoAssign: body.autoAssign || false
      }
    });

    // Check if international
    const isInternational = transport.pickupAddress.country !== transport.deliveryAddress.country;

    // Parse requirements
    const vehicleRequirements = transport.transportDetail?.vehicleRequirements 
      ? JSON.parse(transport.transportDetail.vehicleRequirements) 
      : null;
    const driverRequirements = transport.transportDetail?.driverRequirements 
      ? JSON.parse(transport.transportDetail.driverRequirements) 
      : null;
    const internationalRequirements = transport.transportDetail?.internationalRequirements 
      ? JSON.parse(transport.transportDetail.internationalRequirements) 
      : null;

    // ========== PHASE 1: FIND DRIVERS ==========
    
    // Find all active drivers with their vehicles
    const drivers = await db.driver.findMany({
      where: {
        isAvailable: true,
        user: {
          status: 'ACTIVE'
        }
      },
      include: {
        user: true,
        driverVehicles: {
          include: {
            vehicle: {
              where: { status: 'ACTIVE' }
            }
          }
        },
        driverPermissions: {
          where: { isAllowed: true }
        }
      },
      take: body.maxCandidates || 100
    });

    // ========== PHASE 2: MATCH & SCORE ==========
    
    const matchedCandidates: Array<{
      driverId: string;
      vehicleId: string;
      score: number;
      reasons: string[];
      hardFilterPassed: boolean;
      softRulesPassed: boolean;
      fraudSafe: boolean;
      internationalAllowed: boolean;
    }> = [];

    for (const driver of drivers) {
      for (const dv of driver.driverVehicles) {
        const vehicle = dv.vehicle;
        let score = 0;
        const reasons: string[] = [];
        let hardFilterPassed = true;
        const softRulesPassed = true;
        let fraudSafe = true;
        let internationalAllowed = true;

        // ===== HARD FILTER: VEHICLE TYPE =====
        if (vehicleRequirements?.vehicleTypes?.length) {
          if (!vehicleRequirements.vehicleTypes.includes(vehicle.type)) {
            hardFilterPassed = false;
            continue;
          }
          score += 25;
          reasons.push('Fahrzeugtyp passt');
        }

        // ===== HARD FILTER: PAYLOAD =====
        if (vehicleRequirements?.minPayload_kg) {
          if ((vehicle.maxPayloadKg || 0) < vehicleRequirements.minPayload_kg) {
            hardFilterPassed = false;
            continue;
          }
          score += 10;
        }

        // ===== HARD FILTER: VOLUME =====
        if (vehicleRequirements?.minVolume_m3) {
          if ((vehicle.volumeM3 || 0) < vehicleRequirements.minVolume_m3) {
            hardFilterPassed = false;
            continue;
          }
          score += 10;
        }

        // ===== HARD FILTER: ADR =====
        if (vehicleRequirements?.adrRequired) {
          if (!vehicle.adrApproved) {
            hardFilterPassed = false;
            continue;
          }
          // Check specific ADR classes
          if (vehicleRequirements.adrClasses?.length && vehicle.adrClasses) {
            const vehicleAdrClasses = JSON.parse(vehicle.adrClasses);
            const hasAllClasses = vehicleRequirements.adrClasses.every(
              (c: string) => vehicleAdrClasses.includes(c)
            );
            if (!hasAllClasses) {
              hardFilterPassed = false;
              continue;
            }
          }
          score += 15;
          reasons.push('ADR-zertifiziert');
        }

        // ===== HARD FILTER: COOLING =====
        if (vehicleRequirements?.coolingRequired) {
          if (!vehicle.coolingAvailable) {
            hardFilterPassed = false;
            continue;
          }
          score += 15;
          reasons.push('Kühlung verfügbar');
        }

        // ===== HARD FILTER: INTERNATIONAL =====
        if (isInternational) {
          // Check driver international permission
          if (!driver.internationalExperience) {
            internationalAllowed = false;
            hardFilterPassed = false;
            continue;
          }

          // Check country permissions
          const allowedCountries = driver.driverPermissions
            .filter(p => p.isAllowed)
            .map(p => p.countryCode);
          
          if (!allowedCountries.includes(transport.deliveryAddress.country)) {
            internationalAllowed = false;
            hardFilterPassed = false;
            continue;
          }
          
          // Check transit countries
          if (internationalRequirements?.transitCountries) {
            const transitOk = internationalRequirements.transitCountries.every(
              (c: string) => allowedCountries.includes(c)
            );
            if (!transitOk) {
              internationalAllowed = false;
              hardFilterPassed = false;
              continue;
            }
          }
          
          score += 20;
          reasons.push('Internationale Genehmigung');
        }

        // ===== SOFT FILTER: DRIVER RATING =====
        if (driver.ratingAvg >= 4.5) {
          score += 10;
          reasons.push('Top Bewertung');
        }

        // ===== SOFT FILTER: EXPERIENCE =====
        if (driver.completedTransports >= 50) {
          score += 5;
          reasons.push('Erfahrener Fahrer');
        }

        // ===== SOFT FILTER: LANGUAGE =====
        const spokenLanguages = driver.spokenLanguages ? JSON.parse(driver.spokenLanguages) : [];
        if (driverRequirements?.languages?.length) {
          const hasLang = driverRequirements.languages.some((l: string) => spokenLanguages.includes(l));
          if (hasLang) {
            score += 10;
            reasons.push('Sprachkenntnisse');
          }
        }

        // ===== FRAUD CHECK =====
        const securityFlags = await db.securityFlag.findFirst({
          where: {
            userId: driver.userId,
            active: true,
            severity: { in: ['HIGH', 'CRITICAL'] }
          }
        });
        if (securityFlags) {
          fraudSafe = false;
          score = 0;
        }

        if (hardFilterPassed) {
          matchedCandidates.push({
            driverId: driver.id,
            vehicleId: vehicle.id,
            score: Math.min(100, score),
            reasons,
            hardFilterPassed,
            softRulesPassed,
            fraudSafe,
            internationalAllowed
          });
        }
      }
    }

    // Sort by score
    matchedCandidates.sort((a, b) => b.score - a.score);

    // ========== PHASE 3: STORE RESULTS ==========

    const topCandidates = matchedCandidates.slice(0, 50);

    for (const candidate of topCandidates) {
      await db.matchingCandidate.create({
        data: {
          matchingSessionId: matchingSession.id,
          driverId: candidate.driverId,
          vehicleId: candidate.vehicleId,
          hardFilterPassed: candidate.hardFilterPassed,
          softRulesPassed: candidate.softRulesPassed,
          fraudSafe: candidate.fraudSafe,
          internationalAllowed: candidate.internationalAllowed,
          score: candidate.score,
          scoreBreakdown: JSON.stringify({ reasons: candidate.reasons }),
          status: 'PENDING',
          expiresAt: new Date(Date.now() + (body.expireInMinutes || 60) * 60 * 1000)
        }
      }).catch(() => {});
    }

    // Update matching session status
    await db.matchingSession.update({
      where: { id: matchingSession.id },
      data: { status: 'RUNNING' }
    });

    // Update transport status
    await db.transport.update({
      where: { id: body.transportId },
      data: { status: 'PUBLISHED' }
    });

    // Create status history
    await db.transportStatusHistory.create({
      data: {
        transportId: body.transportId,
        status: 'PUBLISHED',
        note: 'Matching gestartet'
      }
    });

    // ========== PHASE 4: AUTO-ASSIGN IF ENABLED ==========
    
    let assigned = false;
    if (body.autoAssign && topCandidates.length > 0 && topCandidates[0].score >= 80 && topCandidates[0].fraudSafe) {
      const bestMatch = topCandidates[0];
      
      // Create assignment
      await db.assignment.create({
        data: {
          transportId: body.transportId,
          driverId: bestMatch.driverId,
          vehicleId: bestMatch.vehicleId,
          assignedBy: transport.shipperUserId
        }
      });

      // Update transport
      await db.transport.update({
        where: { id: body.transportId },
        data: {
          status: 'ASSIGNED',
          assignedAt: new Date()
        }
      });

      // Update matching session
      await db.matchingSession.update({
        where: { id: matchingSession.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });

      // Update candidate status
      await db.matchingCandidate.updateMany({
        where: {
          matchingSessionId: matchingSession.id,
          driverId: bestMatch.driverId
        },
        data: { status: 'ACCEPTED' }
      });

      assigned = true;
    }

    return NextResponse.json<StartMatchingResponse>({
      matchingId: matchingSession.id,
      status: matchedCandidates.length > 0 ? 'started' : 'no_candidates',
      estimatedCandidates: matchedCandidates.length,
      estimatedCompletion: new Date(Date.now() + 30000).toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Start matching error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to start matching',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
