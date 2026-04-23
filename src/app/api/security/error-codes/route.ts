// ============================================
// CARGOBIT SECURITY GATEWAY API
// GET /api/security/error-codes
// Get Error Code Definitions
// ============================================

import { NextResponse } from 'next/server';
import { SECURITY_ERROR_CODES, SecurityErrorCode } from '@/types/security';

export async function GET() {
  const errorCodeCatalog = Object.entries(SECURITY_ERROR_CODES).map(([code, info]) => ({
    code,
    category: info.category,
    httpStatus: info.httpStatus,
    message: info.message,
    recoveryHint: info.recoveryHint,
  }));

  const categories = [...new Set(Object.values(SECURITY_ERROR_CODES).map(e => e.category))];

  return NextResponse.json({
    success: true,
    data: {
      codes: errorCodeCatalog,
      categories,
      version: '2.0.0',
    },
  });
}
