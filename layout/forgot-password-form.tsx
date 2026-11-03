/**
 * Forgot Password Form Component
 *
 * A reusable forgot password form with React Hook Form and Zod validation.
 * Handles password reset requests with security-conscious confirmation messaging.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

// Forgot password validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call the forgot password API endpoint
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      // Always show success message regardless of response for security
      // This prevents email enumeration attacks
      setIsSubmitted(true);
    } catch (err) {
      // Even on error, show success message for security
      // This prevents attackers from knowing if an email exists
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - show confirmation message
  if (isSubmitted) {
    return (
      <div className="auth-status">
        <div className="auth-status__icon auth-status__icon--success">
          <CheckCircle size={32} />
        </div>
        <h2 className="auth-status__title">Password reset sent</h2>
        <p className="auth-status__message">
          If an account exists with the email you provided, you will receive
          password reset instructions shortly. Please check your inbox and
          spam folder.
        </p>
        <Link
          href="/login"
          className="auth-button"
          style={{ display: 'inline-flex', width: 'auto', padding: '0.75rem 1.5rem' }}
        >
          <ArrowLeft size={18} />
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
      {/* Error Alert */}
      {error && (
        <div className="auth-alert auth-alert--error" role="alert">
          <AlertCircle className="auth-alert__icon" size={18} />
          <div className="auth-alert__content">{error}</div>
        </div>
      )}

      {/* Email Field */}
      <div className="auth-form__group">
        <label htmlFor="email" className="auth-form__label">
          Email address
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            {...register('email')}
            type="email"
            id="email"
            placeholder="you@example.com"
            className={`auth-input pl-10 ${errors.email ? 'auth-input--error' : ''}`}
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
        </div>
        {errors.email && (
          <span className="auth-error" role="alert">
            <AlertCircle size={14} />
            {errors.email.message}
          </span>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="auth-button auth-button--warning"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Sending...
          </>
        ) : (
          'Send reset link'
        )}
      </button>

      {/* Back to Login Link */}
      <div className="auth-footer">
        <Link
          href="/login"
          className="forgot-password-back-link"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>
      </div>
    </form>
  );
}

export default ForgotPasswordForm;
