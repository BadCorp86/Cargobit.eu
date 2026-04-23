/**
 * CargoBit Jobs API Routes
 * POST   /api/jobs          - Create new job
 * GET    /api/jobs          - List user's jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobsService, type CreateJobInput, type JobStatus } from '@/services/jobs.service';

// ============================================
// GET /api/jobs - List jobs
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Get user from auth (simplified - use actual auth)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as 'shipper' | 'transporter' || 'shipper';
    const status = searchParams.get('status') as JobStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const result = await jobsService.getJobsForUser(userId, role, {
      status: status ?? undefined,
      limit,
      offset,
    });
    
    return NextResponse.json({
      jobs: result.jobs,
      total: result.total,
      limit,
      offset,
    });
    
  } catch (error: any) {
    console.error('[API] GET /jobs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/jobs - Create job
// ============================================

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'pickupAddressId',
      'deliveryAddressId',
      'pickupDatetime',
      'transportType',
    ];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    const input: CreateJobInput = {
      shipperUserId: userId,
      shipperCompanyId: body.shipperCompanyId,
      pickupAddressId: body.pickupAddressId,
      deliveryAddressId: body.deliveryAddressId,
      pickupDatetime: new Date(body.pickupDatetime),
      pickupTimeFrom: body.pickupTimeFrom,
      pickupTimeTo: body.pickupTimeTo,
      deliveryDatetime: body.deliveryDatetime ? new Date(body.deliveryDatetime) : undefined,
      deliveryTimeFrom: body.deliveryTimeFrom,
      deliveryTimeTo: body.deliveryTimeTo,
      description: body.description,
      weightKg: body.weightKg,
      volumeM3: body.volumeM3,
      transportType: body.transportType,
      shipperBudget: body.shipperBudget,
      currency: body.currency,
      isInternational: body.isInternational,
      transitCountries: body.transitCountries,
      vehicleRequirements: body.vehicleRequirements,
      driverRequirements: body.driverRequirements,
      specialRequirements: body.specialRequirements,
    };
    
    const result = await jobsService.createJob(input);
    
    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[API] POST /jobs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create job' },
      { status: 500 }
    );
  }
}
