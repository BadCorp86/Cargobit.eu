/**
 * Execution POD API
 * POST /api/executions/[id]/pod - Upload Proof of Delivery
 * PUT /api/executions/[id]/pod - Verify POD
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExecutionEngine, PodType } from '@/services/execution-engine.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================
// GET - Get POD info
// ============================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const execution = await ExecutionEngine.getById(id);

    if (!execution) {
      return NextResponse.json(
        { code: 'EXECUTION_NOT_FOUND', message: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      pod: {
        type: execution.podType,
        url: execution.podUrl,
        metadata: execution.podMetadata ? JSON.parse(execution.podMetadata) : null,
        submittedAt: execution.podSubmittedAt,
        verifiedBy: execution.podVerifiedBy,
        verifiedAt: execution.podVerifiedAt
      }
    });
  } catch (error) {
    console.error('[PodAPI] Error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Upload POD
// ============================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    // Parse multipart form data
    const formData = await request.formData();
    
    const podType = formData.get('podType') as PodType;
    const carrierId = formData.get('carrierId') as string;
    
    // Get file if uploaded
    const file = formData.get('file') as File | null;
    
    // Get metadata
    const metadataStr = formData.get('metadata') as string | null;
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};

    // Validate POD type
    const validPodTypes: PodType[] = ['PHOTO', 'SIGNATURE', 'PDF', 'QR_CODE', 'DIGITAL_ACK'];
    if (!podType || !validPodTypes.includes(podType)) {
      return NextResponse.json(
        { 
          code: 'INVALID_POD_TYPE', 
          message: `podType must be one of: ${validPodTypes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Handle file upload
    let podUrl = formData.get('podUrl') as string;
    
    if (file && !podUrl) {
      // In production, upload to S3/Cloudflare R2
      // For now, generate a placeholder URL
      const fileName = `pod/${id}/${Date.now()}_${file.name}`;
      podUrl = `https://storage.cargobit.com/${fileName}`;
      
      // TODO: Actual file upload
      // const arrayBuffer = await file.arrayBuffer();
      // await uploadToStorage(fileName, arrayBuffer);
    }

    if (!podUrl) {
      return NextResponse.json(
        { code: 'MISSING_POD', message: 'Either file or podUrl is required' },
        { status: 400 }
      );
    }

    // Upload POD
    const execution = await ExecutionEngine.uploadPod({
      executionId: id,
      podType,
      podUrl,
      metadata: {
        ...metadata,
        uploadedBy: carrierId,
        uploadedAt: new Date().toISOString()
      }
    });

    return NextResponse.json({ 
      execution,
      pod: {
        type: podType,
        url: podUrl,
        submittedAt: execution.podSubmittedAt
      }
    });
  } catch (error) {
    console.error('[PodAPI] Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { code: 'EXECUTION_NOT_FOUND', message: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Cannot upload POD')) {
        return NextResponse.json(
          { code: 'INVALID_STATUS', message: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Verify POD
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { verifiedBy, autoComplete = true } = body;

    if (!verifiedBy) {
      return NextResponse.json(
        { code: 'MISSING_VERIFIER', message: 'verifiedBy is required' },
        { status: 400 }
      );
    }

    const execution = await ExecutionEngine.verifyPod(id, verifiedBy, autoComplete);

    return NextResponse.json({ 
      execution,
      verified: true,
      autoCompleted: autoComplete
    });
  } catch (error) {
    console.error('[PodAPI] Error:', error);
    
    if (error instanceof Error && error.message.includes('no POD submitted')) {
      return NextResponse.json(
        { code: 'NO_POD', message: 'No POD has been submitted' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
