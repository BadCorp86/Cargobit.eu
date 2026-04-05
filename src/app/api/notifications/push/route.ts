import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, requireRole, AuthUser } from '@/lib/auth-middleware';

// Register device token for push notifications
export async function POST(request: NextRequest) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await request.json();
      const {
        deviceToken,
        platform,
        deviceName,
        deviceModel,
        osVersion,
        appVersion,
        preferences,
      } = body;

      if (!deviceToken || !platform) {
        return NextResponse.json(
          { error: 'Device token and platform are required' },
          { status: 400 }
        );
      }

      // Check if token already exists
      const existingToken = await db.pushToken.findUnique({
        where: { deviceToken },
      });

      if (existingToken) {
        // Update existing token
        const updated = await db.pushToken.update({
          where: { deviceToken },
          data: {
            userId: user.id,
            platform,
            deviceName,
            deviceModel,
            osVersion,
            appVersion,
            isActive: true,
            lastUsedAt: new Date(),
            ...(preferences && {
              receiveExpress: preferences.receiveExpress ?? true,
              receiveShipment: preferences.receiveShipment ?? true,
              receiveChat: preferences.receiveChat ?? true,
              receiveMarketing: preferences.receiveMarketing ?? false,
            }),
          },
        });

        return NextResponse.json({ success: true, token: updated });
      }

      // Create new token
      const newToken = await db.pushToken.create({
        data: {
          userId: user.id,
          deviceToken,
          platform,
          deviceName,
          deviceModel,
          osVersion,
          appVersion,
          isActive: true,
          lastUsedAt: new Date(),
          receiveExpress: preferences?.receiveExpress ?? true,
          receiveShipment: preferences?.receiveShipment ?? true,
          receiveChat: preferences?.receiveChat ?? true,
          receiveMarketing: preferences?.receiveMarketing ?? false,
        },
      });

      return NextResponse.json({ success: true, token: newToken }, { status: 201 });

    } catch (error) {
      console.error('Push token registration error:', error);
      return NextResponse.json(
        { error: 'Failed to register push token' },
        { status: 500 }
      );
    }
  })(request);
}

// Get user's push tokens
export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    try {
      const tokens = await db.pushToken.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        orderBy: { lastUsedAt: 'desc' },
      });

      return NextResponse.json({ tokens });

    } catch (error) {
      console.error('Get push tokens error:', error);
      return NextResponse.json(
        { error: 'Failed to get push tokens' },
        { status: 500 }
      );
    }
  })(request);
}

// Update notification preferences
export async function PUT(request: NextRequest) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await request.json();
      const { tokenId, preferences } = body;

      if (!tokenId) {
        return NextResponse.json(
          { error: 'Token ID is required' },
          { status: 400 }
        );
      }

      // Verify token belongs to user
      const token = await db.pushToken.findFirst({
        where: { id: tokenId, userId: user.id },
      });

      if (!token) {
        return NextResponse.json(
          { error: 'Token not found' },
          { status: 404 }
        );
      }

      const updated = await db.pushToken.update({
        where: { id: tokenId },
        data: {
          receiveExpress: preferences?.receiveExpress ?? token.receiveExpress,
          receiveShipment: preferences?.receiveShipment ?? token.receiveShipment,
          receiveChat: preferences?.receiveChat ?? token.receiveChat,
          receiveMarketing: preferences?.receiveMarketing ?? token.receiveMarketing,
        },
      });

      return NextResponse.json({ success: true, token: updated });

    } catch (error) {
      console.error('Update push preferences error:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }
  })(request);
}

// Delete (deactivate) push token
export async function DELETE(request: NextRequest) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const tokenId = searchParams.get('tokenId');
      const deviceToken = searchParams.get('deviceToken');

      if (!tokenId && !deviceToken) {
        return NextResponse.json(
          { error: 'Token ID or device token is required' },
          { status: 400 }
        );
      }

      if (tokenId) {
        await db.pushToken.updateMany({
          where: { id: tokenId, userId: user.id },
          data: { isActive: false },
        });
      } else if (deviceToken) {
        await db.pushToken.update({
          where: { deviceToken },
          data: { isActive: false },
        });
      }

      return NextResponse.json({ success: true });

    } catch (error) {
      console.error('Delete push token error:', error);
      return NextResponse.json(
        { error: 'Failed to delete push token' },
        { status: 500 }
      );
    }
  })(request);
}
