// ============================================
// CARGOBIT AUTH SERVICE
// Authentication with 2FA Support
// ============================================

import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { fraudDetectionService, LoginContext } from './fraud-detection.service';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface AuthCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    roles: string[];
    status: UserStatus;
    requiresTwoFactor: boolean;
    twoFactorVerified: boolean;
  };
  token?: string;
  refreshToken?: string;
  error?: string;
  errorCode?: 'INVALID_CREDENTIALS' | 'ACCOUNT_BLOCKED' | 'TWO_FACTOR_REQUIRED' | 'TWO_FACTOR_INVALID' | 'SECURITY_CHECK_FAILED';
  securityFlags?: string[];
}

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceName?: string;
  ipAddress: string;
  lastActivity: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export interface PasswordResetRequest {
  email: string;
  ipAddress: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  ipAddress: string;
}

// ============================================
// CONFIGURATION
// ============================================

const SECURITY_CONFIG = {
  // Password requirements
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: true,

  // Session config
  sessionDurationHours: 24,
  refreshTokenDurationDays: 30,
  maxSessionsPerUser: 5,

  // 2FA config
  twoFactorRequiredForRoles: ['ADMIN', 'SUPPORT'],
  twoFactorCodeLength: 6,
  twoFactorCodeValiditySeconds: 30,
  backupCodesCount: 10,

  // Lockout config
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
};

// ============================================
// AUTH SERVICE CLASS
// ============================================

export class AuthService {
  // ============================================
  // LOGIN
  // ============================================

