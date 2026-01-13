import { format } from 'date-fns';
import type { ErrorLog, ConsoleEntry, NetworkRequest, Breadcrumb, PerformanceMetrics } from '@/types/errorLogs';

function formatConsoleLogs(logs: ConsoleEntry[] | null): string {
  if (!logs || logs.length === 0) return 'No console logs captured.';
  
  return logs.map(entry => 
    `[${format(new Date(entry.timestamp), 'HH:mm:ss.SSS')}] [${entry.level.toUpperCase()}] ${entry.message}${entry.stack ? `\n  Stack: ${entry.stack}` : ''}`
  ).join('\n');
}

function formatNetworkRequests(requests: NetworkRequest[] | null): string {
  if (!requests || requests.length === 0) return 'No network requests captured.';
  
  return requests.map(req => 
    `[${format(new Date(req.timestamp), 'HH:mm:ss.SSS')}] ${req.method} ${req.url}\n  Status: ${req.status || 'Failed'} | Duration: ${req.duration}ms | Success: ${req.success}${req.error ? `\n  Error: ${req.error}` : ''}`
  ).join('\n\n');
}

function formatBreadcrumbs(crumbs: Breadcrumb[] | null): string {
  if (!crumbs || crumbs.length === 0) return 'No user actions captured.';
  
  return crumbs.map(crumb => 
    `[${format(new Date(crumb.timestamp), 'HH:mm:ss.SSS')}] [${crumb.type.toUpperCase()}] ${crumb.message || crumb.path || crumb.target || 'Action'}`
  ).join('\n');
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatPerformanceMetrics(metrics: PerformanceMetrics | null): string {
  if (!metrics) return 'No performance metrics available.';
  
  const parts: string[] = [];
  if (metrics.usedJSHeapSize) parts.push(`Memory Used: ${metrics.usedJSHeapSize}MB`);
  if (metrics.totalJSHeapSize) parts.push(`Total Heap: ${metrics.totalJSHeapSize}MB`);
  if (metrics.connectionType) parts.push(`Connection: ${metrics.connectionType}`);
  if (metrics.downlink) parts.push(`Downlink: ${metrics.downlink}Mbps`);
  if (metrics.rtt) parts.push(`RTT: ${metrics.rtt}ms`);
  
  return parts.length > 0 ? parts.join(' | ') : 'No metrics available.';
}

export function generateErrorResolutionPrompt(log: ErrorLog): string {
  const consoleLogs = Array.isArray(log.console_logs) ? log.console_logs : [];
  const networkRequests = Array.isArray(log.network_requests) ? log.network_requests : [];
  const breadcrumbs = Array.isArray(log.breadcrumbs) ? log.breadcrumbs : [];
  const routeHistory = Array.isArray(log.route_history) ? log.route_history : [];
  const performanceMetrics = log.performance_metrics || null;

  // Filter for failed network requests
  const failedRequests = networkRequests.filter(r => !r.success);

  return `## Error Analysis Request

You are an expert software engineer debugging a production error in a React/TypeScript SaaS application (GlobalyOS - a business operating system with HRMS, CRM, Wiki, and Team features).

### Error Details
- **Error Type:** ${log.error_type}
- **Severity:** ${log.severity.toUpperCase()}
- **Error Message:** ${log.error_message}
- **Component:** ${log.component_name || 'Unknown'}
- **User Action:** ${log.action_attempted || 'Unknown'}
- **Page URL:** ${log.page_url}
- **Occurred At:** ${format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}

### Stack Trace
\`\`\`
${log.error_stack || 'No stack trace available.'}
\`\`\`

### Console Logs (last entries before error)
\`\`\`
${formatConsoleLogs(consoleLogs)}
\`\`\`

### Failed Network Requests
\`\`\`
${failedRequests.length > 0 ? formatNetworkRequests(failedRequests) : 'No failed requests.'}
\`\`\`

### All Recent Network Requests
\`\`\`
${formatNetworkRequests(networkRequests)}
\`\`\`

### User Action Trail (Breadcrumbs)
The following actions led to this error:
\`\`\`
${formatBreadcrumbs(breadcrumbs)}
\`\`\`

### Environment Context
- **Session Duration:** ${formatDuration(log.session_duration_ms)}
- **Performance:** ${formatPerformanceMetrics(performanceMetrics)}
- **Browser:** ${log.browser_info || 'Unknown'}
- **Device:** ${log.device_type || 'Unknown'}
- **User Agent:** ${log.user_agent || 'Unknown'}
- **Route History:** ${routeHistory.length > 0 ? routeHistory.join(' → ') : 'Not available'}

### User Context
- **User:** ${log.profiles?.full_name || 'Anonymous'} (${log.profiles?.email || 'No email'})
- **Organization:** ${log.organizations?.name || 'N/A'}

### Additional Metadata
\`\`\`json
${JSON.stringify(log.metadata || {}, null, 2)}
\`\`\`

---

Please provide:

1. **Root Cause Analysis**
   - What is the most likely cause of this error?
   - What evidence supports this conclusion?

2. **Debugging Steps**
   - Step-by-step approach to verify the root cause
   - Key areas to investigate in the codebase

3. **Recommended Fix**
   - Specific code changes with examples
   - Any database or configuration changes needed

4. **Prevention Strategies**
   - How to prevent this error in the future
   - Recommended tests to add
   - Any monitoring/alerting improvements

5. **Impact Assessment**
   - How widespread is this likely affecting users?
   - Priority level for fixing (P0-P3)`;
}

export function generatePromptSummary(log: ErrorLog): string {
  const consoleLogs = Array.isArray(log.console_logs) ? log.console_logs : [];
  const networkRequests = Array.isArray(log.network_requests) ? log.network_requests : [];
  const breadcrumbs = Array.isArray(log.breadcrumbs) ? log.breadcrumbs : [];

  return `Error: ${log.error_message}
Type: ${log.error_type} | Severity: ${log.severity}
Component: ${log.component_name || 'Unknown'}
Action: ${log.action_attempted || 'Unknown'}
Console Logs: ${consoleLogs.length} | Network Requests: ${networkRequests.length} | Breadcrumbs: ${breadcrumbs.length}`;
}
