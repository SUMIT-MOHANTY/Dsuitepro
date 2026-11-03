/**
 * Profile Card Component
 * 
 * Displays user profile information with:
 * - Avatar and name
 * - Email with verification badge
 * - Member since date
 * - Todo statistics (total, completed, completion rate)
 * - Edit Profile button
 */

'use client';

import React from 'react';
import {
  User,
  Mail,
  Calendar,
  CheckCircle,
  AlertCircle,
  Edit3,
  CheckSquare,
  TrendingUp,
} from 'lucide-react';
import type { UserProfile, TodoStats } from '@/hooks/use-user';

interface ProfileCardProps {
  user: UserProfile;
  todoStats: TodoStats;
  onEditClick: () => void;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Profile Card Component
 */
export function ProfileCard({ user, todoStats, onEditClick }: ProfileCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      {/* Header with Avatar */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
          <User className="w-10 h-10 text-primary" />
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-foreground truncate">
            {user.name || 'Anonymous User'}
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{user.email}</span>
            </div>
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                Unverified
              </span>
            )}
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Member since {formatDate(user.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={onEditClick}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mt-4 sm:mt-0"
        >
          <Edit3 className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todoStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Todos</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todoStats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todoStats.completionRate}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;
