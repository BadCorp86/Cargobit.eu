// ============================================
// NOTIFICATION API: /api/notification/templates
// Templates verwalten
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/notification.service';
import {
  NotificationChannelType,
  NOTIFICATION_ERROR_CODES,
} from '@/types/notification';

// GET: Alle Templates abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const eventType = searchParams.get('eventType') || undefined;
    const channelParam = searchParams.get('channel');
    const activeParam = searchParams.get('active');

    const channel = channelParam as NotificationChannelType | undefined;
    const active = activeParam ? activeParam === 'true' : undefined;

    const templates = await notificationService.getTemplates({
      eventType,
      channel,
      active,
    });

    return NextResponse.json({
      templates,
      total: templates.length,
    });
  } catch (error) {
    console.error('[NotificationAPI] Error in GET /api/notification/templates:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve templates',
      },
      { status: 500 }
    );
  }
}

// POST: Neues Template erstellen
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

    if (!body.channel) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'channel is required',
        },
        { status: 400 }
      );
    }

    if (!Object.values(NotificationChannelType).includes(body.channel)) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: `Invalid channel. Must be one of: ${Object.values(NotificationChannelType).join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!body.body) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'body is required',
        },
        { status: 400 }
      );
    }

    // Email requires subject
    if (body.channel === NotificationChannelType.EMAIL && !body.subject) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'subject is required for EMAIL channel',
        },
        { status: 400 }
      );
    }

    const template = await notificationService.createTemplate({
      eventType: body.eventType,
      channel: body.channel,
      subject: body.subject,
      body: body.body,
      active: body.active,
    });

    return NextResponse.json({
      status: 'created',
      template,
    });
  } catch (error: any) {
    // Check for unique constraint violation
    if (error?.code === 'P2002') {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.TEMPLATE_ALREADY_EXISTS.code,
          message: NOTIFICATION_ERROR_CODES.TEMPLATE_ALREADY_EXISTS.message,
        },
        { status: 409 }
      );
    }

    console.error('[NotificationAPI] Error in POST /api/notification/templates:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to create template',
      },
      { status: 500 }
    );
  }
}

// PUT: Template aktualisieren
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'Template ID is required',
        },
        { status: 400 }
      );
    }

    const template = await notificationService.updateTemplate(body.id, {
      subject: body.subject,
      body: body.body,
      active: body.active,
    });

    if (!template) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.TEMPLATE_NOT_FOUND.code,
          message: 'Template not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'updated',
      template,
    });
  } catch (error) {
    console.error('[NotificationAPI] Error in PUT /api/notification/templates:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to update template',
      },
      { status: 500 }
    );
  }
}
