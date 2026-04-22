/**
 * CargoBit Admin API - OpenAPI Documentation
 * 
 * GET /api/docs - Returns OpenAPI 3.0 specification as JSON
 * 
 * This endpoint serves the complete OpenAPI specification for the CargoBit Admin API,
 * including all endpoints, schemas, and Bearer Authentication configuration.
 */

import { NextResponse } from 'next/server';
import { generateOpenAPISpec } from '@/lib/openapi';

export async function GET() {
  const spec = generateOpenAPISpec();
  
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  });
}

// Also support OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
