import { NextRequest, NextResponse } from "next/server";
import EscalationWorkflowService from "@/services/escalation-workflow.service";

// ============================================
// POST /api/risk/escalate
// Escalate to Compliance or Block user
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { ticketId, action, reason, escalatedBy } = body;

    if (!ticketId || !action || !reason || !escalatedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_REQUEST",
          message: "Missing required fields: ticketId, action, reason, escalatedBy",
        },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ["block", "escalate"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ACTION",
          message: `Invalid action. Must be one of: ${validActions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    let result;

    if (action === "block") {
      // Block user permanently
      result = await EscalationWorkflowService.blockUser(
        ticketId,
        escalatedBy,
        reason
      );

      return NextResponse.json({
        success: true,
        data: {
          ticket: result.ticket,
          user: result.user,
          message: "User blocked permanently. Ticket closed with reason PERMANENT_BLOCK.",
        },
      });
    } else {
      // Escalate to Compliance
      result = await EscalationWorkflowService.escalateToCompliance(
        ticketId,
        escalatedBy,
        reason
      );

      return NextResponse.json({
        success: true,
        data: {
          ticket: result.ticket,
          compliance: result.compliance,
          message: "Case escalated to Compliance team. Ticket status updated to ESCALATED.",
        },
      });
    }
  } catch (error) {
    console.error("[Escalate API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to process escalation",
      },
      { status: 500 }
    );
  }
}
