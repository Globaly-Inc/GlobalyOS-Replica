/**
 * Centralized error handling utilities for consistent user-friendly error messages
 * throughout the GlobalyOS application
 */

import { toast } from 'sonner';
import { logErrorToDatabase } from '@/hooks/useErrorLogger';
import type { ErrorType } from '@/types/errorLogs';

/**
 * Extract a user-friendly message from various error types
 * Handles Error objects, Supabase/Postgres errors, and string errors
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  // Handle Error objects
  if (error instanceof Error) {
    return parseErrorMessage(error.message) || fallback;
  }

  // Handle Supabase/Postgres error objects with message, details, or hint
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    // Try message first
    if (typeof err.message === 'string' && err.message) {
      return parseErrorMessage(err.message) || fallback;
    }
    
    // Try details (Postgres often puts useful info here)
    if (typeof err.details === 'string' && err.details) {
      return parseErrorMessage(err.details) || fallback;
    }
    
    // Try hint
    if (typeof err.hint === 'string' && err.hint) {
      return parseErrorMessage(err.hint) || fallback;
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return parseErrorMessage(error) || fallback;
  }

  return fallback;
}

/**
 * Parse and clean up error messages for user display
 * Removes technical prefixes and formats messages nicely
 */
function parseErrorMessage(message: string): string {
  if (!message) return '';
  
  let cleaned = message
    // Remove Postgres error prefixes
    .replace(/^ERROR:\s*/i, '')
    .replace(/^RAISE EXCEPTION:\s*/i, '')
    .replace(/^SQLSTATE\[\w+\]:\s*/i, '')
    // Handle unique constraint violations for wiki folders
    .replace(/idx_wiki_folders_unique_name/i,
      'A folder with this name already exists in this location')
    .replace(/duplicate key value violates unique constraint.*wiki_folders/i,
      'A folder with this name already exists in this location')
    // Handle RLS violations with a friendly message
    .replace(/^new row violates row-level security policy.*$/i, 
      'You do not have permission to perform this action')
    .replace(/^violates row-level security policy.*$/i,
      'You do not have permission to perform this action')
    // Remove function context info that users don't need
    .replace(/\s*CONTEXT:.*$/s, '')
    // Clean up whitespace
    .trim();
  
  // Capitalize first letter if not already
  if (cleaned && cleaned[0] === cleaned[0].toLowerCase()) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  // Ensure message ends with proper punctuation for readability
  if (cleaned && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  
  return cleaned;
}

/**
 * Show an error toast with proper formatting
 * Extracts the actual error message and displays it to the user
 * Optionally logs to database for Super Admin monitoring
 * 
 * @param error - The error object/string to display
 * @param fallback - Fallback message if error can't be parsed
 * @param options - Additional options (log: whether to console.error, logToDb: whether to log to database)
 * @returns The displayed error message
 */
export function showErrorToast(
  error: unknown,
  fallback: string,
  options?: { 
    log?: boolean;
    logToDb?: boolean;
    componentName?: string;
    actionAttempted?: string;
    errorType?: ErrorType;
  }
): string {
  const message = getErrorMessage(error, fallback);
  
  // Log the error with full details for debugging (default: true)
  if (options?.log !== false) {
    console.error(`${fallback}:`, error);
  }
  
  // Log to database if enabled (default: true for production errors)
  if (options?.logToDb !== false) {
    logErrorToDatabase({
      errorType: options?.errorType || 'runtime',
      errorMessage: message,
      errorStack: error instanceof Error ? error.stack : undefined,
      componentName: options?.componentName,
      actionAttempted: options?.actionAttempted || fallback,
    });
  }
  
  toast.error(message);
  
  return message;
}
