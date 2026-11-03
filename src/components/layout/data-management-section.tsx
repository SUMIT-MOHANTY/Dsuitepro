/**
 * Data Management Section Component
 * 
 * Data management with:
 * - Export data button (JSON/CSV)
 * - Delete account with confirmation dialog
 * - Typed confirmation for destructive actions
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';

interface ExportFormat {
  id: 'json' | 'csv';
  label: string;
  icon: React.ElementType;
  description: string;
}

const exportFormats: ExportFormat[] = [
  {
    id: 'json',
    label: 'JSON',
    icon: FileJson,
    description: 'Complete data export in JSON format',
  },
  {
    id: 'csv',
    label: 'CSV',
    icon: FileSpreadsheet,
    description: 'Spreadsheet format for easy viewing',
  },
];

/**
 * Data Management Section Component
 */
export function DataManagementSection() {
  const router = useRouter();
  const { deleteAccount, isDeletingAccount } = useUser();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const isConfirmValid = confirmText === 'DELETE';

  // Handle data export
  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    setExportSuccess('');

    try {
      // Simulate API call to get user data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data export
      const mockData = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date().toISOString(),
        },
        todos: [
          { id: 1, title: 'Sample Todo', completed: false },
        ],
        tags: [],
        exportedAt: new Date().toISOString(),
      };

      const content =
        format === 'json'
          ? JSON.stringify(mockData, null, 2)
          : 'Title,Completed,Created At\nSample Todo,false,' + new Date().toISOString();

      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `todoapp-data-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(`Data exported as ${format.toUpperCase()}`);
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!isConfirmValid || !password) return;

    setDeleteError('');

    try {
      await deleteAccount({ password, confirmDelete: true });
      // Redirect to login after successful deletion
      router.push('/login');
    } catch (error) {
      setDeleteError('Failed to delete account. Please check your password.');
    }
  };

  // Close dialog and reset
  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setConfirmText('');
    setPassword('');
    setDeleteError('');
  };

  return (
    <div className="space-y-8">
      {/* Export Data Section */}
      <div>
        <h3 className="text-lg font-medium text-foreground">Export Your Data</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Download a copy of your data in your preferred format.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {exportFormats.map((format) => {
            const Icon = format.icon;

            return (
              <button
                key={format.id}
                onClick={() => handleExport(format.id)}
                disabled={isExporting}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{format.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {format.description}
                  </div>
                </div>
                {isExporting ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                ) : (
                  <Download className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>

        {exportSuccess && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400">
              {exportSuccess}
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Delete Account Section */}
      <div>
        <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Once you delete your account, there is no going back. Please be certain.
        </p>

        <button
          onClick={() => setShowDeleteDialog(true)}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-md animate-scale-in">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-destructive/5">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Delete Account
                </h2>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone
                </p>
              </div>
              <button
                onClick={closeDeleteDialog}
                disabled={isDeletingAccount}
                className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  All your data will be permanently deleted, including:
                </p>
                <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  <li>Your profile information</li>
                  <li>All todos and tasks</li>
                  <li>Tags and categories</li>
                  <li>Activity history</li>
                </ul>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDeletingAccount}
                  className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="Your current password"
                />
              </div>

              {/* Confirmation Text Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isDeletingAccount}
                  className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="Type DELETE"
                />
              </div>

              {/* Error Message */}
              {deleteError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{deleteError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={!isConfirmValid || !password || isDeletingAccount}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataManagementSection;
