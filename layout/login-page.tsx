/**
 * Login Page Component
 *
 * The login page that uses the AuthLayout and LoginForm components.
 * This is placed in the layout directory due to lane ownership constraints.
 */

import React from 'react';
import { AuthLayout } from './auth-layout';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Sign In - TodoApp',
  description: 'Sign in to your TodoApp account to manage your tasks.',
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
