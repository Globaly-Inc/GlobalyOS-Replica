import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { LogErrorParams } from '@/types/errorLogs';
import {
  generateErrorFingerprint,
  isDuplicateError,
  getRecentConsoleLogs,
  getRecentNetworkRequests,
  getBreadcrumbs,
  getSessionDuration,
  getRouteHistory,
  getPerformanceMetrics,
} from '@/lib/errorCapture';

/**
 * Hook for logging errors to the database
 * Captures browser info, page URL, and associates with current user/org
 * Includes deduplication to prevent duplicate entries within 5 seconds
 */
export const useErrorLogger = () => {
  const logError = useCallback(async (params: LogErrorParams) => {
    try {
      // Check for duplicate errors
      const fingerprint = generateErrorFingerprint(
        params.errorType,
        params.errorMessage,
        params.componentName,
        params.actionAttempted
      );
      
      if (isDuplicateError(fingerprint)) {
        console.debug('[ErrorLogger] Skipping duplicate error:', params.errorMessage.substring(0, 50));
        return;
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get organization ID from employee record if user exists
      let organizationId: string | null = null;
      if (user) {
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (employeeError) {
          console.warn('[ErrorLogger] Failed to fetch employee org:', employeeError.message);
        }
        organizationId = employee?.organization_id || null;
      }
      
      // Capture context
      const pageUrl = window.location.href;
      const userAgent = navigator.userAgent;
      const deviceType = /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 'mobile' : 'desktop';
      
      // Get browser info
      const browserInfo = getBrowserInfo(userAgent);
      
      // Get enhanced context
      const consoleLogs = params.consoleLogs || getRecentConsoleLogs();
      const networkRequests = params.networkRequests || getRecentNetworkRequests();
      const breadcrumbs = params.breadcrumbs || getBreadcrumbs();
      const sessionDurationMs = params.sessionDurationMs || getSessionDuration();
      const routeHistory = params.routeHistory || getRouteHistory();
      const performanceMetrics = params.performanceMetrics || getPerformanceMetrics();
      
      // Insert error log and check for errors
      const { error: insertError } = await supabase.from('user_error_logs').insert([{
        user_id: user?.id || null,
        organization_id: organizationId,
        error_type: params.errorType,
        severity: params.severity || 'error',
        error_message: params.errorMessage,
        error_stack: params.errorStack || null,
        page_url: pageUrl,
        component_name: params.componentName || null,
        action_attempted: params.actionAttempted || null,
        browser_info: browserInfo,
        device_type: deviceType,
        user_agent: userAgent,
        metadata: (params.metadata || {}) as Json,
        // Enhanced context
        console_logs: consoleLogs as unknown as Json,
        network_requests: networkRequests as unknown as Json,
        breadcrumbs: breadcrumbs as unknown as Json,
        session_duration_ms: sessionDurationMs,
        route_history: routeHistory as unknown as Json,
        performance_metrics: performanceMetrics as unknown as Json,
      }]);
      
      if (insertError) {
        console.error('[ErrorLogger] Failed to insert error log:', insertError.message, insertError);
      }
    } catch (error) {
      // Silent fail - don't cause more errors while logging errors
      console.error('[ErrorLogger] Unexpected error:', error);
    }
  }, []);

  return { logError };
};

/**
 * Standalone function for logging errors outside of React components
 * Useful for AppErrorBoundary and global error handlers
 */
export const logErrorToDatabase = async (params: LogErrorParams): Promise<void> => {
  try {
    // Check for duplicate errors
    const fingerprint = generateErrorFingerprint(
      params.errorType,
      params.errorMessage,
      params.componentName,
      params.actionAttempted
    );
    
    if (isDuplicateError(fingerprint)) {
      console.debug('[ErrorLogger] Skipping duplicate error:', params.errorMessage.substring(0, 50));
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    let organizationId: string | null = null;
    if (user) {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (employeeError) {
        console.warn('[ErrorLogger] Failed to fetch employee org:', employeeError.message);
      }
      organizationId = employee?.organization_id || null;
    }
    
    const pageUrl = window.location.href;
    const userAgent = navigator.userAgent;
    const deviceType = /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 'mobile' : 'desktop';
    const browserInfo = getBrowserInfo(userAgent);
    
    // Get enhanced context
    const consoleLogs = params.consoleLogs || getRecentConsoleLogs();
    const networkRequests = params.networkRequests || getRecentNetworkRequests();
    const breadcrumbs = params.breadcrumbs || getBreadcrumbs();
    const sessionDurationMs = params.sessionDurationMs || getSessionDuration();
    const routeHistory = params.routeHistory || getRouteHistory();
    const performanceMetrics = params.performanceMetrics || getPerformanceMetrics();
    
    const { error: insertError } = await supabase.from('user_error_logs').insert([{
      user_id: user?.id || null,
      organization_id: organizationId,
      error_type: params.errorType,
      severity: params.severity || 'error',
      error_message: params.errorMessage,
      error_stack: params.errorStack || null,
      page_url: pageUrl,
      component_name: params.componentName || null,
      action_attempted: params.actionAttempted || null,
      browser_info: browserInfo,
      device_type: deviceType,
      user_agent: userAgent,
      metadata: (params.metadata || {}) as Json,
      // Enhanced context
      console_logs: consoleLogs as unknown as Json,
      network_requests: networkRequests as unknown as Json,
      breadcrumbs: breadcrumbs as unknown as Json,
      session_duration_ms: sessionDurationMs,
      route_history: routeHistory as unknown as Json,
      performance_metrics: performanceMetrics as unknown as Json,
    }]);
    
    if (insertError) {
      console.error('[ErrorLogger] Failed to insert error log:', insertError.message, insertError);
    }
  } catch (error) {
    console.error('[ErrorLogger] Unexpected error:', error);
  }
};

/**
 * Extract browser name and version from user agent
 */
function getBrowserInfo(userAgent: string): string {
  const browsers = [
    { name: 'Chrome', regex: /Chrome\/(\d+)/ },
    { name: 'Firefox', regex: /Firefox\/(\d+)/ },
    { name: 'Safari', regex: /Version\/(\d+).*Safari/ },
    { name: 'Edge', regex: /Edg\/(\d+)/ },
    { name: 'Opera', regex: /OPR\/(\d+)/ },
  ];
  
  for (const browser of browsers) {
    const match = userAgent.match(browser.regex);
    if (match) {
      return `${browser.name} ${match[1]}`;
    }
  }
  
  return 'Unknown Browser';
}
