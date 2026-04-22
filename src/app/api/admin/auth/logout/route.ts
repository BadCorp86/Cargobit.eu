/**
 * CargoBit Admin - Logout
 * 
 * POST /api/admin/auth/logout
 * 
 * Invalidates the current admin session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/services/admin-auth.service';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or header
    const sessionCookie = request.cookies.get('admin_session');
    const token = sessionCookie?.value;

    if (token) {
      await adminAuthService.logout(token);
    }

    // Clear cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[AdminLogout] Error:', error);
    return NextResponse.json({ success: true }); // Always return success
  }
}
