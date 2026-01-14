/**
 * Global Error Capture Service
 * 
 * Captures console logs, network requests, user breadcrumbs, and performance metrics
 * to provide engineering teams with full context when debugging errors.
 * 
 * Industry best practices implemented:
 * - Console interception (error, warn)
 * - Fetch/XHR interception for network tracking
 * - User action breadcrumbs
 * - Performance metrics capture
 * - Session duration tracking
 * - Route history
 */

import { logErrorToDatabase } from '@/hooks/useErrorLogger';
import type { ConsoleEntry, NetworkRequest, Breadcrumb, PerformanceMetrics } from '@/types/errorLogs';

// ============= Configuration =============
const MAX_CONSOLE_ENTRIES = 20;
const MAX_NETWORK_REQUESTS = 20;
const MAX_BREADCRUMBS = 30;
const DEDUP_WINDOW_MS = 5000; // 5 seconds for duplicate detection

// ============= Storage =============
const consoleEntries: ConsoleEntry[] = [];
const networkRequests: NetworkRequest[] = [];
const breadcrumbs: Breadcrumb[] = [];
const routeHistory: string[] = [];
let sessionStartTime: number = Date.now();

// Deduplication cache: fingerprint -> last logged timestamp
const recentErrors = new Map<string, number>();

// Store original functions
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;
let originalFetch: typeof fetch;

// ============= Deduplication =============

/**
 * Generate a fingerprint for an error based on key properties
 */
export function generateErrorFingerprint(errorType: string, errorMessage: string, componentName?: string, actionAttempted?: string): string {
  const parts = [
    errorType,
    errorMessage.substring(0, 200), // Limit message length for fingerprint
    componentName || '',
    actionAttempted || '',
  ];
  return parts.join('|');
}

/**
 * Check if this error was logged recently (within dedup window)
 * Returns true if it's a duplicate and should be skipped
 */
export function isDuplicateError(fingerprint: string): boolean {
  const now = Date.now();
  const lastLogged = recentErrors.get(fingerprint);
  
  if (lastLogged && (now - lastLogged) < DEDUP_WINDOW_MS) {
    return true; // Duplicate - skip logging
  }
  
  // Not a duplicate - record this error
  recentErrors.set(fingerprint, now);
  
  // Cleanup old entries to prevent memory leaks
  cleanupOldDedupEntries(now);
  
  return false;
}

function cleanupOldDedupEntries(now: number): void {
  for (const [key, timestamp] of recentErrors.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS * 2) {
      recentErrors.delete(key);
    }
  }
}

// ============= Console Capture =============