  async login(
    credentials: AuthCredentials,
    context: { ipAddress: string; userAgent: string; deviceId?: string }
  ): Promise<AuthResult> {
    const { email, password, twoFactorCode } = credentials;

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roles: { include: { role: true } },
        securityFlags: { where: { active: true } },
      },
    });

    if (!user) {
      // Log failed attempt
      await this.logFailedAttempt(email, context.ipAddress);
      return {
        success: false,
        error: 'Ungültige Anmeldedaten',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }

    // Check account status
    if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      return {
        success: false,
        error: 'Konto gesperrt oder suspendiert',
        errorCode: 'ACCOUNT_BLOCKED',
      };
    }

    // Check lockout
    const lockoutStatus = await this.checkLockout(user.id);
    if (lockoutStatus.isLocked) {
      return {
        success: false,
        error: `Konto vorübergehend gesperrt. Versuchen Sie es in ${lockoutStatus.remainingMinutes} Minuten erneut.`,
        errorCode: 'ACCOUNT_BLOCKED',
      };
    }

    // Verify password
    const passwordValid = await this.verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      await this.incrementFailedAttempts(user.id);
      await this.logFailedAttempt(email, context.ipAddress);
      return {
        success: false,
        error: 'Ungültige Anmeldedaten',
        errorCode: 'INVALID_CREDENTIALS',
      };
    }

    // Run fraud detection check
    const loginContext: LoginContext = {
      userId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceId: context.deviceId,
    };

    const fraudCheck = await fraudDetectionService.checkLoginPattern(loginContext);
    
    if (fraudCheck.recommendation === 'BLOCK') {
      // Create security flag and block login
      await fraudDetectionService.createSecurityFlag({
        userId: user.id,
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        notes: `Login blockiert: ${fraudCheck.details}`,
        metadata: { flags: fraudCheck.flags },
      });

      return {
        success: false,
        error: 'Sicherheitsüberprüfung fehlgeschlagen. Bitte kontaktieren Sie den Support.',
        errorCode: 'SECURITY_CHECK_FAILED',
        securityFlags: fraudCheck.flags.map(f => f.code),
      };
    }

    // Check if 2FA is required
    const requires2FA = await this.requiresTwoFactor(user.id, user.roles.map(r => r.role.name));
    const has2FA = await this.hasTwoFactorSetup(user.id);

    if (requires2FA || has2FA) {
      if (!twoFactorCode) {
        // Generate and send 2FA code
        await this.sendTwoFactorCode(user.id, context.ipAddress);
        return {
          success: false,
          error: '2FA-Code erforderlich',
          errorCode: 'TWO_FACTOR_REQUIRED',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles.map(r => r.role.name),
            status: user.status,
            requiresTwoFactor: true,
            twoFactorVerified: false,
          },
        };
      }

      // Verify 2FA code
      const codeValid = await this.verifyTwoFactorCode(user.id, twoFactorCode);
      if (!codeValid) {
        await this.incrementFailedAttempts(user.id);
        return {
          success: false,
          error: 'Ungültiger 2FA-Code',
          errorCode: 'TWO_FACTOR_INVALID',
        };
      }
    }

    // Reset failed attempts
    await this.resetFailedAttempts(user.id);

    // Create session
    const session = await this.createSession(user.id, context);

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(r => r.role.name),
        status: user.status,
        requiresTwoFactor: has2FA,
        twoFactorVerified: !!twoFactorCode,
      },
      token: session.token,
      refreshToken: session.refreshToken,
    };
  }

  // ============================================
  // REGISTRATION
  // ============================================

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    language: string;
    role: string;
    companyName?: string;
  }): Promise<AuthResult> {
    // Validate password
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: passwordValidation.errors.join(', '),
      };
    }

    // Check if email exists
    const existing = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return {
        success: false,
        error: 'E-Mail bereits registriert',
      };
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        language: data.language,
        status: 'PENDING',
      },
    });

    // Assign role
    const role = await db.role.findUnique({
      where: { name: data.role as any },
    });

    if (role) {
      await db.userRoleRelation.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    // Create wallet for user
    await db.wallet.create({
      data: {
        ownerUserId: user.id,
        status: 'ACTIVE',
      },
    });

    // Send verification email
    await this.sendVerificationEmail(user.id, user.email);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: [data.role],
        status: user.status,
        requiresTwoFactor: false,
        twoFactorVerified: false,
      },
    };
  }

  // ============================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================

  async setupTwoFactor(userId: string): Promise<TwoFactorSetup> {
    // Generate secret
    const secret = this.generateTwoFactorSecret();

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store setup (not yet enabled)
    await db.$executeRaw`
      INSERT INTO two_factor_setup (user_id, secret, backup_codes, enabled, created_at)
      VALUES (${userId}, ${secret}, ${JSON.stringify(backupCodes)}, false, ${new Date()})
      ON CONFLICT (user_id) DO UPDATE SET
        secret = ${secret},
        backup_codes = ${JSON.stringify(backupCodes)},
        enabled = false,
        updated_at = ${new Date()}
    `;

    // Generate QR code URL
    const user = await db.user.findUnique({ where: { id: userId } });
    const qrCodeUrl = this.generateQRCodeUrl(secret, user?.email || 'user@cargobit.eu');

    return { secret, qrCodeUrl, backupCodes };
  }

  async enableTwoFactor(userId: string, verificationCode: string): Promise<boolean> {
    // Verify the code
    const valid = await this.verifyTwoFactorSetupCode(userId, verificationCode);
    if (!valid) return false;

    // Enable 2FA
    await db.$executeRaw`
      UPDATE two_factor_setup
      SET enabled = true, updated_at = ${new Date()}
      WHERE user_id = ${userId}
    `;

    return true;
  }

  async disableTwoFactor(userId: string, verificationCode: string): Promise<boolean> {
    const valid = await this.verifyTwoFactorCode(userId, verificationCode);
    if (!valid) return false;

    await db.$executeRaw`
      DELETE FROM two_factor_setup WHERE user_id = ${userId}
    `;

    return true;
  }

  private async requiresTwoFactor(userId: string, roles: string[]): Promise<boolean> {
    return roles.some(role => 
      SECURITY_CONFIG.twoFactorRequiredForRoles.includes(role)
    );
  }

  private async hasTwoFactorSetup(userId: string): Promise<boolean> {
    const result = await db.$queryRaw<Array<{ enabled: number }>>`
      SELECT enabled FROM two_factor_setup WHERE user_id = ${userId}
    `;
    return result.length > 0 && result[0].enabled === 1;
  }

  private async sendTwoFactorCode(userId: string, ipAddress: string): Promise<void> {
    // Generate and store code
    const code = this.generateTwoFactorCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.$executeRaw`
      INSERT INTO two_factor_codes (user_id, code, expires_at, created_at)
      VALUES (${userId}, ${code}, ${expiresAt}, ${new Date()})
    `;

    // Get user email
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      // In production, send via email or SMS
      console.log(`[DEV] 2FA Code for ${user.email}: ${code}`);
    }
  }

  private async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    // Check TOTP or backup codes
    const result = await db.$queryRaw<Array<{ code: string; expires_at: Date }>>`
      SELECT code, expires_at FROM two_factor_codes
      WHERE user_id = ${userId} AND code = ${code} AND expires_at > ${new Date()}
      ORDER BY created_at DESC LIMIT 1
    `;

    if (result.length > 0) {
      // Delete used code
      await db.$executeRaw`
        DELETE FROM two_factor_codes WHERE user_id = ${userId} AND code = ${code}
      `;
      return true;
    }

    // Check backup codes
    const backupResult = await db.$queryRaw<Array<{ backup_codes: string }>>`
      SELECT backup_codes FROM two_factor_setup WHERE user_id = ${userId} AND enabled = true
    `;

    if (backupResult.length > 0) {
      const backupCodes: string[] = JSON.parse(backupResult[0].backup_codes);
      if (backupCodes.includes(code)) {
        // Remove used backup code
        const newBackupCodes = backupCodes.filter(c => c !== code);
        await db.$executeRaw`
          UPDATE two_factor_setup SET backup_codes = ${JSON.stringify(newBackupCodes)}
          WHERE user_id = ${userId}
        `;
        return true;
      }
    }

    return false;
  }

  private async verifyTwoFactorSetupCode(userId: string, code: string): Promise<boolean> {
    const result = await db.$queryRaw<Array<{ secret: string }>>`
      SELECT secret FROM two_factor_setup WHERE user_id = ${userId}
    `;

    if (result.length === 0) return false;

    // Verify TOTP code against secret
    const secret = result[0].secret;
    const expectedCode = this.generateTOTP(secret);
    return code === expectedCode;
  }

  private generateTwoFactorSecret(): string {
    return crypto.randomBytes(20).toString('base32').substring(0, 32);
  }

  private generateTwoFactorCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < SECURITY_CONFIG.backupCodesCount; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private generateTOTP(secret: string): string {
    const counter = Math.floor(Date.now() / 1000 / SECURITY_CONFIG.twoFactorCodeValiditySeconds);
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code = digest.readUInt32BE(offset) & 0x7fffffff;
    return (code % 1000000).toString().padStart(6, '0');
  }

  private generateQRCodeUrl(secret: string, email: string): string {
    const issuer = 'CargoBit';
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${issuer}:${encodedEmail}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  private async createSession(
    userId: string,
    context: { ipAddress: string; userAgent: string; deviceId?: string }
  ): Promise<{ token: string; refreshToken: string; id: string }> {
    // Generate tokens
    const token = this.generateToken();
    const refreshToken = this.generateRefreshToken();
    const sessionId = crypto.randomUUID();

    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.sessionDurationHours * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + SECURITY_CONFIG.refreshTokenDurationDays * 24 * 60 * 60 * 1000);

    // Store session
    await db.$executeRaw`
      INSERT INTO sessions (id, user_id, token, refresh_token, ip_address, user_agent, device_id, expires_at, refresh_expires_at, created_at, last_activity)
      VALUES (${sessionId}, ${userId}, ${token}, ${refreshToken}, ${context.ipAddress}, ${context.userAgent}, ${context.deviceId}, ${expiresAt}, ${refreshExpiresAt}, ${new Date()}, ${new Date()})
    `;

    // Cleanup old sessions if exceeded max
    await this.cleanupOldSessions(userId);

    return { token, refreshToken, id: sessionId };
  }

  async validateSession(token: string): Promise<{ userId: string; sessionId: string } | null> {
    const result = await db.$queryRaw<Array<{
      id: string;
      user_id: string;
      expires_at: Date;
    }>>`
      SELECT id, user_id, expires_at FROM sessions
      WHERE token = ${token} AND expires_at > ${new Date()}
    `;

    if (result.length === 0) return null;

    // Update last activity
    await db.$executeRaw`
      UPDATE sessions SET last_activity = ${new Date()} WHERE id = ${result[0].id}
    `;

    return { userId: result[0].user_id, sessionId: result[0].id };
  }

  async refreshSession(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
    const result = await db.$queryRaw<Array<{
      id: string;
      user_id: string;
      refresh_expires_at: Date;
    }>>`
      SELECT id, user_id, refresh_expires_at FROM sessions
      WHERE refresh_token = ${refreshToken} AND refresh_expires_at > ${new Date()}
    `;

    if (result.length === 0) return null;

    const newToken = this.generateToken();
    const newRefreshToken = this.generateRefreshToken();

    await db.$executeRaw`
      UPDATE sessions SET
        token = ${newToken},
        refresh_token = ${newRefreshToken},
        last_activity = ${new Date()}
      WHERE id = ${result[0].id}
    `;

    return { token: newToken, refreshToken: newRefreshToken };
  }

  async logout(token: string): Promise<void> {
    await db.$executeRaw`
      DELETE FROM sessions WHERE token = ${token}
    `;
  }

  async logoutAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await db.$executeRaw`
        DELETE FROM sessions WHERE user_id = ${userId} AND id != ${exceptSessionId}
      `;
    } else {
      await db.$executeRaw`
        DELETE FROM sessions WHERE user_id = ${userId}
      `;
    }
  }

  async getActiveSessions(userId: string, currentSessionId: string): Promise<SessionInfo[]> {
    const sessions = await db.$queryRaw<Array<{
      id: string;
      ip_address: string;
      user_agent: string;
      device_id: string | null;
      last_activity: Date;
      expires_at: Date;
    }>>`
      SELECT id, ip_address, user_agent, device_id, last_activity, expires_at
      FROM sessions
      WHERE user_id = ${userId} AND expires_at > ${new Date()}
      ORDER BY last_activity DESC
    `;

    return sessions.map(s => ({
      id: s.id,
      userId,
      ipAddress: s.ip_address,
      deviceName: this.parseDeviceName(s.user_agent),
      lastActivity: s.last_activity,
      expiresAt: s.expires_at,
      isCurrent: s.id === currentSessionId,
    }));
  }

  private async cleanupOldSessions(userId: string): Promise<void> {
    const sessions = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM sessions WHERE user_id = ${userId} ORDER BY last_activity DESC
    `;

    if (sessions.length > SECURITY_CONFIG.maxSessionsPerUser) {
      const toDelete = sessions.slice(SECURITY_CONFIG.maxSessionsPerUser).map(s => s.id);
      await db.$executeRaw`
        DELETE FROM sessions WHERE id IN (${toDelete.join(',')})
      `;
    }
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  private validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < SECURITY_CONFIG.passwordMinLength) {
      errors.push(`Mindestens ${SECURITY_CONFIG.passwordMinLength} Zeichen`);
    }
    if (SECURITY_CONFIG.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Mindestens ein Großbuchstabe');
    }
    if (SECURITY_CONFIG.passwordRequireLowercase && !/[a-z]/.test(password)) {
      errors.push('Mindestens ein Kleinbuchstabe');
    }
    if (SECURITY_CONFIG.passwordRequireNumbers && !/[0-9]/.test(password)) {
      errors.push('Mindestens eine Zahl');
    }
    if (SECURITY_CONFIG.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Mindestens ein Sonderzeichen');
    }

    return { valid: errors.length === 0, errors };
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

  async requestPasswordReset(data: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
    const user = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true, message: 'Wenn die E-Mail existiert, erhalten Sie eine Nachricht.' };
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.$executeRaw`
      INSERT INTO password_resets (user_id, token, ip_address, expires_at, created_at)
      VALUES (${user.id}, ${token}, ${data.ipAddress}, ${expiresAt}, ${new Date()})
    `;

    // In production, send email with reset link
    console.log(`[DEV] Password reset token for ${user.email}: ${token}`);

    return { success: true, message: 'Wenn die E-Mail existiert, erhalten Sie eine Nachricht.' };
  }

  async confirmPasswordReset(data: PasswordResetConfirm): Promise<{ success: boolean; error?: string }> {
    const validation = this.validatePassword(data.newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const result = await db.$queryRaw<Array<{ user_id: string; expires_at: Date }>>`
      SELECT user_id, expires_at FROM password_resets
      WHERE token = ${data.token} AND expires_at > ${new Date()}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Ungültiger oder abgelaufener Token' };
    }

    const passwordHash = await this.hashPassword(data.newPassword);

    await db.user.update({
      where: { id: result[0].user_id },
      data: { passwordHash },
    });

    await db.$executeRaw`
      DELETE FROM password_resets WHERE token = ${data.token}
    `;

    // Logout all sessions
    await this.logoutAllSessions(result[0].user_id);

    return { success: true };
  }

  // ============================================
  // LOCKOUT & FAILED ATTEMPTS
  // ============================================

  private async checkLockout(userId: string): Promise<{ isLocked: boolean; remainingMinutes: number }> {
    const result = await db.$queryRaw<Array<{ locked_until: Date }>>`
      SELECT locked_until FROM user_lockouts
      WHERE user_id = ${userId} AND locked_until > ${new Date()}
    `;

    if (result.length === 0) {
      return { isLocked: false, remainingMinutes: 0 };
    }

    const remainingMs = result[0].locked_until.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

    return { isLocked: true, remainingMinutes };
  }

  private async incrementFailedAttempts(userId: string): Promise<void> {
    const result = await db.$queryRaw<Array<{ attempts: number }>>`
      SELECT attempts FROM login_attempts
      WHERE user_id = ${userId} AND created_at > ${new Date(Date.now() - 60 * 60 * 1000)}
    `;

    const attempts = (result[0]?.attempts || 0) + 1;

    if (attempts >= SECURITY_CONFIG.maxFailedAttempts) {
      // Lock the account
      const lockedUntil = new Date(Date.now() + SECURITY_CONFIG.lockoutDurationMinutes * 60 * 1000);
      await db.$executeRaw`
        INSERT INTO user_lockouts (user_id, locked_until, created_at)
        VALUES (${userId}, ${lockedUntil}, ${new Date()})
        ON CONFLICT (user_id) DO UPDATE SET locked_until = ${lockedUntil}
      `;
    } else {
      await db.$executeRaw`
        INSERT INTO login_attempts (user_id, attempts, created_at)
        VALUES (${userId}, ${attempts}, ${new Date()})
        ON CONFLICT (user_id) DO UPDATE SET attempts = ${attempts}, created_at = ${new Date()}
      `;
    }
  }

  private async resetFailedAttempts(userId: string): Promise<void> {
    await db.$executeRaw`
      DELETE FROM login_attempts WHERE user_id = ${userId}
    `;
    await db.$executeRaw`
      DELETE FROM user_lockouts WHERE user_id = ${userId}
    `;
  }

  private async logFailedAttempt(email: string, ipAddress: string): Promise<void> {
    await db.$executeRaw`
      INSERT INTO failed_login_log (email, ip_address, created_at)
      VALUES (${email}, ${ipAddress}, ${new Date()})
    `;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  private parseDeviceName(userAgent: string): string {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Unbekanntes Gerät';
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.$executeRaw`
      INSERT INTO email_verifications (user_id, token, expires_at, created_at)
      VALUES (${userId}, ${token}, ${expiresAt}, ${new Date()})
    `;

    // In production, send actual email
    console.log(`[DEV] Email verification token for ${email}: ${token}`);
  }

  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    const result = await db.$queryRaw<Array<{ user_id: string }>>`
      SELECT user_id FROM email_verifications
      WHERE token = ${token} AND expires_at > ${new Date()}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Ungültiger oder abgelaufener Token' };
    }

    await db.user.update({
      where: { id: result[0].user_id },
      data: { status: 'ACTIVE' },
    });

    await db.$executeRaw`
      DELETE FROM email_verifications WHERE token = ${token}
    `;

    return { success: true };
  }
}

// ============================================
// EXPORTS
// ============================================

export const authService = new AuthService();

export type {
  AuthCredentials,
  AuthResult,
  TwoFactorSetup,
  SessionInfo,
  PasswordResetRequest,
  PasswordResetConfirm,
};
