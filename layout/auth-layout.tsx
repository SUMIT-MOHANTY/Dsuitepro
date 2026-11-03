/**
 * Authentication Layout
 * 
 * Provides consistent branding, background styling, and structure
 * for all authentication pages (login, register, forgot-password, reset-password).
 */

import React from 'react';
import { CheckSquare } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="auth-page-container">
      <div className="auth-card-wrapper">
        <div className="auth-card">
          {/* Header with Logo */}
          <div className="auth-card-header">
            <div className="auth-logo">
              <div className="auth-logo-icon">
                <CheckSquare size={24} />
              </div>
              <span className="auth-logo-text">TodoApp</span>
            </div>
            {title && <h1 className="auth-card-title">{title}</h1>}
            {description && <p className="auth-card-description">{description}</p>}
          </div>

          {/* Content */}
          <div className="auth-card-content">
            {children}
          </div>

          {/* Footer */}
          <div className="auth-card-footer">
            <div className="auth-footer-links">
              <a href="/privacy" className="auth-footer-link-item">Privacy</a>
              <a href="/terms" className="auth-footer-link-item">Terms</a>
              <a href="/help" className="auth-footer-link-item">Help</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
