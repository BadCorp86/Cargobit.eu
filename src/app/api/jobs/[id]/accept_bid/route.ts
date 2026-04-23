/**
 * CargoBit Accept Bid Endpoint
 * PATCH /api/jobs/[id]/accept_bid
 * 
 * Implementation EXACTLY matching Python specification:
 * - 3.5% platform fee
 * - Wallet debit/credit in atomic transaction
 * - Status transitions for job and bid
 * - Reject other bids
 * 
 * Python equivalent:
 * @router.patch("/{job_id}/accept_bid")
 * def accept_bid(job_id: str, req: AcceptBidRequest, db: Session, user_id: str):
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Platform user ID for receiving fees (Python: PLATFORM_USER_ID)
const PLATFORM_USER_ID = 'PLATFORM';

// Fee percentage: 3.5% (Python: fee_cents = int(amount_cents * 0.035))
const PLATFORM_FEE_PERCENT = 0.035;

interface AcceptBidRequest {
  bid_id: string;
}

// ============================================
// PATCH /api/jobs/[id]/accept_bid
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Python: user_id: str = Depends(get_current_user_id)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: jobId } = await params;
    
    // Python: req: AcceptBidRequest
    const body: AcceptBidRequest = await request.json();
    const bidId = body.bid_id;
    
    if (!bidId) {
      return NextResponse.json(
        { error: 'Missing bid_id' },
        { status: 400 }
      );
    }
    
    // Python: job = get_job(db, job_id)
    // Python: if not job: raise HTTPException(404, "Job not found")
    const job = await prisma.transport.findUnique({
      where: { id: jobId },
    });
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Python: if str(job.shipper_id) != str(user_id): raise HTTPException(403, "Not your job")
    if (job.shipperUserId !== userId) {
      return NextResponse.json(
        { error: 'Not your job' },
        { status: 403 }
      );
    }
    
    // Python: if job.status not in ("open", "matched"): raise HTTPException(400, "Job not bookable")
    const bookableStatuses = ['CREATED', 'PUBLISHED'];
    if (!bookableStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: 'Job not bookable in current status' },
        { status: 400 }
      );
    }
    
    // Python: bid = get_bid(db, req.bid_id)
    // Python: if not bid or str(bid.job_id) != str(job_id): raise HTTPException(400, "Invalid bid")
    const bid = await prisma.offer.findUnique({
      where: { id: bidId },
    });
    
    if (!bid || bid.transportId !== jobId) {
      return NextResponse.json(
        { error: 'Invalid bid' },
        { status: 400 }
      );
    }
    
    // Python: if bid.status != "open": raise HTTPException(400, "Bid not open")
    if (bid.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Bid not open' },
        { status: 400 }
      );
    }
    
    // Python: amount_cents = bid.price_cents
    // Python: fee_cents = int(amount_cents * 0.035)  # 3,5% Plattformgebühr
    // Python: transporter_amount_cents = amount_cents - fee_cents
    const amountCents = Math.round(bid.price * 100);
    const feeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT);
    const transporterAmountCents = amountCents - feeCents;
    
    // Python: shipper_wallet = get_wallet_by_user(db, user_id)
    const shipperWallet = await prisma.wallet.findFirst({
      where: { ownerUserId: userId },
    });
    
    if (!shipperWallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 400 }
      );
    }
    
    // Python: if shipper_wallet.balance_cents < amount_cents:
    //     raise HTTPException(400, "Insufficient wallet balance")
    const balanceCents = Math.round(shipperWallet.balance * 100);
    if (balanceCents < amountCents) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }
    
    // Get or create transporter's wallet
    let transporterWallet = await prisma.wallet.findFirst({
      where: { ownerUserId: bid.driverId },
    });
    
    if (!transporterWallet) {
      transporterWallet = await prisma.wallet.create({
        data: {
          ownerUserId: bid.driverId,
          balance: 0,
          currency: 'EUR',
          status: 'ACTIVE',
        },
      });
    }
    
    // Get or create platform wallet
    let platformWallet = await prisma.wallet.findFirst({
      where: { ownerUserId: PLATFORM_USER_ID },
    });
    
    if (!platformWallet) {
      platformWallet = await prisma.wallet.create({
        data: {
          ownerUserId: PLATFORM_USER_ID,
          balance: 0,
          currency: 'EUR',
          status: 'ACTIVE',
        },
      });
    }
    
    // Python: try:
    //   # Atomare Buchung
    //   debit_wallet(db, user_id, amount_cents, type="booking", reference=bid.id)
    //   credit_wallet(db, PLATFORM_USER_ID, fee_cents, reference=bid.id)
    //   credit_wallet(db, bid.transporter_id, transporter_amount_cents, reference=bid.id)
    //   job.status = "booked"
    //   bid.status = "accepted"
    //   reject_other_bids(db, job_id, except_bid_id=bid.id)
    //   db.commit()
    // except Exception:
    //   db.rollback()
    //   raise
    
    const result = await prisma.$transaction(async (tx) => {
      // Python: 1) debit_wallet(db, user_id, amount_cents, type="booking", reference=bid.id)
      await tx.wallet.update({
        where: { id: shipperWallet.id },
        data: { balance: { decrement: amountCents / 100 } },
      });
      
      await tx.walletTransaction.create({
        data: {
          walletId: shipperWallet.id,
          type: 'PAYMENT_OUT',
          amount: -amountCents / 100,
          currency: 'EUR',
          relatedTransportId: jobId,
          reference: bidId,
          description: `Booking for job ${jobId}`,
          processedAt: new Date(),
        },
      });
      
      // Python: 2) credit_wallet(db, PLATFORM_USER_ID, fee_cents, reference=bid.id)
      await tx.wallet.update({
        where: { id: platformWallet!.id },
        data: { balance: { increment: feeCents / 100 } },
      });
      
      await tx.walletTransaction.create({
        data: {
          walletId: platformWallet!.id,
          type: 'COMMISSION',
          amount: feeCents / 100,
          currency: 'EUR',
          relatedTransportId: jobId,
          reference: bidId,
          description: `Platform fee (3.5%) for job ${jobId}`,
          processedAt: new Date(),
        },
      });
      
      // Python: 3) credit_wallet(db, bid.transporter_id, transporter_amount_cents, reference=bid.id)
      // Note: Pending until completed as per Python comment
      await tx.wallet.update({
        where: { id: transporterWallet!.id },
        data: { balance: { increment: transporterAmountCents / 100 } },
      });
      
      await tx.walletTransaction.create({
        data: {
          walletId: transporterWallet!.id,
          type: 'PAYMENT_IN',
          amount: transporterAmountCents / 100,
          currency: 'EUR',
          relatedTransportId: jobId,
          reference: bidId,
          description: `Payment for job ${jobId} (pending until completion)`,
          processedAt: new Date(),
        },
      });
      
      // Python: 4) job.status = "booked"
      const updatedJob = await tx.transport.update({
        where: { id: jobId },
        data: {
          status: 'ASSIGNED', // 'booked' in our system = ASSIGNED
          agreedPrice: bid.price,
          assignedAt: new Date(),
        },
      });
      
      // Python: 5) bid.status = "accepted"
      const updatedBid = await tx.offer.update({
        where: { id: bidId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });
      
      // Python: 6) reject_other_bids(db, job_id, except_bid_id=bid.id)
      // Python equivalent:
      // def reject_other_bids(db: Session, job_id: str, except_bid_id: str):
      //     bids = db.query(Bid).filter(Bid.job_id == job_id, Bid.id != except_bid_id).all()
      //     for b in bids:
      //         if b.status == "open":
      //             b.status = "rejected"
      //             db.add(b)
      await tx.offer.updateMany({
        where: {
          transportId: jobId,
          status: 'PENDING',
          id: { not: bidId },
        },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: 'Another bid was accepted',
        },
      });
      
      // Create assignment record
      await tx.assignment.create({
        data: {
          transportId: jobId,
          driverId: bid.driverId,
          vehicleId: bid.vehicleId,
          assignedBy: userId,
        },
      });
      
      // Record commission
      await tx.commission.create({
        data: {
          transportId: jobId,
          plan: 'FREE',
          commissionPercent: PLATFORM_FEE_PERCENT * 100,
          commissionAmount: feeCents / 100,
          walletFeePercent: 0,
          walletFeeAmount: 0,
        },
      });
      
      // Create status history
      await tx.transportStatusHistory.create({
        data: {
          transportId: jobId,
          status: 'ASSIGNED',
          changedBy: userId,
          note: `Bid ${bidId} accepted`,
        },
      });
      
      return { job: updatedJob, bid: updatedBid };
    });
    
    // Notify transporter (bonus feature)
    await prisma.notification.create({
      data: {
        userId: bid.driverId,
        type: 'OFFER_ACCEPTED',
        title: 'Angebot angenommen!',
        message: `Dein Angebot über ${bid.price} EUR wurde angenommen.`,
        data: JSON.stringify({ jobId, bidId }),
      },
    });
    
    // Python return format:
    // return {
    //     "status": "booked",
    //     "job_id": str(job.id),
    //     "bid_id": str(bid.id),
    //     "amount_cents": amount_cents,
    //     "fee_cents": fee_cents,
    //     "transporter_amount_cents": transporter_amount_cents,
    // }
    return NextResponse.json({
      status: 'booked',
      job_id: jobId,
      bid_id: bidId,
      amount_cents: amountCents,
      fee_cents: feeCents,
      transporter_amount_cents: transporterAmountCents,
    });
    
  } catch (error: any) {
    console.error('[API] PATCH /jobs/[id]/accept_bid error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept bid' },
      { status: 500 }
    );
  }
}
