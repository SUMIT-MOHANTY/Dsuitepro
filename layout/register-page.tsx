/**
 * Register Page Component
 * 
 * Complete registration form with name, email, password, and password confirmation.
 * Features real-time validation, password strength indicator, and redirect on success.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckSquare, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { AuthLayout } from './auth-layout';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const calculatePasswordStrength = (password: string): PasswordStrength => {
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
};

const validateField = (name: keyof FormData, value: string, formData?: FormData): string | undefined => {
  switch (name) {
    case 'name':
      if (!value.trim()) return 'Name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
      if (value.trim().length > 100) return 'Name must be less than 100 characters';
      break;
    
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!validateEmail(value)) return 'Please enter a valid email address';
      break;
    
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      if (value.length > 100) return 'Password must be less than 100 characters';
      if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
      if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
      if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
      break;
    
    case 'confirmPassword':
      if (!value) return 'Please confirm your password';
      if (formData && value !== formData.password) return 'Passwords do not match';
      break;
  }
  return undefined;
};

// ============================================================================
// Password Strength Indicator Component
// ============================================================================

interface PasswordStrengthIndicatorProps {
  password: string;
}

function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);
  
  if (!password) {
    return (
      <div className="password-strength">
        <div className="password-strength-bar">
          <div className="password-strength-fill" style={{ width: '0%' }} />
        </div>
        <span className="password-strength-text">Enter a password</span>
      </div>
    );
  }

  const getStrengthClass = () => {
    switch (strength.score) {
      case 1: return 'password-strength-weak';
      case 2: return 'password-strength-medium';
      case 3: return 'password-strength-strong';
      default: return '';
    }
  };

  return (
    <div className="password-strength">
      <div className="password-strength-bar">
        <div className={`password-strength-fill ${getStrengthClass()}`} />
      </div>
      <span 
        className="password-strength-text"
        style={{ color: `rgb(var(--${strength.score === 1 ? 'danger' : strength.score === 2 ? 'warning' : 'success'}-500))` }}
      >
        {strength.label}
      </span>
    </div>
  );
}

// ============================================================================
// Main Register Page Component
// ============================================================================

export function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof FormData>).forEach((key) => {
      const error = validateField(key, formData[key], formData);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData]);

  // Real-time validation on change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear submit error when user starts typing
    if (submitError) setSubmitError(null);
    
    // Validate if field has been touched
    if (touched[name as keyof FormData]) {
      const error = validateField(name as keyof FormData, value, 
        name === 'confirmPassword' ? { ...formData, [name]: value } : formData
      );
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
    
    // Special case: re-validate confirmPassword when password changes
    if (name === 'password' && touched.confirmPassword && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword, { ...formData, password: value });
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  }, [formData, touched, submitError]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    const error = validateField(name as keyof FormData, value, formData);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      // Call the registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Registration failed');
      }

      // Show success state
      setIsSuccess(true);
      
      // Redirect to login page with email pre-filled after a short delay
      setTimeout(() => {
        router.push(`/login?email=${encodeURIComponent(formData.email)}`);
      }, 2000);
      
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="auth-status">
          <div className="auth-status__icon auth-status__icon--success">
            <CheckCircle size={32} />
          </div>
          <h2 className="auth-status__title">Account Created!</h2>
          <p className="auth-status__message">
            Your account has been successfully created. Redirecting you to login...
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Join us and start managing your tasks efficiently"
    >
      <form onSubmit={handleSubmit} className="register-form">
        {/* Submit Error */}
        {submitError && (
          <div className="auth-alert auth-alert--error">
            <AlertCircle className="auth-alert__icon" size={18} />
            <div className="auth-alert__content">{submitError}</div>
          </div>
        )}

        {/* Name Field */}
        <div className="register-form-group">
          <label htmlFor="name" className="register-label">
            Full Name
          </label>
          <div className="relative">
            <User 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
              size={18} 
            />
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              placeholder="John Doe"
              className={`register-input pl-10 ${errors.name && touched.name ? 'register-input-error' : ''}`}
              autoComplete="name"
            />
          </div>
          {errors.name && touched.name && (
            <span className="register-error-message">
              <AlertCircle size={14} />
              {errors.name}
            </span>
          )}
        </div>

        {/* Email Field */}
        <div className="register-form-group">
          <label htmlFor="email" className="register-label">
            Email Address
          </label>
          <div className="relative">
            <Mail 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
              size={18} 
            />
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              placeholder="you@example.com"
              className={`register-input pl-10 ${errors.email && touched.email ? 'register-input-error' : ''}`}
              autoComplete="email"
            />
          </div>
          {errors.email && touched.email && (
            <span className="register-error-message">
              <AlertCircle size={14} />
              {errors.email}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="register-form-group">
          <label htmlFor="password" className="register-label">
            Password
          </label>
          <div className="relative">
            <Lock 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
              size={18} 
            />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              placeholder="••••••••"
              className={`register-input pl-10 pr-10 ${errors.password && touched.password ? 'register-input-error' : ''}`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && touched.password && (
            <span className="register-error-message">
              <AlertCircle size={14} />
              {errors.password}
            </span>
          )}
          <PasswordStrengthIndicator password={formData.password} />
        </div>

        {/* Confirm Password Field */}
        <div className="register-form-group">
          <label htmlFor="confirmPassword" className="register-label">
            Confirm Password
          </label>
          <div className="relative">
            <Lock 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
              size={18} 
            />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              placeholder="••••••••"
              className={`register-input pl-10 pr-10 ${errors.confirmPassword && touched.confirmPassword ? 'register-input-error' : ''}`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && touched.confirmPassword && (
            <span className="register-error-message">
              <AlertCircle size={14} />
              {errors.confirmPassword}
            </span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="register-submit-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Creating account...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="register-footer">
        <p className="register-footer-text">
          Already have an account?{' '}
          <a href="/login" className="register-footer-link">
            Sign in
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}

export default RegisterPage;
