/**
 * CargoBit Admin Auth Service
 * 
 * Admin authentication with RBAC (Role-Based Access Control).
 * 
 * Roles:
 * - ADMIN: Full access (System, Users, Finance, Disputes)
 * - FINANCE: Payments, Refunds, Payouts
 * - SUPPORT: Disputes, Jobs, User-Sperren (no direct payouts/refunds)
 * 
 * Python equivalent:
 * ```python
 * class AdminLoginRequest(BaseModel):
 *     email: str
 *     password: str
 * 
 * class AdminLoginStep1Response(BaseModel):
 *     requires_2fa: bool
 * 
 * @router.post("/admin/login_step1", response_model=AdminLoginStep1Response)
 * def admin_login_step1(req: AdminLoginRequest, db: Session = Depends(get_db)):
 *     user = get_admin_by_email(db, req.email)
 *     if not user or not verify_password(req.password, user.password_hash):
 *         raise HTTPException(401, "Invalid credentials")
 *     return {"requires_2fa": user.is_2fa_enabled}
 * ```
 */

import { prisma } from '@/lib/db';
import { AdminRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// ============================================
// TYPES
// ============================================

export interface AdminLoginStep1Request {
  email: string;
  password: string;
}

export interface AdminLoginStep1Response {
  requires2fa: boolean;
  email: string;
}

export interface AdminLoginStep2Request {
  email: string;
  code: string;
}

export interface AdminLoginTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  admin: {
    id: string;
    email: string;
    role: AdminRole;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  is2faEnabled: boolean;
}

export interface DecodedAdminToken {
  sub: string;      // Admin user ID
  role: AdminRole;
  iat: number;
  exp: number;
}

// ============================================
// CONFIGURATION
// ============================================

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'cargobit-admin-secret-change-in-production';
const TOKEN_EXPIRY_HOURS = 8;
const TOKEN_EXPIRY_SECONDS = TOKEN_EXPIRY_HOURS * 60 * 60;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

// ============================================
// ROLE PERMISSIONS
// ============================================

/**
 * Permission definitions per role.
 * 
 * ADMIN:     Full access to everything
 * FINANCE:   Payments, Refunds, Payouts (read + write)
 * SUPPORT:   Disputes, Jobs, User management (read + limited write, no payouts)
 */
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  ADMIN: [
    // Full access
    'payments:read',
    'payments:write',
    'refunds:create',
    'payouts:read',
    'payouts:create',
    'payouts:cancel',
    'disputes:read',
    'disputes:write',
    'jobs:read',
    'jobs:write',
    'users:read',
    'users:block',
    'users:unblock',
    'admin:read',
    'admin:write',
    'settings:read',
    'settings:write',
    'audit:read',
  ],
  FINANCE: [
    // Finance operations
    'payments:read',
    'payments:write',
    'refunds:create',
    'payouts:read',
    'payouts:create',
    'payouts:cancel',
    'disputes:read',  // Read-only for context
    'jobs:read',      // Read-only for context
    'audit:read',
  ],
  SUPPORT: [
    // Support operations (NO direct payouts/refunds)
    'disputes:read',
    'disputes:write',
    'jobs:read',
    'jobs:write',
    'users:read',
    'users:block',
    'users:unblock',
    'audit:read',
    // NO: 'payments:write'
    // NO: 'refunds:create'
    // NO: 'payouts:create'
    // NO: 'payouts:read'
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: AdminRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Require specific roles for an action.
 */
export function requireRoles(...allowedRoles: AdminRole[]) {
  return (role: AdminRole): boolean => {
    return allowedRoles.includes(role);
  };
}

// ============================================
// ADMIN AUTH SERVICE
// ============================================

export class AdminAuthService {
  
  // ============================================
  // LOGIN STEP 1: Email + Password
  // ============================================
  
  /**
   * Verify email and password, return if 2FA is required.
   * 
   * Python equivalent:
   * ```python
   * @router.post("/admin/login_step1", response_model=AdminLoginStep1Response)
   * def admin_login_step1(req: AdminLoginRequest, db: Session = Depends(get_db)):
   *     user = get_admin_by_email(db, req.email)
   *     if not user or not verify_password(req.password, user.password_hash):
   *         raise HTTPException(401, "Invalid credentials")
   *     return {"requires_2fa": user.is_2fa_enabled}
   * ```
   */
  async loginStep1(
    email: string,
    password: string,
    ipAddress: string
  ): Promise<{ success: true; data: AdminLoginStep1Response } | { success: false; error: string }> {
    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    // Invalid credentials
    if (!admin) {
      await this.logFailedAttempt(email, ipAddress, 'user_not_found');
      return { success: false, error: 'Ungültige Anmeldedaten' };
    }
    
    // Check if active
    if (!admin.isActive) {
      await this.logFailedAttempt(email, ipAddress, 'account_inactive');
      return { success: false, error: 'Konto deaktiviert' };
    }
    
    // Check lockout
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return { 
        success: false, 
        error: `Konto gesperrt. Versuchen Sie es in ${remainingMinutes} Minuten erneut.` 
      };
    }
    
    // Verify password
    const passwordValid = await this.verifyPassword(password, admin.passwordHash);
    if (!passwordValid) {
      await this.incrementFailedAttempts(admin.id);
      await this.logFailedAttempt(email, ipAddress, 'invalid_password');
      return { success: false, error: 'Ungültige Anmeldedaten' };
    }
    
    // Reset failed attempts on successful password
    await this.resetFailedAttempts(admin.id);
    
    return {
      success: true,
      data: {
        requires2fa: admin.is2faEnabled,
        email: admin.email,
      },
    };
  }
  
  // ============================================
  // LOGIN STEP 2: 2FA Code
  // ============================================
  
  /**
   * Verify 2FA code and issue JWT token.
   * 
   * Python equivalent:
   * ```python
   * @router.post("/admin/login_step2", response_model=AdminLoginTokenResponse)
   * def admin_login_step2(req: AdminLoginStep2Request, db: Session = Depends(get_db)):
   *     user = get_admin_by_email(db, req.email)
   *     if not user or not user.is_2fa_enabled:
   *         raise HTTPException(401, "Invalid")
   *     if not verify_totp(user.totp_secret, req.code):
   *         raise HTTPException(401, "Invalid 2FA code")
   *     token = create_admin_jwt({"sub": str(user.id), "role": user.role})
   *     return AdminLoginTokenResponse(access_token=token)
   * ```
   */
  async loginStep2(
    email: string,
    code: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ success: true; data: AdminLoginTokenResponse } | { success: false; error: string }> {
    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!admin || !admin.isActive) {
      return { success: false, error: 'Ungültige Anmeldedaten' };
    }
    
    // If 2FA is enabled, verify code
    if (admin.is2faEnabled) {
      const codeValid = await this.verify2faCode(admin.id, code, admin.totpSecret);
      if (!codeValid) {
        await this.incrementFailedAttempts(admin.id);
        return { success: false, error: 'Ungültiger 2FA-Code' };
      }
    }
    
    // Reset failed attempts
    await this.resetFailedAttempts(admin.id);
    
    // Create session and token
    const session = await this.createSession(admin.id, ipAddress, userAgent);
    
    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Create audit log
    await this.createAuditLog(admin.id, 'login', 'admin', admin.id, { ipAddress, userAgent });
    
    return {
      success: true,
      data: {
        accessToken: session.token,
        tokenType: 'bearer',
        expiresIn: TOKEN_EXPIRY_SECONDS,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      },
    };
  }
  
  // ============================================
  // TOKEN VERIFICATION
  // ============================================
  
  /**
   * Verify JWT token and return admin user.
   * 
   * Python equivalent:
   * ```python
   * def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
   *     try:
   *         payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
   *     except Exception:
   *         raise HTTPException(401, "Invalid token")
   *     admin_id = payload.get("sub")
   *     role = payload.get("role")
   *     user = db.query(AdminUser).filter(AdminUser.id == admin_id).one_or_none()
   *     if not user:
   *         raise HTTPException(401, "Admin not found")
   *     return user
   * ```
   */
  async verifyToken(token: string): Promise<AdminUser | null> {
    try {
      const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as DecodedAdminToken;
      
      const admin = await prisma.adminUser.findUnique({
        where: { id: decoded.sub },
      });
      
      if (!admin || !admin.isActive) {
        return null;
      }
      
      return {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        is2faEnabled: admin.is2faEnabled,
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Verify token and check role.
   * 
   * Python equivalent:
   * ```python
   * def require_role(*allowed_roles: str):
   *     def wrapper(user = Depends(get_current_admin)):
   *         if user.role not in allowed_roles:
   *             raise HTTPException(403, "Insufficient role")
   *         return user
   *     return wrapper
   * ```
   */
  async verifyTokenWithRole(
    token: string,
    allowedRoles: AdminRole[]
  ): Promise<{ admin: AdminUser; decoded: DecodedAdminToken } | null> {
    try {
      const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as DecodedAdminToken;
      
      if (!allowedRoles.includes(decoded.role)) {
        return null;
      }
      
      const admin = await prisma.adminUser.findUnique({
        where: { id: decoded.sub },
      });
      
      if (!admin || !admin.isActive) {
        return null;
      }
      
      return {
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          is2faEnabled: admin.is2faEnabled,
        },
        decoded,
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Check if admin has a specific permission.
   */
  async checkPermission(token: string, permission: string): Promise<boolean> {
    const admin = await this.verifyToken(token);
    if (!admin) return false;
    return hasPermission(admin.role, permission);
  }
  
  // ============================================
  // LOGOUT
  // ============================================
  
  async logout(token: string): Promise<void> {
    await prisma.adminSession.deleteMany({
      where: { token },
    });
  }
  
  // ============================================
  // 2FA MANAGEMENT
  // ============================================
  
  /**
   * Setup 2FA for admin user.
   */
  async setup2fa(adminId: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const secret = this.generateTotpSecret();
    const backupCodes = this.generateBackupCodes();
    
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    
    // Store secret (not yet enabled)
    await prisma.adminUser.update({
      where: { id: adminId },
      data: {
        totpSecret: secret,
        backupCodes: JSON.stringify(backupCodes),
      },
    });
    
    const qrCodeUrl = this.generateQRCodeUrl(secret, admin?.email || 'admin@cargobit.eu');
    
    return { secret, qrCodeUrl, backupCodes };
  }
  
  /**
   * Enable 2FA after verification.
   */
  async enable2fa(adminId: string, code: string): Promise<boolean> {
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    
    if (!admin?.totpSecret) {
      return false;
    }
    
    const valid = this.verifyTotp(admin.totpSecret, code);
    if (!valid) {
      return false;
    }
    
    await prisma.adminUser.update({
      where: { id: adminId },
      data: { is2faEnabled: true },
    });
    
    await this.createAuditLog(adminId, '2fa_enabled', 'admin', adminId);
    
    return true;
  }
  
  /**
   * Disable 2FA.
   */
  async disable2fa(adminId: string, code: string): Promise<boolean> {
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    
    if (!admin?.totpSecret) {
      return false;
    }
    
    const valid = this.verifyTotp(admin.totpSecret, code);
    if (!valid) {
      return false;
    }
    
    await prisma.adminUser.update({
      where: { id: adminId },
      data: {
        is2faEnabled: false,
        totpSecret: null,
        backupCodes: null,
      },
    });
    
    await this.createAuditLog(adminId, '2fa_disabled', 'admin', adminId);
    
    return true;
  }
  
  // ============================================
  // ADMIN USER MANAGEMENT
  // ============================================
  
  /**
   * Create a new admin user.
   */
  async createAdminUser(
    email: string,
    password: string,
    role: AdminRole,
    createdBy: string
  ): Promise<{ id: string; email: string; role: AdminRole }> {
    const passwordHash = await this.hashPassword(password);
    
    const admin = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
      },
    });
    
    await this.createAuditLog(createdBy, 'admin_created', 'admin', admin.id, { email, role });
    
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
  }
  
  /**
   * Update admin user role.
   */
  async updateAdminRole(
    adminId: string,
    newRole: AdminRole,
    updatedBy: string
  ): Promise<boolean> {
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    
    if (!admin) return false;
    
    await prisma.adminUser.update({
      where: { id: adminId },
      data: { role: newRole },
    });
    
    await this.createAuditLog(updatedBy, 'role_updated', 'admin', adminId, {
      oldRole: admin.role,
      newRole,
    });
    
    return true;
  }
  
  /**
   * Deactivate admin user.
   */
  async deactivateAdmin(adminId: string, deactivatedBy: string): Promise<boolean> {
    await prisma.adminUser.update({
      where: { id: adminId },
      data: { isActive: false },
    });
    
    // Invalidate all sessions
    await prisma.adminSession.deleteMany({
      where: { adminId },
    });
    
    await this.createAuditLog(deactivatedBy, 'admin_deactivated', 'admin', adminId);
    
    return true;
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  private async createSession(
    adminId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ token: string; refreshToken: string; id: string }> {
    const token = this.generateToken();
    const refreshToken = this.generateRefreshToken();
    const sessionId = crypto.randomUUID();
    
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await prisma.adminSession.create({
      data: {
        id: sessionId,
        adminId,
        token,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
        refreshExpiresAt,
      },
    });
    
    return { token, refreshToken, id: sessionId };
  }
  
  private generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
  
  private generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }
  
  private generateTotpSecret(): string {
    return crypto.randomBytes(20).toString('base32').substring(0, 32);
  }
  
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
  
  private generateQRCodeUrl(secret: string, email: string): string {
    const issuer = 'CargoBit-Admin';
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${issuer}:${encodedEmail}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }
  
  private verifyTotp(secret: string, code: string, window: number = 1): boolean {
    // Window = 1 allows ±30 seconds tolerance
    // Check current time and adjacent windows
    const counter = Math.floor(Date.now() / 1000 / 30);
    
    for (let i = -window; i <= window; i++) {
      const expectedCode = this.generateTotpCodeForCounter(secret, counter + i);
      if (code === expectedCode) {
        return true;
      }
    }
    return false;
  }
  
  private generateTotpCode(secret: string): string {
    const counter = Math.floor(Date.now() / 1000 / 30);
    return this.generateTotpCodeForCounter(secret, counter);
  }
  
  private generateTotpCodeForCounter(secret: string, counter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
    hmac.update(buffer);
    const digest = hmac.digest();
    
    const offset = digest[digest.length - 1] & 0x0f;
    const code = digest.readUInt32BE(offset) & 0x7fffffff;
    return (code % 1000000).toString().padStart(6, '0');
  }
  
  private async verify2faCode(adminId: string, code: string, totpSecret?: string | null): Promise<boolean> {
    // Check TOTP code with window tolerance (±30 seconds)
    if (totpSecret) {
      if (this.verifyTotp(totpSecret, code, 1)) {
        return true;
      }
    }
    
    // Check backup codes
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId },
    });
    
    if (admin?.backupCodes) {
      const backupCodes: string[] = JSON.parse(admin.backupCodes);
      if (backupCodes.includes(code.toUpperCase())) {
        // Remove used backup code
        const newBackupCodes = backupCodes.filter(c => c !== code.toUpperCase());
        await prisma.adminUser.update({
          where: { id: adminId },
          data: { backupCodes: JSON.stringify(newBackupCodes) },
        });
        return true;
      }
    }
    
    return false;
  }
  
  private async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }
  
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });
  }
  
  private async incrementFailedAttempts(adminId: string): Promise<void> {
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    const attempts = (admin?.failedAttempts || 0) + 1;
    
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await prisma.adminUser.update({
        where: { id: adminId },
        data: { failedAttempts: attempts, lockedUntil },
      });
    } else {
      await prisma.adminUser.update({
        where: { id: adminId },
        data: { failedAttempts: attempts },
      });
    }
  }
  
  private async resetFailedAttempts(adminId: string): Promise<void> {
    await prisma.adminUser.update({
      where: { id: adminId },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }
  
  private async logFailedAttempt(email: string, ipAddress: string, reason: string): Promise<void> {
    console.log(`[AdminAuth] Failed login attempt: ${email} from ${ipAddress} (${reason})`);
  }
  
  private async createAuditLog(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    data?: any
  ): Promise<void> {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        dataAfter: data ? JSON.stringify(data) : null,
      },
    });
  }
}

// ============================================
// EXPORTS
// ============================================

export const adminAuthService = new AdminAuthService();
export { AdminRole };
