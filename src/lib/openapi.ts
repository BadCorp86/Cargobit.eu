/**
 * CargoBit Admin API - OpenAPI Specification
 * 
 * Generates OpenAPI 3.0 documentation for the Admin API.
 * Includes Bearer Authentication with JWT tokens.
 */

// ============================================
// TYPES
// ============================================

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  security: Array<{
    [key: string]: string[];
  }>;
  components: {
    securitySchemes: {
      [key: string]: {
        type: string;
        scheme: string;
        bearerFormat: string;
        description: string;
      };
    };
    schemas: {
      [key: string]: object;
    };
    responses: {
      [key: string]: object;
    };
  };
  paths: {
    [path: string]: {
      [method: string]: {
        tags: string[];
        summary: string;
        description?: string;
        security?: Array<{ [key: string]: string[] }>;
        parameters?: object[];
        requestBody?: object;
        responses: {
          [code: string]: {
            description: string;
            content?: {
              [contentType: string]: {
                schema: object;
              };
            };
          };
        };
      };
    };
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
}

// ============================================
// ADMIN API SCHEMAS
// ============================================

const schemas = {
  // Admin Authentication
  AdminLoginStep1Request: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'admin@cargobit.eu', description: 'Admin email address' },
      password: { type: 'string', format: 'password', example: '••••••••', description: 'Admin password' },
    },
  },
  AdminLoginStep1Response: {
    type: 'object',
    required: ['requires_2fa'],
    properties: {
      requires_2fa: { 
        type: 'boolean', 
        example: true, 
        description: 'Whether 2FA is required for this account' 
      },
      email: { 
        type: 'string', 
        example: 'admin@cargobit.eu', 
        description: 'Email address (for confirmation)' 
      },
    },
  },
  AdminLoginStep2Request: {
    type: 'object',
    required: ['email', 'code'],
    properties: {
      email: { 
        type: 'string', 
        format: 'email', 
        example: 'admin@cargobit.eu', 
        description: 'Admin email address (must match step 1)' 
      },
      code: { 
        type: 'string', 
        example: '123456', 
        minLength: 6, 
        maxLength: 8,
        description: '6-digit TOTP code or 8-character backup code' 
      },
    },
  },
  AdminLoginTokenResponse: {
    type: 'object',
    required: ['access_token', 'token_type', 'expires_in', 'admin'],
    properties: {
      access_token: { 
        type: 'string', 
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 
        description: 'JWT access token for API authentication' 
      },
      token_type: { 
        type: 'string', 
        example: 'bearer', 
        description: 'Token type (always "bearer")' 
      },
      expires_in: { 
        type: 'integer', 
        example: 28800, 
        description: 'Token expiry in seconds (8 hours)' 
      },
      admin: {
        type: 'object',
        description: 'Admin user information',
        properties: {
          id: { type: 'string', example: 'clx123abc', description: 'Admin user ID' },
          email: { type: 'string', example: 'admin@cargobit.eu', description: 'Admin email' },
          role: { type: 'string', enum: ['ADMIN', 'FINANCE', 'SUPPORT'], example: 'ADMIN', description: 'Admin role' },
        },
      },
    },
  },
  AdminMeResponse: {
    type: 'object',
    properties: {
      admin: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'FINANCE', 'SUPPORT'] },
          is2faEnabled: { type: 'boolean' },
        },
      },
    },
  },

  // Admin Roles
  AdminRole: {
    type: 'string',
    enum: ['ADMIN', 'FINANCE', 'SUPPORT'],
    description: 'Admin user role with specific permissions',
  },

  // Payment Schemas
  PaymentListResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/Payment' },
      },
      total: { type: 'integer' },
      limit: { type: 'integer' },
      offset: { type: 'integer' },
      hasMore: { type: 'boolean' },
    },
  },
  Payment: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      paymentIntentId: { type: 'string' },
      chargeId: { type: 'string' },
      jobId: { type: 'string' },
      currency: { type: 'string', example: 'EUR' },
      status: {
        type: 'string',
        enum: ['SUCCEEDED', 'PENDING', 'FAILED', 'REFUNDED', 'PARTIAL_REFUNDED', 'CANCELLED'],
      },
      amountCents: { type: 'integer' },
      amountEur: { type: 'number' },
      platformFeeCents: { type: 'integer' },
      refundedCents: { type: 'integer' },
      refundableCents: { type: 'integer' },
      shipper: { $ref: '#/components/schemas/PaymentUser' },
      transporter: { $ref: '#/components/schemas/PaymentUser' },
      refunds: {
        type: 'array',
        items: { $ref: '#/components/schemas/Refund' },
      },
      walletTransactions: {
        type: 'array',
        items: { $ref: '#/components/schemas/WalletTransaction' },
      },
      auditTrail: {
        type: 'array',
        items: { $ref: '#/components/schemas/AuditEvent' },
      },
      createdAt: { type: 'string', format: 'date-time' },
      paidAt: { type: 'string', format: 'date-time' },
    },
  },
  PaymentUser: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
    },
  },
  Refund: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      refundId: { type: 'string' },
      amountCents: { type: 'integer' },
      amountEur: { type: 'number' },
      reason: { type: 'string' },
      status: { type: 'string', enum: ['PENDING', 'SUCCEEDED', 'FAILED'] },
      createdAt: { type: 'string', format: 'date-time' },
      processedAt: { type: 'string', format: 'date-time' },
    },
  },
  WalletTransaction: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      walletId: { type: 'string' },
      walletOwnerType: { type: 'string', enum: ['shipper', 'transporter', 'company', 'platform'] },
      type: { type: 'string', enum: ['DEPOSIT', 'PAYOUT', 'FEE', 'COMMISSION', 'PAYMENT_IN', 'PAYMENT_OUT', 'REFUND'] },
      amount: { type: 'number' },
      currency: { type: 'string' },
      description: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  AuditEvent: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      eventType: { type: 'string' },
      oldStatus: { type: 'string' },
      newStatus: { type: 'string' },
      admin: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
        },
      },
      metadata: { type: 'object' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  // Refund Request
  RefundRequest: {
    type: 'object',
    required: ['jobId', 'type', 'reason'],
    properties: {
      jobId: { type: 'string', example: 'job_abc123' },
      type: {
        type: 'string',
        enum: ['full', 'partial', 'platform_fee_only'],
        description: 'Type of refund to process',
      },
      amountEur: {
        type: 'number',
        description: 'Required for partial refunds',
        example: 50.00,
      },
      reason: {
        type: 'string',
        example: 'Service not rendered',
        minLength: 10,
      },
    },
  },
  RefundResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'refund_initiated' },
      refundId: { type: 'string' },
      stripeRefundId: { type: 'string' },
      amountCents: { type: 'integer' },
      amountEur: { type: 'number' },
      currency: { type: 'string' },
      refundStatus: { type: 'string' },
      processedBy: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' },
        },
      },
    },
  },

  // Dispute Schemas
  DisputeListResponse: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/Dispute' },
      },
      total: { type: 'integer' },
      limit: { type: 'integer' },
      offset: { type: 'integer' },
      hasMore: { type: 'boolean' },
    },
  },
  Dispute: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      jobId: { type: 'string' },
      createdById: { type: 'string' },
      createdBy: { type: 'string' },
      reason: { type: 'string', enum: ['DAMAGE', 'DELAY', 'WRONG_DELIVERY', 'PRICE_DISPUTE', 'OTHER'] },
      subject: { type: 'string' },
      description: { type: 'string' },
      disputedAmountCents: { type: 'integer' },
      disputedAmountEur: { type: 'number' },
      status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
      assignedTo: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
        },
      },
      createdAt: { type: 'string', format: 'date-time' },
      resolvedAt: { type: 'string', format: 'date-time' },
    },
  },
  DisputeDetail: {
    allOf: [
      { $ref: '#/components/schemas/Dispute' },
      {
        type: 'object',
        properties: {
          shipper: { $ref: '#/components/schemas/PaymentUser' },
          transporter: { $ref: '#/components/schemas/PaymentUser' },
          messages: {
            type: 'array',
            items: { $ref: '#/components/schemas/DisputeMessage' },
          },
          resolution: { type: 'string', enum: ['refund_full', 'refund_partial', 'reject', 'other'] },
          resolutionNote: { type: 'string' },
          refundAmountCents: { type: 'integer' },
        },
      },
    ],
  },
  DisputeMessage: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      senderId: { type: 'string' },
      senderEmail: { type: 'string' },
      senderRole: { type: 'string', enum: ['shipper', 'transporter', 'admin'] },
      message: { type: 'string' },
      attachments: {
        type: 'array',
        items: { type: 'string' },
      },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  ResolveDisputeRequest: {
    type: 'object',
    required: ['resolution'],
    properties: {
      resolution: {
        type: 'string',
        enum: ['refund_full', 'refund_partial', 'reject', 'other'],
      },
      refundAmountCents: {
        type: 'integer',
        description: 'Required for refund_partial',
      },
      note: { type: 'string' },
    },
  },

  // Error Response
  ErrorResponse: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Unauthorized - No token provided' },
    },
  },

  // Unauthorized Response
  UnauthorizedResponse: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Unauthorized - Invalid token' },
    },
  },

  // Forbidden Response
  ForbiddenResponse: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Forbidden - Insufficient role' },
    },
  },
};

