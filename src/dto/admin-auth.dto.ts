/**
 * CargoBit Admin Auth DTOs
 * 
 * Data Transfer Objects for admin authentication endpoints.
 * Uses TypeScript for type safety and custom validation.
 */

// ============================================
// LOGIN STEP 1 DTOs
// ============================================

/**
 * Request DTO for Admin Login Step 1
 * 
 * Validates email and password inputs.
 */
export class LoginStep1Dto {
  /**
   * Admin email address
   * @example "admin@cargobit.eu"
   */
  email: string;

  /**
   * Admin password
   * @example "••••••••"
   */
  password: string;

  /**
   * Validate the DTO
   * Returns array of error messages, empty if valid
   */
  validate(): string[] {
    const errors: string[] = [];

    // Email validation
    if (!this.email) {
      errors.push('E-Mail ist erforderlich');
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Ungültige E-Mail-Adresse');
    }

    // Password validation
    if (!this.password) {
      errors.push('Passwort ist erforderlich');
    } else if (this.password.length < 1) {
      errors.push('Passwort darf nicht leer sein');
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create from plain object
   */
  static fromObject(obj: Record<string, unknown>): LoginStep1Dto {
    const dto = new LoginStep1Dto();
    dto.email = String(obj.email || '').trim().toLowerCase();
    dto.password = String(obj.password || '');
    return dto;
  }
}

/**
 * Response DTO for Admin Login Step 1
 */
export class LoginStep1ResponseDto {
  /**
   * Whether 2FA is required for this account
   * @example true
   */
  requires_2fa: boolean;

  /**
   * Email address (for confirmation)
   * @example "admin@cargobit.eu"
   */
  email?: string;
}

// ============================================
// LOGIN STEP 2 DTOs
// ============================================

/**
 * Request DTO for Admin Login Step 2 (2FA)
 */
export class LoginStep2Dto {
  /**
   * Admin email address (must match step 1)
   * @example "admin@cargobit.eu"
   */
  email: string;

  /**
   * 6-digit TOTP code or backup code
   * @example "123456"
   */
  code: string;

  /**
   * Validate the DTO
   */
  validate(): string[] {
    const errors: string[] = [];

    // Email validation
    if (!this.email) {
      errors.push('E-Mail ist erforderlich');
    }

    // Code validation
    if (!this.code) {
      errors.push('Code ist erforderlich');
    } else if (!/^\d{6}$/.test(this.code) && !/^[A-F0-9]{8}$/i.test(this.code)) {
      // Must be 6 digits (TOTP) or 8 hex chars (backup code)
      errors.push('Code muss 6-stellig sein oder ein Backup-Code sein');
    }

    return errors;
  }

  /**
   * Create from plain object
   */
  static fromObject(obj: Record<string, unknown>): LoginStep2Dto {
    const dto = new LoginStep2Dto();
    dto.email = String(obj.email || '').trim().toLowerCase();
    dto.code = String(obj.code || '').trim().toUpperCase();
    return dto;
  }
}

/**
 * Response DTO for Admin Login Step 2
 */
export class LoginStep2ResponseDto {
  /**
   * JWT access token
   */
  access_token: string;

  /**
   * Token type (always "bearer")
   */
  token_type: string;

  /**
   * Token expiry in seconds
   */
  expires_in: number;

  /**
   * Admin user info
   */
  admin: {
    id: string;
    email: string;
    role: 'ADMIN' | 'FINANCE' | 'SUPPORT';
  };
}

// ============================================
// ERROR RESPONSE DTO
// ============================================

/**
 * Standard error response DTO
 */
export class ErrorResponseDto {
  /**
   * Error message
   */
  error: string;

  /**
   * Error code (optional)
   */
  code?: string;

  /**
   * Additional details (optional)
   */
  details?: Record<string, unknown>;
}

// ============================================
// VALIDATION RESULT
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a DTO and return result
 */
export function validateDto(dto: { validate(): string[] }): ValidationResult {
  const errors = dto.validate();
  return {
    valid: errors.length === 0,
    errors,
  };
}
