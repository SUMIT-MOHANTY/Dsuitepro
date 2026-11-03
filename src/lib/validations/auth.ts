/**
 * Authentication Validation Schemas
 *
 * Centralized Zod validation schemas for all authentication forms.
 * These schemas define the validation rules for login, registration,
 * forgot password, and reset password forms.
 */

import { z } from 'zod';

// ============================================================================
// Login Schema
// ============================================================================

/**
 * Login form validation schema
 * - Email: Required, must be valid email format
 * - Password: Required, minimum 8 characters
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// Register Schema
// ============================================================================

/**
 * Registration form validation schema
 * - Name: Required, 2-100 characters
 * - Email: Required, valid email format
 * - Password: Required, min 8 chars, must contain uppercase, lowercase, number
 * - ConfirmPassword: Must match password
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================================================
// Forgot Password Schema
// ============================================================================

/**
 * Forgot password form validation schema
 * - Email: Required, valid email format
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ============================================================================
// Reset Password Schema
// ============================================================================

/**
 * Reset password form validation schema
 * - Password: Required, min 8 chars, must contain uppercase, lowercase, number, special char
 * - ConfirmPassword: Must match password
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Password Requirements Helper
// ============================================================================

/**
 * Password requirements configuration for UI display and validation
 */
export const passwordRequirements = {
  minLength: 8,
  maxLength: 100,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[^A-Za-z0-9]/,
} as const;

/**
 * Validates a password against all requirements
 * Returns an object with boolean flags for each requirement
 */
export function validatePasswordRequirements(password: string): {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
} {
  const checks = {
    minLength: password.length >= passwordRequirements.minLength,
    hasUppercase: passwordRequirements.hasUppercase.test(password),
    hasLowercase: passwordRequirements.hasLowercase.test(password),
    hasNumber: passwordRequirements.hasNumber.test(password),
    hasSpecialChar: passwordRequirements.hasSpecialChar.test(password),
  };

  return {
    ...checks,
    isValid: Object.values(checks).every(Boolean),
  };
}

/**
 * Calculates password strength score (0-5)
 * Returns score and label for UI display
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) {
    return { score: 0, label: '', color: '' };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexity checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Normalize to 0-3 scale
  const normalizedScore = Math.min(3, Math.floor(score / 2));

  switch (normalizedScore) {
    case 0:
    case 1:
      return { score: 1, label: 'Weak', color: 'var(--danger-500)' };
    case 2:
      return { score: 2, label: 'Medium', color: 'var(--warning-500)' };
    case 3:
      return { score: 3, label: 'Strong', color: 'var(--success-500)' };
    default:
      return { score: 0, label: '', color: '' };
  }
}

// ============================================================================
// Export all schemas
// ============================================================================

export const authSchemas = {
  login: loginSchema,
  register: registerSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
} as const;

export type AuthSchemaTypes = {
  login: LoginInput;
  register: RegisterInput;
  forgotPassword: ForgotPasswordInput;
  resetPassword: ResetPasswordInput;
};
