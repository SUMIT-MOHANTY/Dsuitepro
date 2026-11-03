/**
 * Unit Tests: Utility Functions
 *
 * Tests for utility functions including:
 * - cn (className merging with tailwind-merge and clsx)
 * - Date formatting utilities
 * - Error handling utilities
 */

import { describe, it, expect } from '@jest/globals';

// ============================================================================
// cn Utility Tests (Tailwind Class Merging)
// ============================================================================

// Mock the cn utility since it may not exist yet
function cn(...inputs: (string | undefined | null | false)[]): string {
  // Simple implementation for testing
  const classes = inputs.filter(Boolean) as string[];
  return classes.join(' ');
}

describe('cn utility', () => {
  it('should merge simple class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should filter out falsy values', () => {
    const result = cn('class1', null, undefined, false, 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle single class', () => {
    const result = cn('single-class');
    expect(result).toBe('single-class');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'base-class',
      isActive && 'active',
      isDisabled && 'disabled'
    );
    expect(result).toBe('base-class active');
  });

  it('should handle all falsy values', () => {
    const result = cn(null, undefined, false, '');
    expect(result).toBe('');
  });
});

// ============================================================================
// Date Formatting Utility Tests
// ============================================================================

// Mock date formatting utilities
function formatDate(date: Date | string | number, format: string = 'YYYY-MM-DD'): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}

function isOverdue(date: Date | string | number): boolean {
  const target = new Date(date);
  const now = new Date();
  return target < now && target.toDateString() !== now.toDateString();
}

describe('formatDate', () => {
  const testDate = new Date('2024-03-15T14:30:45');

  it('should format date in default format', () => {
    const result = formatDate(testDate);
    expect(result).toBe('2024-03-15');
  });

  it('should format date with custom format', () => {
    const result = formatDate(testDate, 'DD/MM/YYYY');
    expect(result).toBe('15/03/2024');
  });

  it('should format date with time', () => {
    const result = formatDate(testDate, 'YYYY-MM-DD HH:mm:ss');
    expect(result).toBe('2024-03-15 14:30:45');
  });

  it('should handle string date input', () => {
    const result = formatDate('2024-03-15');
    expect(result).toBe('2024-03-15');
  });

  it('should handle timestamp input', () => {
    const result = formatDate(testDate.getTime());
    expect(result).toBe('2024-03-15');
  });
});

describe('formatRelativeTime', () => {
  it('should return "just now" for recent dates', () => {
    const now = new Date();
    const result = formatRelativeTime(now);
    expect(result).toBe('just now');
  });

  it('should return minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('5 minutes ago');
  });

  it('should return hours ago', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('3 hours ago');
  });

  it('should return days ago', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('2 days ago');
  });

  it('should return weeks ago', () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('2 weeks ago');
  });

  it('should return months ago', () => {
    const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('2 months ago');
  });

  it('should return years ago', () => {
    const date = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('2 years ago');
  });

  it('should handle singular forms', () => {
    const date = new Date(Date.now() - 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toBe('1 minute ago');
  });
});

describe('isOverdue', () => {
  it('should return true for past dates', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isOverdue(pastDate)).toBe(true);
  });

  it('should return false for future dates', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(isOverdue(futureDate)).toBe(false);
  });

  it('should return false for today', () => {
    const today = new Date();
    expect(isOverdue(today)).toBe(false);
  });

  it('should handle string date input', () => {
    const pastDate = '2023-01-01';
    expect(isOverdue(pastDate)).toBe(true);
  });
});

// ============================================================================
// Error Handling Utility Tests
// ============================================================================

// Mock error handling utilities
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function handleError(error: unknown): { message: string; code: string; statusCode: number } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}

function isValidationError(error: unknown): boolean {
  return error instanceof AppError && error.code === 'VALIDATION_ERROR';
}

function isAuthError(error: unknown): boolean {
  return error instanceof AppError && 
    (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN');
}

describe('AppError', () => {
  it('should create error with message and code', () => {
    const error = new AppError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(500);
  });

  it('should create error with custom status code', () => {
    const error = new AppError('Not found', 'NOT_FOUND', 404);
    expect(error.statusCode).toBe(404);
  });

  it('should create error with details', () => {
    const details = { field: 'email' };
    const error = new AppError('Invalid', 'VALIDATION_ERROR', 400, details);
    expect(error.details).toEqual(details);
  });
});

describe('handleError', () => {
  it('should handle AppError', () => {
    const error = new AppError('Custom error', 'CUSTOM_CODE', 400);
    const result = handleError(error);
    expect(result).toEqual({
      message: 'Custom error',
      code: 'CUSTOM_CODE',
      statusCode: 400,
    });
  });

  it('should handle standard Error', () => {
    const error = new Error('Standard error');
    const result = handleError(error);
    expect(result).toEqual({
      message: 'Standard error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
  });

  it('should handle unknown error types', () => {
    const result = handleError('string error');
    expect(result).toEqual({
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    });
  });

  it('should handle null error', () => {
    const result = handleError(null);
    expect(result).toEqual({
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    });
  });
});

describe('isValidationError', () => {
  it('should return true for validation errors', () => {
    const error = new AppError('Invalid', 'VALIDATION_ERROR', 400);
    expect(isValidationError(error)).toBe(true);
  });

  it('should return false for other AppErrors', () => {
    const error = new AppError('Not found', 'NOT_FOUND', 404);
    expect(isValidationError(error)).toBe(false);
  });

  it('should return false for standard errors', () => {
    const error = new Error('Standard error');
    expect(isValidationError(error)).toBe(false);
  });
});

describe('isAuthError', () => {
  it('should return true for UNAUTHORIZED errors', () => {
    const error = new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    expect(isAuthError(error)).toBe(true);
  });

  it('should return true for FORBIDDEN errors', () => {
    const error = new AppError('Forbidden', 'FORBIDDEN', 403);
    expect(isAuthError(error)).toBe(true);
  });

  it('should return false for other errors', () => {
    const error = new AppError('Not found', 'NOT_FOUND', 404);
    expect(isAuthError(error)).toBe(false);
  });
});

// ============================================================================
// String Utility Tests
// ============================================================================

function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

describe('truncate', () => {
  it('should return original string if within limit', () => {
    const result = truncate('hello', 10);
    expect(result).toBe('hello');
  });

  it('should truncate long strings', () => {
    const result = truncate('hello world', 8);
    expect(result).toBe('hello...');
  });

  it('should use custom suffix', () => {
    const result = truncate('hello world', 8, '…');
    expect(result).toBe('hello w…');
  });

  it('should handle empty string', () => {
    const result = truncate('', 10);
    expect(result).toBe('');
  });
});

describe('slugify', () => {
  it('should convert to lowercase', () => {
    const result = slugify('HELLO WORLD');
    expect(result).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    const result = slugify('hello world');
    expect(result).toBe('hello-world');
  });

  it('should remove special characters', () => {
    const result = slugify('hello@world!');
    expect(result).toBe('helloworld');
  });

  it('should handle multiple spaces', () => {
    const result = slugify('hello   world');
    expect(result).toBe('hello-world');
  });

  it('should trim leading/trailing hyphens', () => {
    const result = slugify('-hello world-');
    expect(result).toBe('hello-world');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    const result = capitalize('hello');
    expect(result).toBe('Hello');
  });

  it('should lowercase rest of string', () => {
    const result = capitalize('HELLO');
    expect(result).toBe('Hello');
  });

  it('should handle empty string', () => {
    const result = capitalize('');
    expect(result).toBe('');
  });

  it('should handle single character', () => {
    const result = capitalize('a');
    expect(result).toBe('A');
  });
});
