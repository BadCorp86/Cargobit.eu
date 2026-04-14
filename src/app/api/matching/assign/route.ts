import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AutoAssignRequest, AutoAssignResponse, ApiErrorResponse } from '@/types/matching';

// POST /api/matching/assign - Assign driver to transport
export async function POST(request: NextRequest) {
  try {
    const body: AutoAssignRequest = await request.json();

    if (!body.transportId || !body.driverId) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required fields: transportId, driverId',
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

    // Check if already assigned
    const existingAssignment = await db.assignment.findUnique({
      where: { transportId: body.transportId }
    });

    if (existingAssignment) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ConflictError',
        message: 'Transport already assigned',
        code: 'ALREADY_ASSIGNED'
      }, { status: 409 });
    }

    // Get driver
    const driver = await db.driver.findUnique({
      where: { id: body.driverId },
      include: {
        user: {
          include: {
            wallet: true,
            securityFlags: { where: { active: true } }
          }
        },
        driverVehicles: body.vehicleId 
          ? { where: { vehicleId: body.vehicleId } }
          : { where: { isPrimary: true }, take: 1 }
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
    const vehicleId = body.vehicleId || vehicle.id;

    // ===== FRAUD CHECK =====
    if (!body.skipFraudCheck) {
      const criticalFlags = driver.user.securityFlags.filter(
        f => f.severity === 'CRITICAL' || f.severity === 'HIGH'
      );

      if (criticalFlags.length > 0) {
        return NextResponse.json<AutoAssignResponse>({
          transportId: body.transportId,
          driverId: body.driverId,
          vehicleId,
          status: 'rejected',
          rejectionReason: 'Sicherheits-Flags aktiv: ' + criticalFlags.map(f => f.type).join(', ')
        }, { status: 200 });
      }
    }

    // ===== INTERNATIONAL CHECK =====
    const isInternational = transport.pickupAddress.country !== transport.deliveryAddress.country;
    
    if (isInternational) {
      const driverPermissions = await db.driverPermission.findMany({
        where: { driverId: driver.id, isAllowed: true }
      });

      const allowedCountries = driverPermissions.map(p => p.countryCode);

      if (!allowedCountries.includes(transport.deliveryAddress.country)) {
        return NextResponse.json<AutoAssignResponse>({
          transportId: body.transportId,
          driverId: body.driverId,
          vehicleId,
          status: 'rejected',
          rejectionReason: `Keine Genehmigung für ${transport.deliveryAddress.country}`
        }, { status: 200 });
      }

      // Check transit countries
      if (transport.transportDetail?.internationalRequirements) {
        const intlReqs = JSON.parse(transport.transportDetail.internationalRequirements);
        if (intlReqs.transitCountries) {
          const missingCountries = intlReqs.transitCountries.filter(
            (c: string) => !allowedCountries.includes(c)
          );
          if (missingCountries.length > 0) {
            return NextResponse.json<AutoAssignResponse>({
              transportId: body.transportId,
              driverId: body.driverId,
              vehicleId,
              status: 'rejected',
              rejectionReason: `Fehlende Genehmigungen für: ${missingCountries.join(', ')}`
            }, { status: 200 });
          }
        }
      }
    }

    // ===== CREATE ASSIGNMENT =====

    // Use transaction for atomic operation
    const assignment = await db.$transaction(async (tx) => {
      // Create assignment
      const newAssignment = await tx.assignment.create({
        data: {
          transportId: body.transportId,
          driverId: driver.id,
          vehicleId,
          assignedBy: transport.shipperUserId
        }
      });

      // Update transport status
      await tx.transport.update({
        where: { id: body.transportId },
        data: {
          status: 'ASSIGNED',
          assignedAt: new Date(),
          driverId: driver.userId
        }
      });

      // Create status history entry
      await tx.transportStatusHistory.create({
        data: {
          transportId: body.transportId,
          status: 'ASSIGNED',
          note: `Fahrer ${driver.user.firstName} ${driver.user.lastName} zugewiesen`
        }
      });

      // Update matching session if exists
      const activeSession = await tx.matchingSession.findFirst({
        where: { transportId: body.transportId, status: 'RUNNING' }
      });

      if (activeSession) {
        await tx.matchingSession.update({
          where: { id: activeSession.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });

        // Update candidate status
        await tx.matchingCandidate.updateMany({
          where: {
            matchingSessionId: activeSession.id,
            driverId: driver.id
          },
          data: { status: 'ACCEPTED' }
        });

        // Mark other candidates as expired
        await tx.matchingCandidate.updateMany({
          where: {
            matchingSessionId: activeSession.id,
            driverId: { not: driver.id },
            status: 'PENDING'
          },
          data: { status: 'EXPIRED' }
        });
      }

      return newAssignment;
    });

    // ===== CREATE ESCROW (if wallet exists) =====
    let escrowCreated = false;
    let escrowAmount = 0;

    if (transport.agreedPrice && driver.user.wallet) {
      escrowAmount = transport.agreedPrice;
      escrowCreated = true;
      
      // In production, this would create an escrow transaction
      // await createEscrow(transport, driver.user.wallet, escrowAmount);
    }

    return NextResponse.json<AutoAssignResponse>({
      transportId: body.transportId,
      driverId: driver.id,
      vehicleId,
      status: 'assigned',
      escrowCreated,
      escrowAmount
    }, { status: 200 });

  } catch (error) {
    console.error('Assign driver error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to assign driver',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
