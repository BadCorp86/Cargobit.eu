import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ApiErrorResponse } from '@/types/transport';

// GET /api/transports/[id] - Get transport details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transport = await db.transport.findUnique({
      where: { id },
      include: {
        shipper: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true,
            rating: true,
            totalTransports: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            rating: true,
            spokenLanguages: true,
            adrCertified: true,
            internationalAllowed: true
          }
        },
        offers: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                rating: true,
                companyName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
            fileUrl: true,
            createdAt: true
          }
        }
      }
    });

    if (!transport) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Transport not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    // Parse JSON fields
    const result = {
      ...transport,
      cargoDetails: transport.cargoDetails ? JSON.parse(transport.cargoDetails) : null,
      vehicleRequirements: transport.vehicleRequirements ? JSON.parse(transport.vehicleRequirements) : null,
      driverRequirements: transport.driverRequirements ? JSON.parse(transport.driverRequirements) : null,
      internationalRequirements: transport.internationalRequirements ? JSON.parse(transport.internationalRequirements) : null,
      transitCountries: transport.transitCountries ? JSON.parse(transport.transitCountries) : null,
      currentLocation: transport.currentLocation ? JSON.parse(transport.currentLocation) : null,
      calculatedRoute: transport.calculatedRoute ? JSON.parse(transport.calculatedRoute) : null
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Get transport error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to fetch transport',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
