/**
 * CargoBit Admin Login Step 1
 * 
 * POST /api/admin/auth/login-step1
 * 
 * Verify email and password, return if 2FA is required.
 * 
 * @summary Admin Login Step 1 (Email + Password)
 * @description Verifies admin credentials and returns whether 2FA is required.
 * 
 * @requestBody { "email": "admin@cargobit.eu", "password": "••••••••" }
 * @response 200 { "requires_2fa": true, "email": "admin@cargobit.eu" }
 * @response 400 { "error": "Validation failed", "details": [...] }
 * @response 401 { "error": "Invalid credentials" }
 * @response 403 { "error": "Account deactivated" }
 * 
 * Error Cases:
 * - ❌ Email does not exist → 401 Unauthorized "Invalid credentials"
 * - ❌ Wrong password → 401 Unauthorized "Invalid credentials"
 * - ❌ Admin deactivated → 403 Forbidden "Account deactivated"
 * - ❌ Account locked → 403 Forbidden "Account locked"
 * - ❌ Validation error → 400 Bad Request
 * 
 * Security:
 * - No JWT is issued in Step 1 (correct behavior)
 * - Failed attempts are logged
 * - Account lockout after 5 failed attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/services/admin-auth.service';
import { LoginStep1Dto, validateDto, ErrorResponseDto } from '@/dto/admin-auth.dto';

// ============================================
// RESPONSE TYPES
// ============================================

interface SuccessResponse {
  requires_2fa: boolean;
  email: string;
}

// ============================================
// POST: LOGIN STEP 1
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
    const dto = LoginStep1Dto.fromObject(body);
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
    
    // Process login step 1
    const result = await adminAuthService.loginStep1(dto.email, dto.password, ipAddress);
    
    // Handle failure cases
    if (!result.success) {
      // Determine appropriate status code
      let statusCode = 401;
      
      if (result.error.includes('deaktiviert')) {
        statusCode = 403; // Account deactivated
      } else if (result.error.includes('gesperrt')) {
        statusCode = 403; // Account locked
      }
      
      const errorResponse: ErrorResponseDto = {
        error: result.error,
        code: statusCode === 403 ? 'ACCOUNT_DISABLED' : 'INVALID_CREDENTIALS',
      };
      
      return NextResponse.json(errorResponse, { status: statusCode });
    }
    
    // Success - return response (NO JWT in Step 1!)
    const response: SuccessResponse = {
      requires_2fa: result.data.requires2fa,
      email: result.data.email,
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('[AdminLogin] Step 1 error:', error);
    
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