// ============================================
// COMMON RESPONSES
// ============================================

const commonResponses = {
  Unauthorized: {
    description: 'Unauthorized - Missing or invalid token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/UnauthorizedResponse' },
      },
    },
  },
  Forbidden: {
    description: 'Forbidden - Insufficient role or permissions',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ForbiddenResponse' },
      },
    },
  },
  BadRequest: {
    description: 'Bad Request - Invalid input',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      },
    },
  },
  NotFound: {
    description: 'Not Found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      },
    },
  },
  InternalError: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
      },
    },
  },
};

// ============================================
// PATHS
// ============================================

const paths: OpenAPISpec['paths'] = {
  // ============================================
  // AUTH ENDPOINTS (No auth required)
  // ============================================
  '/api/admin/auth/login-step1': {
    post: {
      tags: ['Auth'],
      summary: 'Admin Login Step 1 - Verify credentials',
      description: `
Verifies admin email and password. Returns whether 2FA is required for the account.

**Error Cases:**
- ❌ Email does not exist → 401 Unauthorized "Invalid credentials"
- ❌ Wrong password → 401 Unauthorized "Invalid credentials"
- ❌ Admin deactivated → 403 Forbidden "Account deactivated"
- ❌ Account locked (too many failed attempts) → 403 Forbidden "Account locked"
- ❌ Validation error → 400 Bad Request

**Security:**
- No JWT is issued in Step 1 (correct behavior)
- Failed attempts are logged and tracked
- Account lockout after 5 failed attempts for 30 minutes
      `,
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminLoginStep1Request' },
            examples: {
              validRequest: {
                summary: 'Valid login request',
                value: { email: 'admin@cargobit.eu', password: 'SecureP@ss123' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Credentials verified - proceed to Step 2 if 2FA enabled',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminLoginStep1Response' },
              examples: {
                with2fa: {
                  summary: 'Account with 2FA enabled',
                  value: { requires_2fa: true, email: 'admin@cargobit.eu' },
                },
                without2fa: {
                  summary: 'Account without 2FA',
                  value: { requires_2fa: false, email: 'admin@cargobit.eu' },
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad Request - Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                validationError: {
                  summary: 'Validation failed',
                  value: { error: 'Validierungsfehler', code: 'VALIDATION_ERROR', details: { errors: ['Ungültige E-Mail-Adresse'] } },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized - Invalid credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                invalidCredentials: {
                  summary: 'Invalid email or password',
                  value: { error: 'Ungültige Anmeldedaten', code: 'INVALID_CREDENTIALS' },
                },
              },
            },
          },
        },
        '403': {
          description: 'Forbidden - Account disabled or locked',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                deactivated: {
                  summary: 'Account deactivated',
                  value: { error: 'Konto deaktiviert', code: 'ACCOUNT_DISABLED' },
                },
                locked: {
                  summary: 'Account locked due to failed attempts',
                  value: { error: 'Konto gesperrt. Versuchen Sie es in 25 Minuten erneut.', code: 'ACCOUNT_DISABLED' },
                },
              },
            },
          },
        },
        '500': {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/admin/auth/login-step2': {
    post: {
      tags: ['Auth'],
      summary: 'Admin Login Step 2 - Verify 2FA and get JWT token',
      description: `
Verifies 2FA code (if enabled) and issues JWT access token with role-based payload.

**JWT Payload Structure:**
\`\`\`json
{
  "sub": "admin-uuid",     // Admin user ID
  "role": "ADMIN",         // ADMIN | FINANCE | SUPPORT
  "iat": 1713620000,       // Issued at (Unix timestamp)
  "exp": 1713663200        // Expiration (Unix timestamp)
}
\`\`\`

**TOTP Verification:**
- Standard RFC 6238 TOTP with SHA-1
- 6 digits, 30-second period
- Window tolerance: ±30 seconds

**Backup Codes:**
- 8-character hex codes
- Single-use, removed after successful verification

**Error Cases:**
- ❌ Email does not exist → 401 Unauthorized
- ❌ Invalid 2FA code → 401 Unauthorized
- ❌ 2FA code expired → 401 Unauthorized (outside window)
- ❌ Account deactivated → 403 Forbidden
- ❌ Account locked → 403 Forbidden
- ❌ Validation error → 400 Bad Request
      `,
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminLoginStep2Request' },
            examples: {
              totpCode: {
                summary: 'TOTP code',
                value: { email: 'admin@cargobit.eu', code: '123456' },
              },
              backupCode: {
                summary: 'Backup code',
                value: { email: 'admin@cargobit.eu', code: 'A1B2C3D4' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Login successful - JWT token issued',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminLoginTokenResponse' },
              examples: {
                success: {
                  summary: 'Successful login',
                  value: {
                    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    token_type: 'bearer',
                    expires_in: 28800,
                    admin: {
                      id: 'clx123abc',
                      email: 'admin@cargobit.eu',
                      role: 'ADMIN',
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad Request - Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                validationError: {
                  summary: 'Validation failed',
                  value: { error: 'Validierungsfehler', code: 'VALIDATION_ERROR', details: { errors: ['Code muss 6-stellig sein'] } },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized - Invalid credentials or 2FA code',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                invalid2fa: {
                  summary: 'Invalid 2FA code',
                  value: { error: 'Ungültiger 2FA-Code', code: 'INVALID_2FA' },
                },
                invalidCredentials: {
                  summary: 'Invalid credentials',
                  value: { error: 'Ungültige Anmeldedaten', code: 'INVALID_CREDENTIALS' },
                },
              },
            },
          },
        },
        '403': {
          description: 'Forbidden - Account disabled or locked',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                deactivated: {
                  summary: 'Account deactivated',
                  value: { error: 'Konto deaktiviert', code: 'ACCOUNT_DISABLED' },
                },
                locked: {
                  summary: 'Account locked',
                  value: { error: 'Konto gesperrt. Versuchen Sie es in 15 Minuten erneut.', code: 'ACCOUNT_DISABLED' },
                },
              },
            },
          },
        },
        '500': {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  '/api/admin/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get current admin user',
      description: 'Returns the currently authenticated admin user.',
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Current admin user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdminMeResponse' },
            },
          },
        },
        '401': commonResponses.Unauthorized,
      },
    },
  },
  '/api/admin/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Admin logout',
      description: 'Invalidates the current session.',
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Logged out successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Logged out successfully' },
                },
              },
            },
          },
        },
        '401': commonResponses.Unauthorized,
      },
    },
  },

  // ============================================
  // PAYMENTS ENDPOINTS (ADMIN, FINANCE)
  // ============================================
  '/api/admin/payments': {
    get: {
      tags: ['Payments'],
      summary: 'List all payments (Admin/Finance)',
      description: `
Returns a paginated list of payments with filtering capabilities.

**RBAC:** Requires ADMIN or FINANCE role.

**Query Parameters:**
- \`status\` - Filter by payment status (SUCCEEDED, PENDING, FAILED, REFUNDED, PARTIAL_REFUNDED, CANCELLED)
- \`shipperId\` - Filter by shipper user ID
- \`jobId\` - Filter by job/transport ID
- \`search\` - Search by payment intent ID, charge ID, or job ID
- \`from\` - Date range start (ISO string)
- \`to\` - Date range end (ISO string)
- \`limit\` - Page size (default: 100)
- \`offset\` - Page offset (default: 0)

**Response includes:**
- Payment summary with shipper/transporter info
- Amounts in cents and EUR
- Refunded amounts
- Platform fees
      `,
      security: [{ BearerAuth: [] }],
      parameters: [
        { 
          name: 'status', 
          in: 'query', 
          schema: { 
            type: 'string',
            enum: ['SUCCEEDED', 'PENDING', 'FAILED', 'REFUNDED', 'PARTIAL_REFUNDED', 'CANCELLED']
          }, 
          description: 'Filter by payment status' 
        },
        { name: 'shipperId', in: 'query', schema: { type: 'string' }, description: 'Filter by shipper user ID' },
        { name: 'jobId', in: 'query', schema: { type: 'string' }, description: 'Filter by job/transport ID' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by payment intent, charge ID, or job ID' },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Date range start' },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Date range end' },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 }, description: 'Page size' },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Page offset' },
      ],
      responses: {
        '200': {
          description: 'List of payments with pagination',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentListResponse' },
              examples: {
                success: {
                  summary: 'Successful response',
                  value: {
                    items: [
                      {
                        id: 'pay_abc123',
                        paymentIntentId: 'pi_3QHxYZK8vLqD1234',
                        chargeId: 'ch_abc123',
                        jobId: 'job_xyz789',
                        shipperId: 'user_shipper1',
                        shipperName: 'Max Mustermann',
                        shipperEmail: 'shipper@example.com',
                        transporterId: 'user_trans1',
                        transporterName: 'Anna Schmidt',
                        amountCents: 25000,
                        amountEur: 250.00,
                        currency: 'EUR',
                        platformFeeCents: 875,
                        platformFeeEur: 8.75,
                        refundedCents: 0,
                        refundedEur: 0,
                        status: 'SUCCEEDED',
                        createdAt: '2024-04-20T10:30:00Z',
                        paidAt: '2024-04-20T10:30:05Z',
                      }
                    ],
                    total: 150,
                    limit: 100,
                    offset: 0,
                    hasMore: true,
                  },
                },
              },
            },
          },
        },
        '400': commonResponses.BadRequest,
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
      },
    },
  },
  '/api/admin/payments/{id}': {
    get: {
      tags: ['Payments'],
      summary: 'Get payment details (Admin/Finance)',
      description: `
Returns detailed payment information including refunds, wallet transactions, and audit trail.

**RBAC:** Requires ADMIN or FINANCE role.

**Includes:**
- Full payment info with amounts in cents and EUR
- Shipper and transporter details
- Refund history
- Wallet transactions (fee distribution, payouts)
- Audit trail (status changes, admin actions)

**Amounts calculated:**
- \`amount_cents\` / \`amount_eur\` - Original payment amount
- \`platform_fee_cents\` / \`platform_fee_eur\` - Platform fee (3.5%)
- \`transporter_amount_cents\` / \`transporter_amount_eur\` - Transporter payout
- \`refunded_cents\` / \`refunded_eur\` - Total refunded
- \`refundable_cents\` / \`refundable_eur\` - Remaining refundable
      `,
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Payment ID' },
      ],
      responses: {
        '200': {
          description: 'Payment details with related data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Payment' },
              examples: {
                success: {
                  summary: 'Successful response',
                  value: {
                    id: 'pay_abc123',
                    paymentIntentId: 'pi_3QHxYZK8vLqD1234',
                    chargeId: 'ch_abc123',
                    jobId: 'job_xyz789',
                    currency: 'EUR',
                    status: 'SUCCEEDED',
                    description: 'Transport Munich to Berlin',
                    amountCents: 25000,
                    amountEur: 250.00,
                    platformFeeCents: 875,
                    platformFeeEur: 8.75,
                    transporterAmountCents: 24125,
                    transporterAmountEur: 241.25,
                    refundedCents: 0,
                    refundedEur: 0,
                    refundableCents: 25000,
                    refundableEur: 250.00,
                    shipper: { id: 'user_shipper1', name: 'Max Mustermann', email: 'shipper@example.com' },
                    transporter: { id: 'user_trans1', name: 'Anna Schmidt', email: 'transporter@example.com' },
                    refunds: [],
                    walletTransactions: [
                      { id: 'wt_1', walletId: 'w_shipper', walletOwnerType: 'shipper', type: 'PAYMENT_OUT', amount: -25000, currency: 'EUR' },
                      { id: 'wt_2', walletId: 'w_platform', walletOwnerType: 'platform', type: 'FEE', amount: 875, currency: 'EUR' },
                      { id: 'wt_3', walletId: 'w_trans', walletOwnerType: 'transporter', type: 'PAYMENT_IN', amount: 24125, currency: 'EUR' },
                    ],
                    auditTrail: [
                      { id: 'ae_1', eventType: 'created', newStatus: 'PENDING', createdAt: '2024-04-20T10:30:00Z' },
                      { id: 'ae_2', eventType: 'payment_succeeded', oldStatus: 'PENDING', newStatus: 'SUCCEEDED', createdAt: '2024-04-20T10:30:05Z' },
                    ],
                    createdAt: '2024-04-20T10:30:00Z',
                    paidAt: '2024-04-20T10:30:05Z',
                  },
                },
              },
            },
          },
        },
        '400': commonResponses.BadRequest,
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
        '404': commonResponses.NotFound,
      },
    },
  },

  // ============================================
  // REFUND ENDPOINTS (ADMIN, FINANCE)
  // ============================================
  '/api/admin/refund': {
    get: {
      tags: ['Refunds'],
      summary: 'Calculate refund amounts (Admin/Finance)',
      description: `
Returns refund calculation for a job payment.

**RBAC:** Requires ADMIN or FINANCE role with payments:read permission.

**Returns:**
- Total paid amount
- Platform fee amount
- Transporter amount
- Already refunded amount
- Maximum refundable amount
      `,
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'jobId', in: 'query', required: true, schema: { type: 'string' }, description: 'Job/Transport ID' },
      ],
      responses: {
        '200': {
          description: 'Refund calculation breakdown',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  paymentStatus: { type: 'string' },
                  totalPaidEur: { type: 'number', example: 250.00 },
                  platformFeeEur: { type: 'number', example: 8.75 },
                  transporterAmountEur: { type: 'number', example: 241.25 },
                  alreadyRefundedEur: { type: 'number', example: 0 },
                  maxRefundableEur: { type: 'number', example: 250.00 },
                  breakdownCents: { type: 'object' },
                },
              },
            },
          },
        },
        '400': commonResponses.BadRequest,
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
        '404': commonResponses.NotFound,
      },
    },
    post: {
      tags: ['Refunds'],
      summary: 'Process a refund via Stripe (Admin/Finance)',
      description: `
Initiates a refund for a job payment through Stripe.

**RBAC:** Requires ADMIN or FINANCE role with refunds:create permission.

**Refund Types:**
- \`full\` - Refund entire remaining amount
- \`partial\` - Refund specific amount (requires amountEur)
- \`platform_fee_only\` - Refund only the platform fee

**Idempotency:**
Uses Stripe idempotency keys with format: \`refund_{paymentId}_{amountCents}\`
This prevents duplicate refunds from:
- UI double-clicks
- Network retries
- Admin page reloads

**Workflow:**
1. Verifies payment exists and is refundable
2. Creates Stripe refund with idempotency key
3. Creates local refund record
4. Updates payment status (SUCCEEDED → PARTIALLY_REFUNDED → REFUNDED)
5. Creates audit log

**Wallet Sync:**
Wallet corrections happen asynchronously via Stripe webhook (charge.refunded event).
      `,
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RefundRequest' },
            examples: {
              fullRefund: {
                summary: 'Full refund',
                value: { jobId: 'job_xyz789', type: 'full', reason: 'Service not rendered' },
              },
              partialRefund: {
                summary: 'Partial refund',
                value: { jobId: 'job_xyz789', type: 'partial', amountEur: 50.00, reason: 'Partial service issue' },
              },
              platformFeeRefund: {
                summary: 'Platform fee only',
                value: { jobId: 'job_xyz789', type: 'platform_fee_only', reason: 'Fee waiver for VIP customer' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Refund initiated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefundResponse' },
              examples: {
                success: {
                  summary: 'Successful refund',
                  value: {
                    status: 'refund_initiated',
                    refundId: 'refund_abc123',
                    stripeRefundId: 're_1PxyzK8vLqD1234',
                    amountCents: 25000,
                    amountEur: 250.00,
                    currency: 'EUR',
                    refundStatus: 'SUCCEEDED',
                    processedBy: {
                      id: 'admin_123',
                      email: 'admin@cargobit.eu',
                      role: 'FINANCE',
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad Request - Invalid refund parameters',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                noPayment: {
                  summary: 'No successful payment',
                  value: { error: 'No successful payment found for this job' },
                },
                exceedsAmount: {
                  summary: 'Exceeds refundable amount',
                  value: { error: 'Refund amount (300.00 EUR) exceeds refundable amount (250.00 EUR)' },
                },
                alreadyRefunded: {
                  summary: 'Already refunded',
                  value: { error: 'Payment already fully refunded' },
                },
              },
            },
          },
        },
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
        '404': commonResponses.NotFound,
        '502': {
          description: 'Bad Gateway - Stripe API error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                stripeError: {
                  summary: 'Stripe API error',
                  value: { error: 'Stripe error: Charge ch_abc123 has already been fully refunded' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ============================================
  // DISPUTES ENDPOINTS (ADMIN, SUPPORT)
  // ============================================
  '/api/admin/disputes': {
    get: {
      tags: ['Disputes'],
      summary: 'List all disputes',
      description: 'Returns a paginated list of disputes. Requires ADMIN or SUPPORT role.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
        { name: 'reason', in: 'query', schema: { type: 'string' }, description: 'Filter by reason' },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
      ],
      responses: {
        '200': {
          description: 'List of disputes',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DisputeListResponse' },
            },
          },
        },
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
      },
    },
  },
  '/api/admin/disputes/{disputeId}': {
    get: {
      tags: ['Disputes'],
      summary: 'Get dispute details',
      description: 'Returns detailed dispute information including messages. Requires ADMIN or SUPPORT role.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'disputeId', in: 'path', required: true, schema: { type: 'string' }, description: 'Dispute ID' },
      ],
      responses: {
        '200': {
          description: 'Dispute details',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DisputeDetail' },
            },
          },
        },
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
        '404': commonResponses.NotFound,
      },
    },
  },
  '/api/admin/disputes/{disputeId}/resolve': {
    post: {
      tags: ['Disputes'],
      summary: 'Resolve a dispute',
      description: 'Resolves a dispute with optional refund. Requires ADMIN or SUPPORT role with disputes:write permission.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'disputeId', in: 'path', required: true, schema: { type: 'string' }, description: 'Dispute ID' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ResolveDisputeRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Dispute resolved',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string', example: 'RESOLVED' },
                  resolution: { type: 'string' },
                  refundAmountCents: { type: 'integer' },
                },
              },
            },
          },
        },
        '400': commonResponses.BadRequest,
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
        '404': commonResponses.NotFound,
      },
    },
  },

  // ============================================
  // USERS ENDPOINTS (ADMIN, SUPPORT)
  // ============================================
  '/api/admin/users': {
    get: {
      tags: ['Users'],
      summary: 'List users',
      description: 'Returns a paginated list of users. Requires ADMIN or SUPPORT role.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or email' },
        { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
        { name: 'role', in: 'query', schema: { type: 'string' }, description: 'Filter by role' },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
      ],
      responses: {
        '200': {
          description: 'List of users',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { type: 'object' } },
                  total: { type: 'integer' },
                },
              },
            },
          },
        },
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
      },
    },
  },
  '/api/admin/users/{userId}': {
    get: {
      tags: ['Users'],
      summary: 'Get user details',
      description: 'Returns detailed user information. Requires ADMIN or SUPPORT role.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' }, description: 'User ID' },
      ],
      responses: {
        '200': {
          description: 'User details',
        },
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
        '404': commonResponses.NotFound,
      },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update user',
      description: 'Updates user status or other fields. Requires ADMIN role or SUPPORT with appropriate permissions.',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' }, description: 'User ID' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['ACTIVE', 'BLOCKED', 'SUSPENDED'] },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'User updated',
        },
        '400': commonResponses.BadRequest,
        '401': commonResponses.Unauthorized,
        '403': commonResponses.Forbidden,
        '404': commonResponses.NotFound,
      },
    },
  },

  // ============================================
  // STATS ENDPOINTS
  // ============================================
  '/api/admin/stats': {
    get: {
      tags: ['Dashboard'],
      summary: 'Get admin dashboard statistics',
      description: 'Returns key metrics for the admin dashboard.',
      security: [{ BearerAuth: [] }],
      responses: {
        '200': {
          description: 'Dashboard statistics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  totalPayments: { type: 'integer' },
                  totalRevenueEur: { type: 'number' },
                  pendingDisputes: { type: 'integer' },
                  activeUsers: { type: 'integer' },
                  activeJobs: { type: 'integer' },
                },
              },
            },
          },
        },
        '401': commonResponses.Unauthorized,
      },
    },
  },
};

