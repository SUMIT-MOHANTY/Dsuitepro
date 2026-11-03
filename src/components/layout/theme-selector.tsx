/**
 * Theme Selector Component
 * 
 * Theme selection with light/dark/system options and live preview.
 * Theme changes apply immediately without page reload.
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeOption {
  id: Theme;
  label: string;
  icon: React.ElementType;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Clean and bright appearance',
  },
  {
    id: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Easy on the eyes in low light',
  },
  {
    id: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Follows your device preference',
  },
];

/**
 * Theme Selector Component
 */
export function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Apply new theme
    if (theme === 'system') {
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      root.classList.add(theme);
    }

    // Save preference
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred theme. Changes apply immediately.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Appearance</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your preferred theme. Changes apply immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.id;

          return (
            <button
              key={option.id}
              onClick={() => setTheme(option.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}

              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  isSelected ? 'bg-primary/10' : 'bg-muted'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </div>

              {/* Label */}
              <div className="font-medium text-foreground">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview Section */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-3">Preview</h4>
        <div className="p-4 bg-card rounded-lg border border-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sun className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Sample Card</div>
              <div className="text-xs text-muted-foreground">
                This is how cards look in the current theme
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium">
              Primary Button
            </div>
            <div className="px-3 py-1.5 bg-muted text-muted-foreground rounded-md text-xs font-medium">
              Secondary
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemeSelector;
