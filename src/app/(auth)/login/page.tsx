/**
 * Login Page
 * 
 * Next.js App Router page for the login route.
 * Uses AuthLayout and LoginForm components with proper metadata.
 */

import React from 'react';
import { AuthLayout } from '../../../layout/auth-layout';
import { LoginForm } from '../../../layout/login-form';

export const metadata = {
  title: 'Sign In - TodoApp',
  description: 'Sign in to your account to continue managing your tasks',
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your account to continue managing your tasks"
    >
      <LoginForm />
    </AuthLayout>
  );
}
