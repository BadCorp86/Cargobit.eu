import { NextRequest, NextResponse } from "next/server";
import EscalationWorkflowService from "@/services/escalation-workflow.service";

// ============================================
// POST /api/risk/request-verification
// Request additional verification from user
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { ticketId, verificationType, requiredDocuments, comment, requestedBy } = body;

    if (!ticketId || !verificationType || !comment || !requestedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_REQUEST",
          message: "Missing required fields: ticketId, verificationType, comment, requestedBy",
        },
        { status: 400 }
      );
    }

    // Validate verification type
    const validTypes = ["DOCUMENT_UPLOAD", "SELFIE_VERIFICATION", "COMPANY_DOCUMENTS", "IBAN_VERIFICATION"];
    if (!validTypes.includes(verificationType)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_VERIFICATION_TYPE",
          message: `Invalid verification type. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Execute verification request
    const result = await EscalationWorkflowService.requestVerification(
      ticketId,
      verificationType,
      requiredDocuments,
      comment,
      requestedBy
    );

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        verification: result.verification,
        ticket: result.ticket,
        message: "Verification request sent to user. Ticket status updated to WAITING_FOR_USER.",
      },
    });
  } catch (error) {
    console.error("[Request Verification API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to request verification",
      },
      { status: 500 }
    );
  }
}
