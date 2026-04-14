import { NextRequest, NextResponse } from "next/server";
import EscalationWorkflowService from "@/services/escalation-workflow.service";

// ============================================
// POST /api/risk/override
// Release a blocked action - Allow the user to proceed
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { ticketId, action, reason, overrideBy } = body;

    if (!ticketId || !reason || !overrideBy) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_REQUEST",
          message: "Missing required fields: ticketId, reason, overrideBy",
        },
        { status: 400 }
      );
    }

    // Only allow "release" action for this endpoint
    if (action && action !== "release") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ACTION",
          message: "Only 'release' action is supported on this endpoint",
        },
        { status: 400 }
      );
    }

    // Execute release
    const result = await EscalationWorkflowService.releaseTicket(
      ticketId,
      overrideBy,
      reason
    );

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        ticket: result.ticket,
        notifications: result.notifications,
        message: "Ticket released successfully. User can now retry the action.",
      },
    });
  } catch (error) {
    console.error("[Override API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to release ticket",
      },
      { status: 500 }
    );
  }
}
