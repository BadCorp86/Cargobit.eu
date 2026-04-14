import { NextRequest, NextResponse } from "next/server";
import EscalationWorkflowService from "@/services/escalation-workflow.service";

// ============================================
// GET /api/risk/tickets
// Get all tickets with optional status filter
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // If status is provided, filter by status
    if (status) {
      const validStatuses = [
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_USER",
        "RESOLVED",
        "ESCALATED",
        "CLOSED_PERMANENT",
        "CLOSED_CLEARED",
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_STATUS",
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }

      const tickets = EscalationWorkflowService.getTicketsByStatus(status as any);

      return NextResponse.json({
        success: true,
        data: {
          tickets,
          count: tickets.length,
          status,
        },
      });
    }

    // Return all tickets (mock data for now)
    // In production, this would query the database
    const mockTickets = [
      {
        id: "st_1704067200000_ghi789",
        entityId: "user_78234",
        entityType: "user",
        score: 85,
        level: "RED",
        status: "OPEN",
        action: "ACCEPT_OFFER",
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
        triggeredRules: ["HIGH_AMOUNT_NEW_USER", "NEW_IBAN", "GEO_MISMATCH"],
      },
      {
        id: "st_1704067200000_jkl012",
        entityId: "comp_4512",
        entityType: "company",
        score: 72,
        level: "RED",
        status: "IN_PROGRESS",
        action: "INITIATE_PAYOUT",
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
        triggeredRules: ["NEW_IBAN", "FIRST_PAYOUT"],
      },
      {
        id: "st_1704067200000_mno345",
        entityId: "tx_89234",
        entityType: "transaction",
        score: 91,
        level: "RED",
        status: "ESCALATED",
        action: "ASSIGN_DRIVER",
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        triggeredRules: ["HIGH_AMOUNT_NEW_USER", "FRAUD_PATTERN"],
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        tickets: mockTickets.slice(0, limit),
        count: mockTickets.length,
      },
    });
  } catch (error) {
    console.error("[Tickets API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to fetch tickets",
      },
      { status: 500 }
    );
  }
}
