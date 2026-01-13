import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LogErrorParams } from '@/types/errorLogs';

/**
 * Hook for logging errors to the database
 * Captures browser info, page URL, and associates with current user/org
 */
export const useErrorLogger = () => {
  const logError = useCallback(async (params: LogErrorParams) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get organization ID from employee record if user exists
      let organizationId: string | null = null;
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle();
        organizationId = employee?.organization_id || null;
      }
      
      // Capture context
      const pageUrl = window.location.href;
      const userAgent = navigator.userAgent;
      const deviceType = /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 'mobile' : 'desktop';
      
      // Get browser info
      const browserInfo = getBrowserInfo(userAgent);
      
      // Insert error log (fire and forget - don't block UI)
      await supabase.from('user_error_logs').insert([{
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
        metadata: params.metadata || {},
      }]);
    } catch (error) {
      // Silent fail - don't cause more errors while logging errors
      console.error('Failed to log error to database:', error);
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
    const { data: { user } } = await supabase.auth.getUser();
    
    let organizationId: string | null = null;
    if (user) {
      const { data: employee } = await supabase
        .from('employees')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      organizationId = employee?.organization_id || null;
    }
    
    const pageUrl = window.location.href;
    const userAgent = navigator.userAgent;
    const deviceType = /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 'mobile' : 'desktop';
    const browserInfo = getBrowserInfo(userAgent);
    
    await supabase.from('user_error_logs').insert([{
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
      metadata: params.metadata || {},
    }]);
  } catch (error) {
    console.error('Failed to log error to database:', error);
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