// ============================================
// TAGS
// ============================================

const tags: OpenAPISpec['tags'] = [
  {
    name: 'Auth',
    description: 'Admin authentication endpoints (login with 2FA, logout, token verification)',
  },
  {
    name: 'Payments',
    description: 'Payment management (requires ADMIN or FINANCE role)',
  },
  {
    name: 'Refunds',
    description: 'Refund processing (requires ADMIN or FINANCE role with refunds:create permission)',
  },
  {
    name: 'Disputes',
    description: 'Dispute resolution (requires ADMIN or SUPPORT role)',
  },
  {
    name: 'Users',
    description: 'User management (requires ADMIN or SUPPORT role)',
  },
  {
    name: 'Dashboard',
    description: 'Dashboard statistics and overview',
  },
];

// ============================================
// MAIN SPEC
// ============================================

export function generateOpenAPISpec(): OpenAPISpec {
  return {
    openapi: '3.0.3',
    info: {
      title: 'CargoBit Admin API',
      version: '2.0.0',
      description: `
# CargoBit Admin API

REST API for the CargoBit Admin Panel with Role-Based Access Control (RBAC).

## Authentication

All endpoints (except login) require a Bearer token obtained through the 2-step login process:

1. **POST /api/admin/auth/login-step1** - Submit email + password
2. **POST /api/admin/auth/login-step2** - Submit 2FA code (if enabled) → receive access token

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access: System, Users, Finance, Disputes, Payments, Refunds |
| **FINANCE** | Payments, Refunds, Payouts, Disputes (read-only), Jobs (read-only) |
| **SUPPORT** | Disputes, Jobs, Users (block/unblock), No direct payouts/refunds |

## Security

- All requests must include \`Authorization: Bearer <token>\` header
- Tokens expire after 8 hours
- Failed login attempts trigger account lockout after 5 failures
- 2FA is recommended for all admin accounts
      `,
      contact: {
        name: 'CargoBit API Support',
        email: 'api@cargobit.eu',
      },
    },
    servers: [
      {
        url: 'https://api.cargobit.eu',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/admin/auth/login-step2. Token contains { sub: adminId, role: "ADMIN" | "FINANCE" | "SUPPORT" }',
        },
      },
      schemas,
      responses: commonResponses,
    },
    paths,
    tags,
  };
}

// Export spec as JSON string
export function getOpenAPIJson(): string {
  return JSON.stringify(generateOpenAPISpec(), null, 2);
}
