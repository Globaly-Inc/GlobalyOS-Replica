/**
 * Standardized Edge Function Logger
 * 
 * Provides consistent logging format across all edge functions
 * with request ID correlation for debugging.
 */

export interface Logger {
  info: (msg: string, data?: Record<string, unknown>) => void;
  warn: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, error?: Error | unknown, data?: Record<string, unknown>) => void;
  audit: (action: string, userId: string | null, orgId: string | null, details?: Record<string, unknown>) => void;
  debug: (msg: string, data?: Record<string, unknown>) => void;
}

/**
 * Create a logger instance for an edge function
 * 
 * @param functionName - Name of the edge function (e.g., 'send-notification')
 * @param requestId - Optional X-Request-ID from frontend for correlation
 */
export function createLogger(functionName: string, requestId?: string | null): Logger {
  const prefix = requestId 
    ? `[${functionName}][${requestId}]` 
    : `[${functionName}]`;
  
  const formatData = (data?: Record<string, unknown>): string => {
    if (!data || Object.keys(data).length === 0) return '';
    try {
      return ' ' + JSON.stringify(data);
    } catch {
      return ' [data not serializable]';
    }
  };
  
  const formatError = (error?: Error | unknown): string => {
    if (!error) return '';
    if (error instanceof Error) {
      return ` | Error: ${error.message}`;
    }
    return ` | Error: ${String(error)}`;
  };

  return {
    info: (msg: string, data?: Record<string, unknown>) => {
      console.log(`${prefix} INFO: ${msg}${formatData(data)}`);
    },
    
    warn: (msg: string, data?: Record<string, unknown>) => {
      console.warn(`${prefix} WARN: ${msg}${formatData(data)}`);
    },
    
    error: (msg: string, error?: Error | unknown, data?: Record<string, unknown>) => {
      console.error(`${prefix} ERROR: ${msg}${formatError(error)}${formatData(data)}`);
    },
    
    audit: (action: string, userId: string | null, orgId: string | null, details?: Record<string, unknown>) => {
      const auditData = {
        action,
        userId: userId || 'anonymous',
        orgId: orgId || 'unknown',
        timestamp: new Date().toISOString(),
        ...details,
      };
      console.log(`${prefix} AUDIT:`, JSON.stringify(auditData));
    },
    
    debug: (msg: string, data?: Record<string, unknown>) => {
      // Only log in development or when explicitly enabled
      if (Deno.env.get('DEBUG') === 'true' || Deno.env.get('DENO_ENV') !== 'production') {
        console.debug(`${prefix} DEBUG: ${msg}${formatData(data)}`);
      }
    },
  };
}

/**
 * Extract request ID from incoming request headers
 */
export function getRequestId(req: Request): string | null {
  return req.headers.get('X-Request-ID');
}

/**
 * Create a logger from a request, automatically extracting the request ID
 */
export function createLoggerFromRequest(functionName: string, req: Request): Logger {
  return createLogger(functionName, getRequestId(req));
}
