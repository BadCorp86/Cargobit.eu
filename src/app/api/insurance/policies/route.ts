import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/insurance/policies
 * 
 * Get all policies for a customer or order
 * 
 * Query Parameters:
 * - customerId: string (optional) - Filter by customer ID
 * - orderId: string (optional) - Filter by order ID
 * - status: string (optional) - Filter by status (active, expired, cancelled)
 * - limit: number (optional) - Number of results (default: 20)
 * - offset: number (optional) - Offset for pagination
 * 
 * Response:
 * - policies: array - List of policies
 * - total: number - Total count
 * - limit: number - Applied limit
 * - offset: number - Applied offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const customerId = searchParams.get('customerId');
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Mock policies data
    const allPolicies = [
      {
        policyId: 'p_001',
        orderId: 'TR-12345',
        customerId: 'cust_123',
        provider: 'Allianz',
        premium: 24.90,
        commission: 3.74,
        coverage: 50000,
        status: 'active',
        tier: 'standard',
        createdAt: '2024-04-15T10:30:00Z',
        validFrom: '2024-04-15T10:30:00Z',
        validUntil: '2024-05-15T10:30:00Z',
        policyNumber: 'CB-2024-A1B2C3D4',
      },
      {
        policyId: 'p_002',
        orderId: 'TR-12346',
        customerId: 'cust_123',
        provider: 'HDI',
        premium: 14.90,
        commission: 2.68,
        coverage: 25000,
        status: 'active',
        tier: 'basis',
        createdAt: '2024-04-14T14:20:00Z',
        validFrom: '2024-04-14T14:20:00Z',
        validUntil: '2024-05-14T14:20:00Z',
        policyNumber: 'CB-2024-E5F6G7H8',
      },
      {
        policyId: 'p_003',
        orderId: 'TR-12347',
        customerId: 'cust_456',
        provider: 'Allianz',
        premium: 49.90,
        commission: 5.99,
        coverage: 100000,
        status: 'expired',
        tier: 'premium',
        createdAt: '2024-03-15T09:00:00Z',
        validFrom: '2024-03-15T09:00:00Z',
        validUntil: '2024-04-15T09:00:00Z',
        policyNumber: 'CB-2024-I9J0K1L2',
      },
      {
        policyId: 'p_004',
        orderId: 'TR-12348',
        customerId: 'cust_123',
        provider: 'AXA',
        premium: 24.90,
        commission: 3.74,
        coverage: 50000,
        status: 'cancelled',
        tier: 'standard',
        createdAt: '2024-04-10T16:45:00Z',
        validFrom: '2024-04-10T16:45:00Z',
        validUntil: '2024-05-10T16:45:00Z',
        policyNumber: 'CB-2024-M3N4O5P6',
        cancelledAt: '2024-04-11T10:00:00Z',
        cancellationReason: 'Order cancelled by customer',
      },
    ];

    // Apply filters
    let filteredPolicies = [...allPolicies];

    if (customerId) {
      filteredPolicies = filteredPolicies.filter(p => p.customerId === customerId);
    }

    if (orderId) {
      filteredPolicies = filteredPolicies.filter(p => p.orderId === orderId);
    }

    if (status) {
      filteredPolicies = filteredPolicies.filter(p => p.status === status);
    }

    // Apply pagination
    const total = filteredPolicies.length;
    const paginatedPolicies = filteredPolicies.slice(offset, offset + limit);

    // Add PDF URLs
    const policiesWithUrls = paginatedPolicies.map(p => ({
      ...p,
      pdfUrl: `https://api.cargobit.io/insurance/policies/${p.policyId}/pdf`,
    }));

    return NextResponse.json({
      policies: policiesWithUrls,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });

  } catch (error) {
    console.error('Policies fetch error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler beim Abrufen der Policen',
        code: 'POLICIES_FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}
