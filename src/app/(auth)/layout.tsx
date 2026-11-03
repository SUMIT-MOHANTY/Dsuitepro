/**
 * Auth Route Group Layout
 * 
 * Wraps all authentication pages (login, register, forgot-password, reset-password)
 * with the AuthLayout component.
 */

import type { Metadata } from 'next';
import { AuthLayout } from '@/layout/auth-layout';

export const metadata: Metadata = {
  title: 'Authentication - Todo App',
  description: 'Sign in or create an account to manage your todos',
};

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
