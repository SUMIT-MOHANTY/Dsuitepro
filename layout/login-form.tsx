/**
 * Login Form Component
 *
 * A reusable login form with React Hook Form and Zod validation.
 * Handles email/password authentication with loading states and error display.
 */

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

// Login form validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  redirectUrl?: string;
}

export function LoginForm({ redirectUrl = '/' }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || redirectUrl;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        // Handle specific error cases
        switch (result.error) {
          case 'CredentialsSignin':
            setError('Invalid email or password. Please try again.');
            break;
          case 'EmailNotVerified':
            setError('Please verify your email address before signing in.');
            break;
          default:
            setError('An error occurred during sign in. Please try again.');
        }
      } else if (result?.ok) {
        // Successful login - redirect
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          Email
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

      {/* Password Field */}
      <div className="auth-form__group">
        <label htmlFor="password" className="auth-form__label">
          Password
        </label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            {...register('password')}
            type="password"
            id="password"
            placeholder="Enter your password"
            className={`auth-input pl-10 ${errors.password ? 'auth-input--error' : ''}`}
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>
        {errors.password && (
          <span className="auth-error" role="alert">
            <AlertCircle size={14} />
            {errors.password.message}
          </span>
        )}
      </div>

      {/* Links Row */}
      <div className="auth-links-row">
        <Link href="/forgot-password" className="auth-link">
          Forgot password?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="auth-button"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Register Link */}
      <div className="auth-footer">
        <span className="auth-footer__text">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="auth-footer__link">
            Create account
          </Link>
        </span>
      </div>
    </form>
  );
}

export default LoginForm;
