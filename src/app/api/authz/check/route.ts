/**
 * CargoBit Authorization Check API
 * 
 * POST /api/authz/check
 * 
 * Zentraler Endpoint für RBAC + ABAC Autorisierungsprüfung.
 * Wird von allen Services genutzt um zu prüfen:
 * "Darf Subjekt X die Aktion Y auf Ressource Z ausführen?"
 * 
 * @module @cargobit/api/authz
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SecurityConfigService,
  AuthzCheckRequest,
  AuthzCheckResult,
} from '@/services/security-config.service';

// =============================================================================
// API HANDLER
// =============================================================================

/**
 * POST /api/authz/check
 * 
 * Prüft ob ein Subjekt eine Aktion auf einer Ressource ausführen darf.
 * 
 * Request Body:
 * {
 *   subject: { id: string, role: string, companyId?: string },
 *   action: string,          // z.B. "bids:create"
 *   resource: {              // Ressource auf die zugegriffen wird
 *     type: string,
 *     id?: string,
 *     shipperId?: string,
 *     carrierId?: string,
 *     ...
 *   },
 *   context?: {              // Optionaler Kontext
 *     endpoint?: string,
 *     ipAddress?: string
 *   }
 * }
 * 
 * Response:
 * {
 *   allowed: boolean,
 *   reason?: string,
 *   matchedRule?: string,
 *   abacConditionMet?: boolean,
 *   configVersion: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json() as AuthzCheckRequest;
    
    // Validate required fields
    if (!body.subject?.id || !body.subject?.role) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Missing required field: subject.id or subject.role',
          configVersion: 'unknown',
        },
        { status: 400 }
      );
    }
    
    if (!body.action) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Missing required field: action',
          configVersion: 'unknown',
        },
        { status: 400 }
      );
    }
    
    if (!body.resource?.type) {
      return NextResponse.json(
        {
          allowed: false,
          reason: 'Missing required field: resource.type',
          configVersion: 'unknown',
        },
        { status: 400 }
      );
    }
    
    // Get Security Config Service
    const securityConfig = SecurityConfigService.getInstance();
    
    // Perform authorization check
    const result: AuthzCheckResult = securityConfig.checkAuthorization(body);
    
    // Log the authorization decision (for audit)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Authz]', {
        subject: body.subject,
        action: body.action,
        resource: body.resource.type,
        allowed: result.allowed,
        matchedRule: result.matchedRule,
      });
    }
    
    // Return result
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'X-Config-Version': result.configVersion,
        'Cache-Control': 'no-store', // Never cache authz decisions
      },
    });
    
  } catch (error) {
    console.error('[Authz] Error processing authorization check:', error);
    
    return NextResponse.json(
      {
        allowed: false,
        reason: 'Internal server error during authorization check',
        configVersion: 'error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * GET /api/authz/check
 * 
 * Health check endpoint for the authorization service.
 */
export async function GET() {
  try {
    const securityConfig = SecurityConfigService.getInstance();
    const config = securityConfig.getConfig();
    
    return NextResponse.json({
      status: 'healthy',
      configVersion: securityConfig.getConfigVersion(),
      rolesConfigured: Object.keys(config.roles).length,
      abacRulesConfigured: config.abac.rules.length,
      fraudThresholds: config.fraud.carrierScore.thresholds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
