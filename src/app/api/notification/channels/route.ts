// ============================================
// NOTIFICATION API: /api/notification/channels
// Channel-Konfigurationen verwalten
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/notification.service';
import {
  NotificationChannelType,
  NOTIFICATION_ERROR_CODES,
} from '@/types/notification';

// GET: Alle Channels abrufen
export async function GET() {
  try {
    const channels = await notificationService.getChannels();

    return NextResponse.json({
      channels,
      total: channels.length,
    });
  } catch (error) {
    console.error('[NotificationAPI] Error in GET /api/notification/channels:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve channels',
      },
      { status: 500 }
    );
  }
}

// POST: Channel konfigurieren
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
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

    if (!body.config) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: 'config is required',
        },
        { status: 400 }
      );
    }

    // Validate channel-specific config
    const validationError = validateChannelConfig(body.channel, body.config);
    if (validationError) {
      return NextResponse.json(
        {
          error: NOTIFICATION_ERROR_CODES.INVALID_PAYLOAD.code,
          message: validationError,
        },
        { status: 400 }
      );
    }

    await notificationService.configureChannel({
      channel: body.channel,
      config: body.config,
      rateLimit: body.rateLimit,
      rateWindowSec: body.rateWindowSec,
      active: body.active,
    });

    return NextResponse.json({
      status: 'configured',
      channel: body.channel,
    });
  } catch (error) {
    console.error('[NotificationAPI] Error in POST /api/notification/channels:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to configure channel',
      },
      { status: 500 }
    );
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateChannelConfig(
  channel: NotificationChannelType,
  config: Record<string, unknown>
): string | null {
  switch (channel) {
    case NotificationChannelType.SLACK:
      if (!config.webhookUrl) {
        return 'webhookUrl is required for SLACK channel';
      }
      if (typeof config.webhookUrl !== 'string' || !config.webhookUrl.startsWith('https://')) {
        return 'webhookUrl must be a valid HTTPS URL';
      }
      break;

    case NotificationChannelType.EMAIL:
      if (!config.smtpHost) {
        return 'smtpHost is required for EMAIL channel';
      }
      if (!config.smtpPort || typeof config.smtpPort !== 'number') {
        return 'smtpPort is required and must be a number';
      }
      if (!config.fromEmail) {
        return 'fromEmail is required for EMAIL channel';
      }
      break;

    case NotificationChannelType.SMS:
      if (!config.provider) {
        return 'provider is required for SMS channel (twilio, sns, messagebird)';
      }
      if (!config.apiKey) {
        return 'apiKey is required for SMS channel';
      }
      if (!config.fromNumber) {
        return 'fromNumber is required for SMS channel';
      }
      break;

    case NotificationChannelType.WEBHOOK:
      if (!config.url) {
        return 'url is required for WEBHOOK channel';
      }
      if (typeof config.url !== 'string' || !config.url.startsWith('http')) {
        return 'url must be a valid HTTP/HTTPS URL';
      }
      break;
  }

  return null;
}
