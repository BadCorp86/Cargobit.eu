/**
 * CargoBit Admin Login Step 2
 * 
 * POST /api/admin/auth/login-step2
 * 
 * Verify 2FA code and return JWT token.
 * 
 * @summary Admin Login Step 2 (2FA Verification + JWT)
 * @description Verifies 2FA code and issues JWT access token with role-based payload.
 * 
 * @requestBody { "email": "admin@cargobit.eu", "code": "123456" }
 * @response 200 { "access_token": "eyJ...", "token_type": "bearer", "expires_in": 28800, "admin": {...} }
 * @response 400 { "error": "Validation failed", "code": "VALIDATION_ERROR" }
 * @response 401 { "error": "Invalid 2FA code", "code": "INVALID_2FA" }
 * @response 403 { "error": "Account deactivated", "code": "ACCOUNT_DISABLED" }
 * 
 * JWT Payload:
 * {
 *   "sub": "admin-uuid",     // Admin user ID
 *   "role": "ADMIN",         // ADMIN | FINANCE | SUPPORT
 *   "iat": 1713620000,       // Issued at
 *   "exp": 1713663200        // Expiration
 * }
 * 
 * Error Cases:
 * - ❌ Email does not exist → 401 Unauthorized
 * - ❌ 2FA not enabled → Proceeds without code validation
 * - ❌ 2FA code wrong → 401 Unauthorized "Invalid 2FA code"
 * - ❌ 2FA code expired → 401 Unauthorized (TOTP window ±30s)
 * - ❌ Account deactivated → 403 Forbidden
 * - ❌ Account locked → 403 Forbidden
 * - ❌ Validation error → 400 Bad Request
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/services/admin-auth.service';
import { LoginStep2Dto, validateDto, ErrorResponseDto } from '@/dto/admin-auth.dto';

// ============================================
// TYPES
// ============================================

interface SuccessResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  admin: {
    id: string;
    email: string;
    role: 'ADMIN' | 'FINANCE' | 'SUPPORT';
  };
}

// ============================================
// POST: LOGIN STEP 2
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorResponseDto = {
        error: 'Invalid JSON body',
        code: 'INVALID_JSON',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    // Create and validate DTO
    const dto = LoginStep2Dto.fromObject(body);
    const validation = validateDto(dto);
    
    if (!validation.valid) {
      const errorResponse: ErrorResponseDto = {
        error: 'Validierungsfehler',
        code: 'VALIDATION_ERROR',
        details: { errors: validation.errors },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    // Get client context
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Process login step 2
    const result = await adminAuthService.loginStep2(dto.email, dto.code, ipAddress, userAgent);
    
    // Handle failure cases
    if (!result.success) {
      // Determine appropriate status code
      let statusCode = 401;
      let code = 'INVALID_2FA';
      
      if (result.error.includes('deaktiviert') || result.error.includes('gesperrt')) {
        statusCode = 403;
        code = 'ACCOUNT_DISABLED';
      } else if (result.error.includes('Anmeldedaten')) {
        code = 'INVALID_CREDENTIALS';
      }
      
      const errorResponse: ErrorResponseDto = {
        error: result.error,
        code,
      };
      
      return NextResponse.json(errorResponse, { status: statusCode });
    }
    
    // Success - Build response
    const response: SuccessResponse = {
      access_token: result.data.accessToken,
      token_type: result.data.tokenType,
      expires_in: result.data.expiresIn,
      admin: result.data.admin,
    };
    
    // Create NextResponse with secure cookie
    const nextResponse = NextResponse.json(response);
    
    // Set HTTP-only secure cookie for session
    nextResponse.cookies.set('admin_session', result.data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.data.expiresIn,
      path: '/',
    });
    
    return nextResponse;
    
  } catch (error) {
    console.error('[AdminLogin] Step 2 error:', error);
    
    const errorResponse: ErrorResponseDto = {
      error: 'Interner Server-Fehler',
      code: 'INTERNAL_ERROR',
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// ============================================
// HELPER: GET CLIENT IP
// ============================================

function getClientIp(request: NextRequest): string {
  // Try various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  const cfIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  if (cfIp) {
    return cfIp;
  }
  
  return 'unknown';
}

// ============================================
// OPTIONS: CORS PREFLIGHT
// ============================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
