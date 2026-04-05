import { z } from 'zod';

// User role enum
export const userRoleEnum = z.enum(['ADMIN', 'DISPATCHER', 'DRIVER', 'SHIPPER', 'SUPPORT']);

// User status enum
export const userStatusEnum = z.enum(['ACTIVE', 'PENDING', 'SUSPENDED', 'VERIFIED', 'BLOCKED']);

// Membership tier enum
export const membershipTierEnum = z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']);

// User registration schema
export const registerUserSchema = z.object({
  email: z.string()
    .email('Ungültige E-Mail-Adresse')
    .max(255, 'E-Mail darf maximal 255 Zeichen haben'),
  password: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .max(100, 'Passwort darf maximal 100 Zeichen haben')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
  name: z.string()
    .min(2, 'Name muss mindestens 2 Zeichen haben')
    .max(100, 'Name darf maximal 100 Zeichen haben')
    .optional(),
  role: userRoleEnum.default('DISPATCHER'),
  companyName: z.string().max(200).optional(),
  companyAddress: z.string().max(500).optional(),
  phone: z.string()
    .regex(/^[\d\s\-+()]+$/, 'Ungültige Telefonnummer')
    .max(30)
    .optional(),
  taxId: z.string().max(50).optional(),
  vatNumber: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
});

// User login schema
export const loginUserSchema = z.object({
  email: z.string()
    .email('Ungültige E-Mail-Adresse'),
  password: z.string()
    .min(1, 'Passwort ist erforderlich'),
  rememberMe: z.boolean().default(false),
});

// User update schema
export const updateUserSchema = z.object({
  id: z.string().cuid('Ungültige Benutzer-ID'),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().regex(/^[\d\s\-+()]+$/).max(30).optional(),
  companyName: z.string().max(200).optional(),
  companyAddress: z.string().max(500).optional(),
  taxId: z.string().max(50).optional(),
  vatNumber: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
  driverLicenseNumber: z.string().max(50).optional(),
  driverLicenseClass: z.string().max(20).optional(),
  driverLicenseExpiry: z.string().optional(),
  driverCardExpiry: z.string().optional(),
  adrCertificate: z.string().max(50).optional(),
});

// Admin user update schema (includes role and status changes)
export const adminUpdateUserSchema = updateUserSchema.extend({
  role: userRoleEnum.optional(),
  status: userStatusEnum.optional(),
  membershipTier: membershipTierEnum.optional(),
  membershipStart: z.string().optional(),
  membershipEnd: z.string().optional(),
  isBlocked: z.boolean().optional(),
  blockReason: z.string().max(500).optional(),
  walletBalance: z.number().nonnegative().max(10000000).optional(),
});

// User query schema
export const userQuerySchema = z.object({
  id: z.string().cuid().optional(),
  email: z.string().email().optional(),
  role: userRoleEnum.optional(),
  status: userStatusEnum.optional(),
  membershipTier: membershipTierEnum.optional(),
  isBlocked: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'email', 'role', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
  newPassword: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .max(100, 'Passwort darf maximal 100 Zeichen haben')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

// Password reset request schema
export const requestPasswordResetSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});

// Password reset schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
  newPassword: z.string()
    .min(8, 'Passwort muss mindestens 8 Zeichen haben')
    .max(100, 'Passwort darf maximal 100 Zeichen haben')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

// Type exports
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
