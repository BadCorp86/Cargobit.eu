/**
 * User Blocking Utility Functions
 * 
 * This module provides functions for managing user blocking/unblocking
 * for moderation violations and non-payment scenarios.
 */

import { db } from '@/lib/db';

export interface BlockUserOptions {
  userId: string;
  reason: string;
  blockedBy?: string; // Admin user ID
}

export interface UnblockUserOptions {
  userId: string;
  unblockedBy: string; // Admin or Support user ID
  reason?: string;
}

/**
 * Block a user account
 */
export async function blockUser(options: BlockUserOptions): Promise<{ success: boolean; message: string }> {
  const { userId, reason, blockedBy } = options;

  try {
    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, message: 'Benutzer nicht gefunden' };
    }

    // Check if already blocked
    if (user.isBlocked) {
      return { success: false, message: 'Benutzer ist bereits gesperrt' };
    }

    // Update user status
    await db.user.update({
      where: { id: userId },
      data: {
        isBlocked: true,
        blockReason: reason,
        blockedAt: new Date(),
        blockedBy: blockedBy || null,
        status: 'BLOCKED'
      }
    });

    // Create audit log if blocked by admin
    if (blockedBy) {
      await db.auditLog.create({
        data: {
          userId: blockedBy,
          userEmail: '',
          userRole: 'ADMIN',
          action: 'user_blocked',
          entityType: 'user',
          entityId: userId,
          newValue: JSON.stringify({ reason, blockedAt: new Date().toISOString() })
        }
      });
    }

    return { success: true, message: 'Benutzer erfolgreich gesperrt' };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, message: 'Fehler beim Sperren des Benutzers' };
  }
}

/**
 * Unblock a user account
 */
export async function unblockUser(options: UnblockUserOptions): Promise<{ success: boolean; message: string }> {
  const { userId, unblockedBy, reason } = options;

  try {
    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, message: 'Benutzer nicht gefunden' };
    }

    // Check if user is blocked
    if (!user.isBlocked) {
      return { success: false, message: 'Benutzer ist nicht gesperrt' };
    }

    // Update user status
    await db.user.update({
      where: { id: userId },
      data: {
        isBlocked: false,
        blockReason: null,
        blockedAt: null,
        blockedBy: null,
        status: 'ACTIVE'
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: unblockedBy,
        userEmail: '',
        userRole: 'ADMIN',
        action: 'user_unblocked',
        entityType: 'user',
        entityId: userId,
        newValue: JSON.stringify({ reason, unblockedAt: new Date().toISOString() })
      }
    });

    return { success: true, message: 'Benutzer erfolgreich freigeschaltet' };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, message: 'Fehler beim Freischalten des Benutzers' };
  }
}

/**
 * Get blocked users list
 */
export async function getBlockedUsers(options?: { limit?: number; offset?: number }) {
  const { limit = 50, offset = 0 } = options || {};

  try {
    const users = await db.user.findMany({
      where: {
        isBlocked: true
      },
      orderBy: {
        blockedAt: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        role: true,
        isBlocked: true,
        blockReason: true,
        blockedAt: true,
        blockedBy: true
      }
    });

    const total = await db.user.count({
      where: { isBlocked: true }
    });

    return {
      success: true,
      users,
      total,
      hasMore: offset + limit < total
    };
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return {
      success: false,
      users: [],
      total: 0,
      hasMore: false
    };
  }
}

/**
 * Check if user is blocked
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isBlocked: true }
    });

    return user?.isBlocked || false;
  } catch {
    return false;
  }
}

/**
 * Get block reason for user
 */
export async function getBlockReason(userId: string): Promise<string | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { blockReason: true, isBlocked: true }
    });

    if (!user || !user.isBlocked) {
      return null;
    }

    return user.blockReason;
  } catch {
    return null;
  }
}

/**
 * Block users with overdue invoices (14+ days)
 */
export async function blockUsersWithOverdueInvoices(): Promise<{ blocked: number; errors: string[] }> {
  const result = { blocked: 0, errors: [] as string[] };

  try {
    // Find all overdue invoices that haven't resulted in a block yet
    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: 'overdue',
        blockedDueToNonPayment: false,
        dueDate: {
          lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
        }
      },
      include: {
        user: {
          select: { id: true, isBlocked: true }
        }
      }
    });

    for (const invoice of overdueInvoices) {
      if (!invoice.user.isBlocked) {
        const blockResult = await blockUser({
          userId: invoice.userId,
          reason: `Automatische Sperrung wegen Zahlungsrückstand (Rechnung ${invoice.invoiceNumber})`
        });

        if (blockResult.success) {
          // Mark invoice as blocked
          await db.invoice.update({
            where: { id: invoice.id },
            data: { blockedDueToNonPayment: true }
          });
          result.blocked++;
        } else {
          result.errors.push(`Failed to block user ${invoice.userId}: ${blockResult.message}`);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error blocking users with overdue invoices:', error);
    result.errors.push('Internal error during batch blocking');
    return result;
  }
}
