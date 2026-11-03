/**
 * Auth Route Group Layout
 * 
 * Wraps all authentication pages (login, register, forgot-password, reset-password)
 * with the AuthLayout component.
 */

import { AuthLayout } from '@/layout/auth-layout';

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
