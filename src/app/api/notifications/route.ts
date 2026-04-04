import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'pending';
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const where: any = { userId };
    if (status !== 'all') {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      db.pushNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.pushNotification.count({ where })
    ]);

    // Get user's push tokens
    const pushTokens = await db.pushToken.findMany({
      where: { userId, isActive: true }
    });

    return NextResponse.json({
      notifications,
      pushTokens,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST - Register push token or send notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Register device token
    if (action === 'registerToken') {
      const {
        userId,
        deviceToken,
        platform,
        deviceName,
        deviceModel,
        osVersion,
        appVersion,
        receiveExpress,
        receiveShipment,
        receiveChat,
        receiveMarketing,
      } = body;

      if (!userId || !deviceToken || !platform) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Upsert token
      const token = await db.pushToken.upsert({
        where: { deviceToken },
        update: {
          userId,
          platform,
          deviceName,
          deviceModel,
          osVersion,
          appVersion,
          isActive: true,
          lastUsedAt: new Date(),
          receiveExpress: receiveExpress ?? true,
          receiveShipment: receiveShipment ?? true,
          receiveChat: receiveChat ?? true,
          receiveMarketing: receiveMarketing ?? false,
        },
        create: {
          userId,
          deviceToken,
          platform,
          deviceName,
          deviceModel,
          osVersion,
          appVersion,
          receiveExpress: receiveExpress ?? true,
          receiveShipment: receiveShipment ?? true,
          receiveChat: receiveChat ?? true,
          receiveMarketing: receiveMarketing ?? false,
        }
      });

      return NextResponse.json(token, { status: 201 });
    }

    // Send notification to user(s)
    if (action === 'send') {
      const {
        userIds,  // Array of user IDs or single userId
        title,
        body: messageBody,
        data,
        type,
        entityType,
        entityId,
      } = body;

      if (!userIds || !title || !messageBody) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const targetUserIds = Array.isArray(userIds) ? userIds : [userIds];

      // Create notifications
      const notifications = await Promise.all(
        targetUserIds.map(userId =>
          db.pushNotification.create({
            data: {
              userId,
              title,
              body: messageBody,
              data: data ? JSON.stringify(data) : null,
              type: type || 'system',
              entityType,
              entityId,
              status: 'pending',
            }
          })
        )
      );

      // In production, this would trigger actual push via FCM/APNS
      // For now, we just mark them as 'sent'
      await db.pushNotification.updateMany({
        where: { id: { in: notifications.map(n => n.id) } },
        data: { status: 'sent', sentAt: new Date() }
      });

      return NextResponse.json({
        sent: notifications.length,
        notifications,
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'Failed to process notification request' }, { status: 500 });
  }
}

// PUT - Update notification status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, action } = body;

    if (action === 'markAllRead') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const result = await db.pushNotification.updateMany({
        where: { userId, status: 'sent' },
        data: { status: 'delivered', deliveredAt: new Date() }
      });

      return NextResponse.json({ updated: result.count });
    }

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 });
    }

    const updateData: any = { status };
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const notification = await db.pushNotification.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(notification);

  } catch (error) {
    console.error('Notifications PUT error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE - Remove push token
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');

    if (token) {
      await db.pushToken.update({
        where: { deviceToken: token },
        data: { isActive: false }
      });
      return NextResponse.json({ success: true, message: 'Token deactivated' });
    }

    if (userId) {
      await db.pushToken.updateMany({
        where: { userId },
        data: { isActive: false }
      });
      return NextResponse.json({ success: true, message: 'All tokens deactivated for user' });
    }

    return NextResponse.json({ error: 'Token or userId required' }, { status: 400 });

  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json({ error: 'Failed to deactivate token' }, { status: 500 });
  }
}
