import { supabase } from "@/integrations/supabase/client";
import { logErrorToDatabase } from "@/hooks/useErrorLogger";
import type { ErrorType } from "@/types/errorLogs";

interface EdgeFunctionResult<T> {
  data: T | null;
  error: Error | null;
}

interface EdgeFunctionOptions {
  componentName?: string;
  actionAttempted?: string;
  logErrors?: boolean;
}

/**
 * Invoke an edge function with proper error handling and logging.
 * Automatically extracts meaningful error messages from edge function responses.
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
      // Try to extract a more meaningful message
      let errorMessage = response.error.message;
      
      // Check if the error contains JSON with a more specific message
      if (response.error.message.includes("Edge Function returned a non-2xx status code")) {
        // The actual error might be in the response data
        if (response.data?.error) {
          errorMessage = response.data.error;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        }
      }

      const error = new Error(errorMessage);
      
      if (logErrors) {
        await logErrorToDatabase({
          errorType: "edge_function" as ErrorType,
          errorMessage: error.message,
          componentName,
          actionAttempted: actionAttempted || `Invoke ${functionName}`,
          metadata: {
            functionName,
            originalError: response.error.message,
          },
        });
      }
      
      return { data: null, error };
    }

    // Handle application-level errors in response body
    if (response.data?.error) {
      const error = new Error(response.data.error);
      
      if (logErrors) {
        await logErrorToDatabase({
          errorType: "edge_function" as ErrorType,
          errorMessage: error.message,
          componentName,
          actionAttempted: actionAttempted || `Invoke ${functionName}`,
          metadata: {
            functionName,
            responseData: response.data,
          },
        });
      }
      
      return { data: null, error };
    }

    return { data: response.data as T, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error occurred");
    
    if (logErrors) {
      await logErrorToDatabase({
        errorType: "edge_function" as ErrorType,
        errorMessage: error.message,
        componentName,
        actionAttempted: actionAttempted || `Invoke ${functionName}`,
        metadata: {
          functionName,
          rawError: String(err),
        },
      });
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
