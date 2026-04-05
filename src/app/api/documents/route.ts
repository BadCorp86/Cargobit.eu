import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List documents or get single document
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const documentType = searchParams.get('documentType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (id) {
      // Get single document
      const document = await db.document.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        }
      });

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      return NextResponse.json(document);
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Build filter conditions
    const where: any = { userId };
    
    if (documentType) {
      where.documentType = documentType;
    }
    
    if (status) {
      where.status = status;
    }

    // Get documents with pagination
    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.document.count({ where })
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Documents GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST - Upload new document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      documentType,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      extractedData,
      confidence,
      warnings,
    } = body;

    // Validate required fields
    if (!userId || !documentType || !fileName || !fileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create document
    const document = await db.document.create({
      data: {
        userId,
        documentType,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        extractedData: extractedData ? JSON.stringify(extractedData) : null,
        confidence,
        warnings: warnings ? JSON.stringify(warnings) : null,
        status: extractedData ? 'processed' : 'pending',
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(document, { status: 201 });

  } catch (error) {
    console.error('Documents POST error:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

// PUT - Update document (verify, update status)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, verifiedBy, extractedData, confidence, warnings } = body;

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const document = await db.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let data: any = {};

    if (action) {
      switch (action) {
        case 'verify':
          data = {
            isVerified: true,
            verifiedBy,
            verifiedAt: new Date(),
          };
          break;

        case 'reject':
          data = {
            isVerified: false,
            verifiedBy,
            verifiedAt: new Date(),
          };
          break;

        case 'process':
          data = {
            extractedData: extractedData ? JSON.stringify(extractedData) : null,
            confidence,
            warnings: warnings ? JSON.stringify(warnings) : null,
            status: 'processed',
          };
          break;

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } else {
      // General update
      if (extractedData !== undefined) {
        data.extractedData = JSON.stringify(extractedData);
      }
      if (confidence !== undefined) {
        data.confidence = confidence;
      }
      if (warnings !== undefined) {
        data.warnings = JSON.stringify(warnings);
      }
      data.status = 'processed';
    }

    const updatedDocument = await db.document.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(updatedDocument);

  } catch (error) {
    console.error('Documents PUT error:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

// DELETE - Delete document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const document = await db.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Only allow deletion of unverified documents
    if (document.isVerified) {
      return NextResponse.json({ error: 'Cannot delete verified documents' }, { status: 400 });
    }

    await db.document.delete({ where: { id } });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Documents DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
