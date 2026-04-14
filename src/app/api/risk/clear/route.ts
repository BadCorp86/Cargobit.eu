import { NextRequest, NextResponse } from "next/server";
import EscalationWorkflowService from "@/services/escalation-workflow.service";

// ============================================
// POST /api/risk/clear
// Clear case after Compliance review
// Admin/Compliance Only
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { ticketId, reason, clearedBy } = body;

    if (!ticketId || !reason || !clearedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_REQUEST",
          message: "Missing required fields: ticketId, reason, clearedBy",
        },
        { status: 400 }
      );
    }

    // TODO: Validate that clearedBy has ADMIN or COMPLIANCE role
    // This should be done via auth middleware in production

    // Execute clear after review
    const result = await EscalationWorkflowService.clearAfterReview(
      ticketId,
      clearedBy,
      reason
    );

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        ticket: result.ticket,
        user: result.user,
        message: "Case cleared after Compliance review. User account reactivated.",
      },
    });
  } catch (error) {
    console.error("[Clear API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to clear case",
      },
      { status: 500 }
    );
  }
}
