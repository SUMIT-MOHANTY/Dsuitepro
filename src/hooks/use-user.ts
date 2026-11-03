/**
 * useUser Hook
 * 
 * Custom hook for user profile data fetching and mutations.
 * Uses tRPC for type-safe API calls with optimistic UI updates.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc/client';

// Types matching the tRPC router outputs
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  role: string;
  isActive: boolean;
  stats: {
    totalTodos: number;
    totalTags: number;
  };
}

export interface TodoStats {
  total: number;
  completed: number;
  completionRate: number;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DeleteAccountInput {
  password: string;
  confirmDelete: boolean;
}

// Query key factory
const userKeys = {
  all: ['user'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch and manage user profile
 */
export function useUser() {
  const queryClient = useQueryClient();

  // Fetch user profile
  const profileQuery = useQuery({
    queryKey: userKeys.profile(),
    queryFn: async () => {
      const response = await trpc.users.getProfile.query();
      return response as UserProfile;
    },
  });

  // Update profile mutation with optimistic update
  const updateProfileMutation = useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const response = await trpc.users.updateProfile.mutate(input);
      return response as UserProfile;
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.profile() });

      // Snapshot previous value
      const previousProfile = queryClient.getQueryData<UserProfile>(userKeys.profile());

      // Optimistically update
      if (previousProfile) {
        queryClient.setQueryData(userKeys.profile(), {
          ...previousProfile,
          ...newData,
        });
      }

      return { previousProfile };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(userKeys.profile(), context.previousProfile);
      }
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (input: Omit<ChangePasswordInput, 'confirmPassword'>) => {
      const response = await trpc.users.changePassword.mutate({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      return response;
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (input: DeleteAccountInput) => {
      const response = await trpc.users.deleteAccount.mutate({
        password: input.password,
        confirmDelete: input.confirmDelete,
      });
      return response;
    },
    onSuccess: () => {
      // Clear all queries on account deletion
      queryClient.clear();
    },
  });

  // Calculate todo stats from profile data
  const todoStats: TodoStats | undefined = profileQuery.data
    ? {
        total: profileQuery.data.stats.totalTodos,
        completed: Math.round(
          (profileQuery.data.stats.totalTodos * 0.83) // Mock completion rate
        ),
        completionRate: 83,
      }
    : undefined;

  return {
    // Data
    user: profileQuery.data,
    todoStats,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,

    // Mutations
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    changePasswordError: changePasswordMutation.error,

    deleteAccount: deleteAccountMutation.mutateAsync,
    isDeletingAccount: deleteAccountMutation.isPending,
    deleteAccountError: deleteAccountMutation.error,

    // Refetch
    refetch: profileQuery.refetch,
  };
}

/**
 * Hook to fetch user profile only (lighter version)
 */
export function useUserProfile() {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: async () => {
      const response = await trpc.users.getProfile.query();
      return response as UserProfile;
    },
  });
}

/**
 * Hook for profile mutations only
 */
export function useUserMutations() {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const response = await trpc.users.updateProfile.mutate(input);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });

  const changePassword = useMutation({
    mutationFn: async (input: Omit<ChangePasswordInput, 'confirmPassword'>) => {
      const response = await trpc.users.changePassword.mutate({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      return response;
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (input: DeleteAccountInput) => {
      const response = await trpc.users.deleteAccount.mutate({
        password: input.password,
        confirmDelete: input.confirmDelete,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return {
    updateProfile,
    changePassword,
    deleteAccount,
  };
}
