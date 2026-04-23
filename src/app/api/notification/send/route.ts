// ============================================
// NOTIFICATION API: POST /api/notification/send
// Notification auslösen und in Queue schreiben
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/notification.service';
import {
  NotificationPriority,
  NotificationChannelType,
  NotificationEntityType,
  NOTIFICATION_ERROR_CODES,
} from '@/types/notification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.eventType) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'eventType is required',
        },
        { status: 400 }
      );
    }

    if (!body.entityType || !body.entityId) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'entityType and entityId are required',
        },
        { status: 400 }
      );
    }

    if (!body.channels || !Array.isArray(body.channels) || body.channels.length === 0) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'channels array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    // Validate enums
    if (body.entityType && !Object.values(NotificationEntityType).includes(body.entityType)) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: `entityType must be one of: ${Object.values(NotificationEntityType).join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (body.priority && !Object.values(NotificationPriority).includes(body.priority)) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: `priority must be one of: ${Object.values(NotificationPriority).join(', ')}`,
        },
        { status: 400 }
      );
    }

    for (const channel of body.channels) {
      if (!Object.values(NotificationChannelType).includes(channel)) {
        return NextResponse.json(
          {
            error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
            message: `Invalid channel: ${channel}. Must be one of: ${Object.values(NotificationChannelType).join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Send notification
    const result = await notificationService.send({
      eventType: body.eventType,
      entityType: body.entityType,
      entityId: body.entityId,
      priority: body.priority || NotificationPriority.MEDIUM,
      channels: body.channels,
      data: body.data || {},
    });

    if (result.status === 'error') {
      const statusCode = result.errorCode === NOTIFICATION_ERROR_CODES.RATE_LIMIT_EXCEEDED.code ? 429 :
        result.errorCode === NOTIFICATION_ERROR_CODES.CHANNEL_NOT_CONFIGURED.code ? 503 : 500;
      
      return NextResponse.json(
        {
          error: result.errorCode,
          message: result.message,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      status: result.status,
      eventId: result.eventId,
    });
  } catch (error) {
    console.error('[NotificationAPI] Error in POST /api/notification/send:', error);
    return NextResponse.json(
      {
        error: NOTIFICATION_ERROR_CODES.DELIVERY_FAILED.code,
        message: 'Failed to queue notification',
      },
      { status: 500 }
    );
  }
}
