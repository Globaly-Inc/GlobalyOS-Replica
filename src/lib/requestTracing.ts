/**
 * Request Tracing Utility
 * 
 * Generates unique request IDs and provides correlation between
 * frontend requests and backend edge functions for debugging.
 */

import { trackBreadcrumb } from './errorCapture';

// Store current request ID for access in error handlers
let currentRequestContext: Map<string, { requestId: string; url: string; startTime: number }> = new Map();

/**
 * Generate a unique request ID
 * Format: req_<timestamp>_<random>
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `req_${timestamp}_${random}`;
}

/**
 * Get the current active request ID if one exists
 */
export function getCurrentRequestId(): string | null {
  // Return the most recent request ID
  const entries = Array.from(currentRequestContext.entries());
  if (entries.length === 0) return null;
  return entries[entries.length - 1][1].requestId;
}

/**
 * Create a traced fetch function that adds X-Request-ID headers
 * and tracks requests in breadcrumbs for debugging
 */
export function createTracedFetch(originalFetch: typeof fetch): typeof fetch {
  return async function tracedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const requestId = generateRequestId();
    const url = typeof input === 'string' 
      ? input 
      : input instanceof URL 
        ? input.toString() 
        : input.url;
    const method = init?.method || 'GET';
    const startTime = performance.now();
    
    // Clone headers to avoid mutating the original
    const headers = new Headers(init?.headers);
    
    // Add X-Request-ID header for backend correlation
    headers.set('X-Request-ID', requestId);
    
    // Store context for potential error correlation
    currentRequestContext.set(requestId, { requestId, url, startTime });
    
    // Limit context map size to prevent memory leaks
    if (currentRequestContext.size > 100) {
      const firstKey = currentRequestContext.keys().next().value;
      if (firstKey) currentRequestContext.delete(firstKey);
    }
    
    // Track in breadcrumbs for error context
    trackBreadcrumb('api_request', `${method} ${extractEndpoint(url)}`, requestId);
    
    try {
      const response = await originalFetch(input, {
        ...init,
        headers,
      });
      
      const duration = Math.round(performance.now() - startTime);
      
      // Track completion in breadcrumbs
      if (!response.ok) {
        trackBreadcrumb('api_error', `${method} ${extractEndpoint(url)} → ${response.status}`, requestId);
      }
      
      // Clean up context after response
      setTimeout(() => {
        currentRequestContext.delete(requestId);
      }, 5000); // Keep for 5s in case of error handling
      
      return response;
    } catch (error) {
      trackBreadcrumb('api_error', `${method} ${extractEndpoint(url)} → Network Error`, requestId);
      currentRequestContext.delete(requestId);
      throw error;
    }
  };
}

/**
 * Extract the endpoint path from a URL for cleaner logging
 */
function extractEndpoint(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // For edge functions, extract just the function name
    const functionsMatch = path.match(/\/functions\/v1\/([^/?]+)/);
    if (functionsMatch) {
      return `/functions/${functionsMatch[1]}`;
    }
    
    // For REST API, extract table name
    const restMatch = path.match(/\/rest\/v1\/([^/?]+)/);
    if (restMatch) {
      return `/rest/${restMatch[1]}`;
    }
    
    // Return path if it's short enough
    if (path.length <= 50) return path;
    
    // Truncate long paths
    return path.substring(0, 47) + '...';
  } catch {
    // If URL parsing fails, return truncated raw URL
    if (url.length <= 50) return url;
    return url.substring(0, 47) + '...';
  }
}

/**
 * Initialize request tracing by patching global fetch
 * Should be called once at app startup, after error capture is initialized
 */
export function initRequestTracing(): void {
  if (typeof window !== 'undefined' && !('__tracedFetch' in window)) {
    const originalFetch = window.fetch;
    window.fetch = createTracedFetch(originalFetch);
    (window as any).__tracedFetch = true;
    console.debug('[RequestTracing] Initialized successfully');
  }
}
