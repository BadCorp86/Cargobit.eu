/**
 * CargoBit Booking Confirm API
 * 
 * POST /api/booking/confirm
 * 
 * This endpoint is called when a shipper confirms a job booking.
 * It creates a Stripe PaymentIntent and returns the client_secret
 * for the frontend to complete payment.
 * 
 * Flow:
 * 1. Shipper accepts offer → Frontend calls this endpoint
 * 2. PaymentIntent created with status PENDING
 * 3. Frontend uses client_secret with Stripe.js to collect payment
 * 4. Stripe webhook payment_intent.succeeded → Payment + Job updated
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPaymentIntent } from '@/services/stripe-payment.service';

// ============================================
// TYPES
// ============================================

interface ConfirmBookingRequest {
  jobId: string;
  offerId: string;
  shipperId: string;
}

interface ConfirmBookingResponse {
  success: boolean;
  message: string;
  payment?: {
    id: string;
    paymentIntentId: string;
    clientSecret: string;
    amountCents: number;
    amountEur: number;
    currency: string;
    status: string;
  };
  assignmentId?: string;
  error?: string;
}

// ============================================
// POST /api/booking/confirm
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: ConfirmBookingRequest = await request.json();
    const { jobId, offerId, shipperId } = body;

    // Validate required fields
    if (!jobId || !offerId || !shipperId) {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: 'Missing required fields',
        error: 'jobId, offerId, and shipperId are required',
      }, { status: 400 });
    }

    // Get auth context from request headers
    const authUserId = request.headers.get('x-user-id');
    if (!authUserId) {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: 'Authentication required',
        error: 'AUTH_REQUIRED',
      }, { status: 401 });
    }

    // Verify user matches shipperId
    if (authUserId !== shipperId) {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: 'Forbidden',
        error: 'User does not match shipperId',
      }, { status: 403 });
    }

    // Get offer with transport and driver details
    const offer = await db.offer.findUnique({
      where: { id: offerId },
      include: {
        transport: {
          include: {
            pickupAddress: true,
            deliveryAddress: true,
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!offer) {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: 'Offer not found',
        error: 'OFFER_NOT_FOUND',
      }, { status: 404 });
    }

    // Verify offer belongs to the job
    if (offer.transportId !== jobId) {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: 'Offer does not match job',
        error: 'OFFER_JOB_MISMATCH',
      }, { status: 400 });
    }

    // Verify user is the shipper
    if (offer.transport.shipperUserId !== shipperId) {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: 'You are not the shipper of this job',
        error: 'NOT_YOUR_JOB',
      }, { status: 403 });
    }

    // Check if offer is still pending
    if (offer.status !== 'PENDING') {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: `Offer is already ${offer.status.toLowerCase()}`,
        error: 'OFFER_NOT_PENDING',
      }, { status: 400 });
    }

    // Check if job can be booked
    if (!['CREATED', 'PUBLISHED'].includes(offer.transport.status)) {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: 'Job cannot be booked in current status',
        error: 'JOB_NOT_BOOKABLE',
      }, { status: 400 });
    }

    // Calculate amount in cents
    const amountCents = Math.round(offer.price * 100);

    // Create PaymentIntent via Stripe
    const paymentResult = await createPaymentIntent({
      jobId,
      shipperId,
      transporterId: offer.driver.userId,
      amountCents,
      currency: 'eur',
      description: `Transport: ${offer.transport.pickupAddress.city} → ${offer.transport.deliveryAddress.city}`,
      metadata: {
        offer_id: offerId,
        driver_id: offer.driverId,
        vehicle_id: offer.vehicleId,
      },
    });

    if (!paymentResult.success) {
      return NextResponse.json<ConfirmBookingResponse>({
        success: false,
        message: 'Failed to create payment intent',
        error: paymentResult.error,
      }, { status: 500 });
    }

    // Create assignment (but job stays in PUBLISHED until payment confirmed)
    const assignment = await db.assignment.create({
      data: {
        transportId: jobId,
        driverId: offer.driverId,
        vehicleId: offer.vehicleId,
        assignedBy: shipperId,
      },
    });

    // Update offer status to ACCEPTED
    await db.offer.update({
      where: { id: offerId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // Update transport status to ASSIGNED
    await db.transport.update({
      where: { id: jobId },
      data: {
        status: 'ASSIGNED',
        assignedAt: new Date(),
        agreedPrice: offer.price,
      },
    });

    // Reject other pending offers for this transport
    await db.offer.updateMany({
      where: {
        transportId: jobId,
        status: 'PENDING',
        id: { not: offerId },
      },
      data: {
        status: 'REJECTED',
        rejectionReason: 'Anderes Angebot angenommen',
        rejectedAt: new Date(),
      },
    });

    // Create notification for driver
    await db.notification.create({
      data: {
        userId: offer.driver.userId,
        type: 'OFFER_ACCEPTED',
        title: 'Angebot angenommen!',
        message: `Ihr Angebot für Transport ${jobId} wurde angenommen. Warten auf Zahlungsbestätigung.`,
        data: JSON.stringify({
          transportId: jobId,
          assignmentId: assignment.id,
          price: offer.price,
          paymentPending: true,
        }),
      },
    });

    // Log audit event
    await db.auditLog.create({
      data: {
        userId: shipperId,
        action: 'CREATE',
        entityType: 'booking',
        entityId: jobId,
        dataAfter: JSON.stringify({
          offerId,
          paymentIntentId: paymentResult.paymentIntentId,
          assignmentId: assignment.id,
          amountCents,
        }),
      },
    });

    console.log('[BOOKING] Booking confirmed:', {
      jobId,
      offerId,
      paymentIntentId: paymentResult.paymentIntentId,
      assignmentId: assignment.id,
    });

    return NextResponse.json<ConfirmBookingResponse>({
      success: true,
      message: 'Booking confirmed. Please complete payment.',
      payment: {
        id: paymentResult.paymentId!,
        paymentIntentId: paymentResult.paymentIntentId!,
        clientSecret: paymentResult.clientSecret!,
        amountCents: paymentResult.amountCents!,
        amountEur: paymentResult.amountCents! / 100,
        currency: paymentResult.currency!,
        status: paymentResult.status!,
      },
      assignmentId: assignment.id,
    });

  } catch (error: any) {
    console.error('[BOOKING] Error confirming booking:', error);
    return NextResponse.json<ConfirmBookingResponse>({
      success: false,
      message: 'Internal server error',
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}
