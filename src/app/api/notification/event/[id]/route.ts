// ============================================
// NOTIFICATION API: GET /api/notification/event/[id]
// Status einer Notification abrufen
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/notification.service';
import { NOTIFICATION_ERROR_CODES } from '@/types/notification';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'Event ID is required',
        },
        { status: 400 }
      );
    }

    const event = await notificationService.getEvent(id);

    if (!event) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.EVENT_NOT_FOUND.code,
          message: NOTIFICATION_ERROR_CODES.EVENT_NOT_FOUND.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('[NotificationAPI] Error in GET /api/notification/event:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve notification event',
      },
      { status: 500 }
    );
  }
}
