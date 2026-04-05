import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Types
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Calculate volume discount based on campaign duration
function calculateVolumeDiscount(durationMonths: number): { percent: number; amount: number } {
  if (durationMonths >= 12) {
    return { percent: 30, amount: 0.30 };
  } else if (durationMonths >= 6) {
    return { percent: 20, amount: 0.20 };
  } else if (durationMonths >= 3) {
    return { percent: 10, amount: 0.10 };
  }
  return { percent: 0, amount: 0 };
}

// Generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.invoice.count({
    where: {
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    }
  });
  return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
}

// POST - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, lineItems, periodStart, periodEnd, campaignDuration } = body;

    if (!userId || !lineItems || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, lineItems, periodStart, periodEnd' },
        { status: 400 }
      );
    }

    // Calculate subtotal
    const subtotal = (lineItems as LineItem[]).reduce((sum, item) => sum + item.total, 0);

    // Calculate volume discount
    const duration = campaignDuration || 1;
    const discount = calculateVolumeDiscount(duration);
    const discountAmount = subtotal * discount.amount;
    const total = subtotal - discountAmount;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Due date: 14 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        lineItems: JSON.stringify(lineItems),
        subtotal,
        volumeDiscount: discountAmount,
        discountPercent: discount.percent,
        total,
        dueDate,
        status: 'pending'
      }
    });

    // TODO: Send email notification to user
    // This would typically use a service like SendGrid, Resend, or similar

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        subtotal,
        discount: discount.percent > 0 ? `${discount.percent}% (-€${discountAmount.toFixed(2)})` : 'Kein Rabatt',
        total,
        dueDate: invoice.dueDate,
        status: invoice.status
      }
    });
  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const invoiceId = searchParams.get('id');
    const status = searchParams.get('status');
    const checkOverdue = searchParams.get('checkOverdue') === 'true';

    // Check and update overdue invoices
    if (checkOverdue) {
      const overdueInvoices = await db.invoice.findMany({
        where: {
          status: 'pending',
          dueDate: { lt: new Date() }
        }
      });

      for (const invoice of overdueInvoices) {
        // Update invoice status to overdue
        await db.invoice.update({
          where: { id: invoice.id },
          data: { status: 'overdue' }
        });

        // Check if invoice is more than 14 days overdue
        const daysOverdue = Math.floor(
          (new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysOverdue >= 14 && !invoice.blockedDueToNonPayment) {
          // Block user for non-payment
          await db.user.update({
            where: { id: invoice.userId },
            data: {
              isBlocked: true,
              blockReason: `Automatische Sperrung wegen Zahlungsrückstand (Rechnung ${invoice.invoiceNumber})`,
              blockedAt: new Date(),
              status: 'BLOCKED'
            }
          });

          // Mark invoice as blocked
          await db.invoice.update({
            where: { id: invoice.id },
            data: { blockedDueToNonPayment: true }
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Overdue check completed',
        overdueCount: overdueInvoices.length
      });
    }

    // Get single invoice
    if (invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              companyName: true,
              isBlocked: true
            }
          }
        }
      });

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        invoice: {
          ...invoice,
          lineItems: JSON.parse(invoice.lineItems)
        }
      });
    }

    // Build query
    const where: Record<string, unknown> = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status) {
      where.status = status;
    }

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      count: invoices.length,
      invoices: invoices.map(inv => ({
        ...inv,
        lineItems: JSON.parse(inv.lineItems)
      }))
    });
  } catch (error) {
    console.error('Invoice GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update invoice (mark as paid, cancel, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, status, paymentMethod, adminUserId } = body;

    if (!invoiceId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, status' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };
    
    if (status === 'paid') {
      updateData.paidAt = new Date();
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
    }

    // Update invoice
    const invoice = await db.invoice.update({
      where: { id: invoiceId },
      data: updateData
    });

    // If paid, unblock user if they were blocked for non-payment
    if (status === 'paid' && invoice.blockedDueToNonPayment) {
      await db.user.update({
        where: { id: invoice.userId },
        data: {
          isBlocked: false,
          blockReason: null,
          blockedAt: null,
          status: 'ACTIVE'
        }
      });
    }

    // Log admin action
    if (adminUserId) {
      await db.auditLog.create({
        data: {
          userId: adminUserId,
          userEmail: '',
          userRole: 'ADMIN',
          action: 'invoice_update',
          entityType: 'invoice',
          entityId: invoiceId,
          newValue: JSON.stringify({ status, paymentMethod })
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: status === 'paid' ? 'Invoice marked as paid' : 'Invoice updated',
      invoice
    });
  } catch (error) {
    console.error('Invoice PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel invoice
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Missing invoice ID' },
        { status: 400 }
      );
    }

    const invoice = await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'cancelled' }
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice cancelled',
      invoice
    });
  } catch (error) {
    console.error('Invoice DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