function captureConsoleEntry(level: 'log' | 'warn' | 'error', args: unknown[]): void {
  const entry: ConsoleEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`;
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' '),
    stack: args.find(arg => arg instanceof Error)?.stack || undefined,
  };
  
  consoleEntries.push(entry);
  
  // Keep only the last N entries
  if (consoleEntries.length > MAX_CONSOLE_ENTRIES) {
    consoleEntries.shift();
  }
}

function interceptConsole(): void {
  // Store originals
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;
  
  // Override console.error
  console.error = (...args: unknown[]) => {
    captureConsoleEntry('error', args);
    originalConsoleError.apply(console, args);
  };
  
  // Override console.warn
  console.warn = (...args: unknown[]) => {
    captureConsoleEntry('warn', args);
    originalConsoleWarn.apply(console, args);
  };
}

// ============= Network Capture =============

function captureNetworkRequest(request: NetworkRequest): void {
  networkRequests.push(request);
  
  // Keep only the last N requests
  if (networkRequests.length > MAX_NETWORK_REQUESTS) {
    networkRequests.shift();
  }
  
  // Add breadcrumb for failed requests
  if (!request.success) {
    trackBreadcrumb('api_error', `${request.method} ${request.url} failed with status ${request.status}`);
  }
}

/**
 * Extract function name from edge function URL
 */
function extractFunctionName(url: string): string | null {
  const match = url.match(/\/functions\/v1\/([^/?]+)/);
  return match ? match[1] : null;
}

/**
 * Determine error severity based on HTTP status code
 */
function getSeverityFromStatus(status: number): 'warning' | 'error' {
  if (status === 401 || status === 403) return 'warning';
  if (status >= 500) return 'error';
  return 'error';
}

function interceptFetch(): void {
  originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startTime = performance.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    
    try {
      const response = await originalFetch(input, init);
      const duration = Math.round(performance.now() - startTime);
      
      captureNetworkRequest({
        timestamp: new Date().toISOString(),
        url,
        method,
        status: response.status,
        duration,
        success: response.ok,
      });
      
      // Auto-detect and log edge function errors
      const isEdgeFunction = url.includes('/functions/v1/');
      if (isEdgeFunction && !response.ok) {
        const functionName = extractFunctionName(url);
        const severity = getSeverityFromStatus(response.status);
        
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        let errorMessage = `Edge function ${functionName || 'unknown'} failed with status ${response.status}`;
        let errorDetails: Record<string, unknown> = {};
        
        try {
          const responseBody = await clonedResponse.json();
          if (responseBody?.error) {
            errorMessage = responseBody.error;
            errorDetails = responseBody;
          }
        } catch {
          // Response is not JSON, use default message
        }
        
        const fingerprint = generateErrorFingerprint('edge_function', errorMessage, functionName || undefined);
        
        if (!isDuplicateError(fingerprint)) {
          logErrorToDatabase({
            errorType: 'edge_function',
            severity,
            errorMessage,
            componentName: functionName || undefined,
            actionAttempted: `${method} ${functionName || url}`,
            metadata: {
              functionName,
              status: response.status,
              duration,
              method,
              url,
              ...errorDetails,
            },
            consoleLogs: getRecentConsoleLogs(),
            networkRequests: getRecentNetworkRequests(),
            breadcrumbs: getBreadcrumbs(),
            sessionDurationMs: getSessionDuration(),
            routeHistory: getRouteHistory(),
            performanceMetrics: getPerformanceMetrics(),
          });
        }
      }
      
      return response;
    } catch (error) {
      captureNetworkRequest({
        timestamp: new Date().toISOString(),
        url,
        method,
        status: 0,
        duration: Math.round(performance.now() - startTime),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

// ============= Breadcrumbs =============

export function trackBreadcrumb(type: Breadcrumb['type'], message: string, target?: string): void {
  const crumb: Breadcrumb = {
    timestamp: Date.now(),
    type,
    message,
    target,
  };
  
  breadcrumbs.push(crumb);
  
  // Keep only the last N breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

/**
 * Track route changes for navigation breadcrumbs
 */
export function trackRouteChange(path: string): void {
  trackBreadcrumb('navigation', `Navigated to ${path}`, path);
  
  routeHistory.push(path);
  if (routeHistory.length > 20) {
    routeHistory.shift();
  }
}

function setupClickTracking(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    // Get meaningful identifier for the clicked element
    const identifier = 
      target.getAttribute('data-testid') ||
      target.id ||
      target.getAttribute('aria-label') ||
      target.textContent?.substring(0, 30) ||
      target.tagName.toLowerCase();
    
    // Only track meaningful clicks (buttons, links, inputs)
    if (target.matches('button, a, input, select, [role="button"], [data-action]')) {
      trackBreadcrumb('click', `Clicked: ${identifier}`, target.tagName.toLowerCase());
    }
  }, { capture: true, passive: true });
}

function setupInputTracking(): void {
  document.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    
    if (target.matches('input, select, textarea')) {
      const identifier = 
        target.getAttribute('name') ||
        target.id ||
        target.getAttribute('placeholder') ||
        'unknown field';
      
      // Don't log actual values for privacy
      trackBreadcrumb('input', `Changed: ${identifier}`, target.tagName.toLowerCase());
    }
  }, { capture: true, passive: true });
}

// ============= Performance Metrics =============

export function getPerformanceMetrics(): PerformanceMetrics {
  const metrics: PerformanceMetrics = {};
  
  // Memory info (Chrome only)
  if ('memory' in performance) {
    const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    metrics.usedJSHeapSize = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    metrics.totalJSHeapSize = Math.round(memory.totalJSHeapSize / 1024 / 1024);
  }
  
  // Network info
  if ('connection' in navigator) {
    const connection = (navigator as unknown as { connection: { effectiveType?: string; downlink?: number; rtt?: number } }).connection;
    metrics.connectionType = connection?.effectiveType;
    metrics.downlink = connection?.downlink;
    metrics.rtt = connection?.rtt;
  }
  
  return metrics;
}

// ============= Getters =============

export function getRecentConsoleLogs(): ConsoleEntry[] {
  return [...consoleEntries];
}

export function getRecentNetworkRequests(): NetworkRequest[] {
  return [...networkRequests];
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

export function getRouteHistory(): string[] {
  return [...routeHistory];
}

export function getSessionDuration(): number {
  return Date.now() - sessionStartTime;
}

// ============= Global Error Handlers =============

/**
 * Check if an error message is related to ServiceWorker
 * These errors are expected during network issues (device sleep/wake, offline periods)
 */
function isServiceWorkerError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('serviceworker') ||
         lowerMessage.includes('service worker') ||
         lowerMessage.includes('sw.js');
}

function setupGlobalErrorHandlers(): void {
  // Handle uncaught errors
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = typeof message === 'string' ? message : 'Unknown error';
    
    // Skip ServiceWorker errors - expected during network issues (device sleep/wake)
    if (isServiceWorkerError(errorMessage)) {
      console.debug('[ErrorCapture] Suppressing SW error (expected during network issues)');
      return;
    }
    
    const fingerprint = generateErrorFingerprint('runtime', errorMessage);
    
    if (isDuplicateError(fingerprint)) {
      console.debug('[ErrorCapture] Skipping duplicate error:', errorMessage.substring(0, 50));
      return;
    }
    
    logErrorToDatabase({
      errorType: 'runtime',
      severity: 'error',
      errorMessage,
      errorStack: error?.stack,
      metadata: { source, lineno, colno },
      consoleLogs: getRecentConsoleLogs(),
      networkRequests: getRecentNetworkRequests(),
      breadcrumbs: getBreadcrumbs(),
      sessionDurationMs: getSessionDuration(),
      routeHistory: getRouteHistory(),
      performanceMetrics: getPerformanceMetrics(),
    });
  };
  
  // Handle unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    const errorMessage = reason instanceof Error 
      ? reason.message 
      : typeof reason === 'string' 
        ? reason 
        : 'Unhandled Promise Rejection';
    
    // Skip ServiceWorker errors - expected during network issues (device sleep/wake)
    if (isServiceWorkerError(errorMessage)) {
      console.debug('[ErrorCapture] Suppressing SW error (expected during network issues)');
      return;
    }
    
    const fingerprint = generateErrorFingerprint('runtime', errorMessage);
    
    if (isDuplicateError(fingerprint)) {
      console.debug('[ErrorCapture] Skipping duplicate rejection:', errorMessage.substring(0, 50));
      return;
    }
    
    logErrorToDatabase({
      errorType: 'runtime',
      severity: 'error',
      errorMessage: `Unhandled Promise Rejection: ${errorMessage}`,
      errorStack: reason instanceof Error ? reason.stack : undefined,
      consoleLogs: getRecentConsoleLogs(),
      networkRequests: getRecentNetworkRequests(),
      breadcrumbs: getBreadcrumbs(),
      sessionDurationMs: getSessionDuration(),
      routeHistory: getRouteHistory(),
      performanceMetrics: getPerformanceMetrics(),
    });
  };
}

// ============= Initialization =============

let initialized = false;

export function initErrorCapture(): void {
  if (initialized) {
    console.warn('[ErrorCapture] Already initialized');
    return;
  }
  
  sessionStartTime = Date.now();
  
  interceptConsole();
  interceptFetch();
  setupClickTracking();
  setupInputTracking();
  setupGlobalErrorHandlers();
  
  initialized = true;
  console.debug('[ErrorCapture] Initialized successfully');
}

/**
 * Reset capture state (useful for testing)
 */
export function resetErrorCapture(): void {
  consoleEntries.length = 0;
  networkRequests.length = 0;
  breadcrumbs.length = 0;
  routeHistory.length = 0;
  recentErrors.clear();
  sessionStartTime = Date.now();
}
