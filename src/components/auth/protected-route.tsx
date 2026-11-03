/**
 * Protected Route Component
 * 
 * Wrapper component that ensures authentication before rendering children.
 * Redirects to login page if user is not authenticated.
 * Shows loading state while checking authentication.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Loading spinner component for auth check
 */
function AuthLoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking authentication...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Protected Route Wrapper
 * 
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardContent />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      // Redirect to login with return URL
      const currentPath = window.location.pathname;
      const returnUrl = encodeURIComponent(currentPath);
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [status, router]);

  // Show loading state while checking
  if (status === 'loading') {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <AuthLoadingState />;
  }

  // Show nothing while redirecting
  if (status === 'unauthenticated') {
    return <AuthLoadingState />;
  }

  // Render children when authenticated
  return <>{children}</>;
}

/**
 * HOC version for wrapping page components
 * 
 * Usage:
 * ```tsx
 * export default withAuth(DashboardPage);
 * ```
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WithAuthWrapper(props: P) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Hook to check if user is authenticated
 * Returns auth state and user data
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const requireAuth = React.useCallback(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return false;
    }
    return true;
  }, [status, router]);

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    status,
    requireAuth,
  };
}

export default ProtectedRoute;
