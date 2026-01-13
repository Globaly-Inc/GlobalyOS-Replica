export type ErrorType = 'runtime' | 'network' | 'edge_function' | 'database' | 'auth' | 'validation';
export type ErrorSeverity = 'warning' | 'error' | 'critical';
export type ErrorLogStatus = 'new' | 'investigating' | 'resolved' | 'ignored';

export interface ErrorLog {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  error_type: ErrorType;
  severity: ErrorSeverity;
  error_message: string;
  error_stack: string | null;
  page_url: string;
  component_name: string | null;
  action_attempted: string | null;
  browser_info: string | null;
  device_type: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  status: ErrorLogStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  // Joined fields
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null };
  organizations?: { name: string | null };
}

export interface LogErrorParams {
  errorType: ErrorType;
  severity?: ErrorSeverity;
  errorMessage: string;
  errorStack?: string;
  componentName?: string;
  actionAttempted?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorLogFilters {
  dateFrom?: string;
  dateTo?: string;
  errorType?: ErrorType;
  severity?: ErrorSeverity;
  status?: ErrorLogStatus;
  organizationId?: string;
  search?: string;
}

export interface ErrorAnalyticsSummary {
  total24h: number;
  totalChange: number;
  critical: number;
  affectedUsers: number;
  affectedOrgs: number;
}

export interface ErrorTrendDataPoint {
  date: string;
  critical: number;
  error: number;
  warning: number;
}

export interface ErrorsByType {
  type: string;
  count: number;
  percentage: number;
}

export interface TopErrorMessage {
  message: string;
  count: number;
  lastOccurred: string;
}

export interface ErrorsByOrg {
  orgId: string;
  orgName: string;
  count: number;
  criticalCount: number;
}
