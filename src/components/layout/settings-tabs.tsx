/**
 * Settings Tabs Component
 * 
 * Tabbed interface for settings page with sections:
 * - Appearance (theme selection)
 * - Notifications (email preferences)
 * - Data (export and account deletion)
 */

'use client';

import React, { useState } from 'react';
import {
  Palette,
  Bell,
  Database,
} from 'lucide-react';
import { ThemeSelector } from './theme-selector';
import { NotificationPreferences } from './notification-preferences';
import { DataManagementSection } from './data-management-section';

type TabId = 'appearance' | 'notifications' | 'data';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    description: 'Customize the look and feel',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Manage email preferences',
  },
  {
    id: 'data',
    label: 'Data',
    icon: Database,
    description: 'Export or delete your data',
  },
];

interface SettingsTabsProps {
  initialTab?: TabId;
}

/**
 * Settings Tabs Component
 */
export function SettingsTabs({ initialTab = 'appearance' }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return <ThemeSelector />;
      case 'notifications':
        return <NotificationPreferences />;
      case 'data':
        return <DataManagementSection />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default SettingsTabs;
