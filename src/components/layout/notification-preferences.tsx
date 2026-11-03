/**
 * Notification Preferences Component
 * 
 * Email notification preferences with toggle switches for:
 * - Weekly digest
 * - Task reminders
 * - Product updates
 * - Security alerts
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Bell,
  Check,
  Loader2,
} from 'lucide-react';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultEnabled: boolean;
}

const notificationSettings: NotificationSetting[] = [
  {
    id: 'weeklyDigest',
    label: 'Weekly Digest',
    description: 'Get a summary of your weekly todo activity',
    icon: Mail,
    defaultEnabled: true,
  },
  {
    id: 'taskReminders',
    label: 'Task Reminders',
    description: 'Receive reminders for upcoming and overdue tasks',
    icon: Bell,
    defaultEnabled: true,
  },
  {
    id: 'productUpdates',
    label: 'Product Updates',
    description: 'Stay informed about new features and improvements',
    icon: Check,
    defaultEnabled: false,
  },
  {
    id: 'securityAlerts',
    label: 'Security Alerts',
    description: 'Important security notifications about your account',
    icon: Check,
    defaultEnabled: true,
  },
];

/**
 * Notification Preferences Component
 */
export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = () => {
      const saved = localStorage.getItem('notificationPreferences');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPreferences(parsed);
        } catch {
          // Fallback to defaults
          const defaults = notificationSettings.reduce(
            (acc, setting) => ({ ...acc, [setting.id]: setting.defaultEnabled }),
            {}
          );
          setPreferences(defaults);
        }
      } else {
        // Use defaults
        const defaults = notificationSettings.reduce(
          (acc, setting) => ({ ...acc, [setting.id]: setting.defaultEnabled }),
          {}
        );
        setPreferences(defaults);
      }
      setIsLoading(false);
    };

    loadPreferences();
  }, []);

  // Toggle preference
  const togglePreference = async (id: string) => {
    const newPreferences = {
      ...preferences,
      [id]: !preferences[id],
    };

    setPreferences(newPreferences);
    setIsSaving(true);
    setSaveMessage('');

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Save to localStorage (in real app, this would be an API call)
    localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));

    setIsSaving(false);
    setSaveMessage('Preferences saved');

    // Clear message after 2 seconds
    setTimeout(() => setSaveMessage(''), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Notifications</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Notifications</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your email notification preferences.
        </p>
      </div>

      <div className="space-y-3">
        {notificationSettings.map((setting) => {
          const Icon = setting.icon;
          const isEnabled = preferences[setting.id] ?? setting.defaultEnabled;

          return (
            <div
              key={setting.id}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{setting.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {setting.description}
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => togglePreference(setting.id)}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                } disabled:opacity-50`}
                role="switch"
                aria-checked={isEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Save Status */}
      <div className="flex items-center gap-2 text-sm">
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Saving...</span>
          </>
        ) : saveMessage ? (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400">{saveMessage}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default NotificationPreferences;
