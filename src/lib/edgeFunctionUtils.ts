import { supabase } from "@/integrations/supabase/client";
import { logErrorToDatabase } from "@/hooks/useErrorLogger";
import { 
  getRecentConsoleLogs, 
  getRecentNetworkRequests, 
  getBreadcrumbs, 
  getSessionDuration, 
  getRouteHistory, 
  getPerformanceMetrics 
} from "@/lib/errorCapture";
import type { ErrorType, ErrorSeverity } from "@/types/errorLogs";

// Marker interface for errors that have already been logged to database
interface LoggedError extends Error {
  __alreadyLoggedToDb?: boolean;
  code?: string;
  statusCode?: number;
}

interface EdgeFunctionResult<T> {
  data: T | null;
  error: LoggedError | null;
}

interface EdgeFunctionOptions {
  componentName?: string;
  actionAttempted?: string;
  logErrors?: boolean;
}

/**
 * Get a user-friendly error message based on status code
 */
function getUserFriendlyMessage(statusCode: number, originalMessage: string): string {
  switch (statusCode) {
    case 401:
      return "You need to be signed in to perform this action";
    case 403:
      if (originalMessage.toLowerCase().includes('admin') || originalMessage.toLowerCase().includes('hr')) {
        return originalMessage; // Keep specific role messages
      }
      return "You don't have permission to perform this action";
    case 404:
      return "The requested resource was not found";
    case 429:
      return "Too many requests. Please wait a moment and try again";
    case 500:
    case 502:
    case 503:
      return "Something went wrong on our end. Please try again";
    default:
      return originalMessage || "An unexpected error occurred";
  }
}

/**
 * Determine error severity based on HTTP status code
 */
function getSeverityFromStatus(statusCode: number): ErrorSeverity {
  if (statusCode === 401 || statusCode === 403) return 'warning';
  if (statusCode === 429) return 'warning';
  if (statusCode >= 500) return 'error';
  return 'error';
}

/**
 * Extract HTTP status code from Supabase error
 */
function extractStatusCode(error: { message?: string; status?: number }): number {
  if (error.status) return error.status;
  
  // Try to extract from message
  const match = error.message?.match(/status[: ]+(\d{3})/i);
  if (match) return parseInt(match[1], 10);
  
  return 500; // Default to server error
}

/**
 * Invoke an edge function with proper error handling and logging.
 * Automatically extracts meaningful error messages from edge function responses.
 * All errors are logged to the database with full context for debugging.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  options: EdgeFunctionOptions = {}
): Promise<EdgeFunctionResult<T>> {
  const { componentName, actionAttempted, logErrors = true } = options;

  try {
    const response = await supabase.functions.invoke(functionName, { body });

    // Handle HTTP-level errors (non-2xx status codes)
    if (response.error) {
      // Extract status code
      const statusCode = extractStatusCode(response.error);
      
      // Try to extract a more meaningful message
      let errorMessage = response.error.message;
      let errorCode: string | undefined;
      
      // Check if the error contains JSON with a more specific message
      if (response.error.message.includes("Edge Function returned a non-2xx status code")) {
        // The actual error might be in the response data
        if (response.data?.error) {
          errorMessage = response.data.error;
          errorCode = response.data.code;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        }
      }

      const userFriendlyMessage = getUserFriendlyMessage(statusCode, errorMessage);
      const error = new Error(userFriendlyMessage) as LoggedError;
      error.code = errorCode;
      error.statusCode = statusCode;
      
      if (logErrors) {
        const severity = getSeverityFromStatus(statusCode);
        await logErrorToDatabase({
          errorType: "edge_function" as ErrorType,
          severity,
          errorMessage: errorMessage, // Log original message for debugging
          componentName,
          actionAttempted: actionAttempted || `Invoke ${functionName}`,
          metadata: {
            functionName,
            statusCode,
            errorCode,
            originalError: response.error.message,
            responseData: response.data,
            userFriendlyMessage,
          },
          consoleLogs: getRecentConsoleLogs(),
          networkRequests: getRecentNetworkRequests(),
          breadcrumbs: getBreadcrumbs(),
          sessionDurationMs: getSessionDuration(),
          routeHistory: getRouteHistory(),
          performanceMetrics: getPerformanceMetrics(),
        });
        // Mark as already logged to prevent double-logging
        error.__alreadyLoggedToDb = true;
      }
      
      return { data: null, error };
    }

    // Handle application-level errors in response body
    if (response.data?.error) {
      const errorMessage = response.data.error;
      const errorCode = response.data.code;
      const statusCode = response.data.statusCode || 400;
      
      const userFriendlyMessage = getUserFriendlyMessage(statusCode, errorMessage);
      const error = new Error(userFriendlyMessage) as LoggedError;
      error.code = errorCode;
      error.statusCode = statusCode;
      
      if (logErrors) {
        const severity = getSeverityFromStatus(statusCode);
        await logErrorToDatabase({
          errorType: "edge_function" as ErrorType,
          severity,
          errorMessage: errorMessage,
          componentName,
          actionAttempted: actionAttempted || `Invoke ${functionName}`,
          metadata: {
            functionName,
            statusCode,
            errorCode,
            responseData: response.data,
            userFriendlyMessage,
          },
          consoleLogs: getRecentConsoleLogs(),
          networkRequests: getRecentNetworkRequests(),
          breadcrumbs: getBreadcrumbs(),
          sessionDurationMs: getSessionDuration(),
          routeHistory: getRouteHistory(),
          performanceMetrics: getPerformanceMetrics(),
        });
        error.__alreadyLoggedToDb = true;
      }
      
      return { data: null, error };
    }

    return { data: response.data as T, error: null };
  } catch (err) {
    const error = (err instanceof Error ? err : new Error("Unknown error occurred")) as LoggedError;
    
    if (logErrors) {
      await logErrorToDatabase({
        errorType: "edge_function" as ErrorType,
        severity: 'error',
        errorMessage: error.message,
        componentName,
        actionAttempted: actionAttempted || `Invoke ${functionName}`,
        metadata: {
          functionName,
          rawError: String(err),
        },
        consoleLogs: getRecentConsoleLogs(),
        networkRequests: getRecentNetworkRequests(),
        breadcrumbs: getBreadcrumbs(),
        sessionDurationMs: getSessionDuration(),
        routeHistory: getRouteHistory(),
        performanceMetrics: getPerformanceMetrics(),
      });
      error.__alreadyLoggedToDb = true;
    }
    
    return { data: null, error };
  }
}

/**
 * Extract a user-friendly error message from an edge function error.
 */
export function getEdgeFunctionErrorMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  if (error instanceof Error) {
    // Clean up the generic edge function error message
    if (error.message.includes("Edge Function returned a non-2xx status code")) {
      return fallback;
    }
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  return fallback;
}
