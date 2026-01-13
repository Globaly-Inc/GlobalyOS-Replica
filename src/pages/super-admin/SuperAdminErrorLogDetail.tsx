import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ArrowLeft,
  AlertCircle, 
  AlertTriangle, 
  Info, 
  User, 
  Building2, 
  Globe, 
  Monitor,
  Clock,
  CheckCircle,
  Terminal,
  Network,
  MousePointer,
  ChevronDown,
  Gauge,
  Route,
  Sparkles,
  Loader2,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useErrorLogById } from '@/services/useErrorLogById';
import { useUpdateErrorLogStatus } from '@/services/useErrorLogs';
import ErrorResolutionAIDialog from '@/components/super-admin/ErrorResolutionAIDialog';
import ErrorLogPDFExport from '@/components/super-admin/ErrorLogPDFExport';
import type { ErrorLogStatus, ErrorSeverity, ConsoleEntry, NetworkRequest, Breadcrumb } from '@/types/errorLogs';

const severityConfig: Record<ErrorSeverity, { label: string; icon: React.ElementType; className: string }> = {
  critical: { label: 'Critical', icon: AlertCircle, className: 'bg-destructive text-destructive-foreground' },
  error: { label: 'Error', icon: AlertTriangle, className: 'bg-orange-500 text-white' },
  warning: { label: 'Warning', icon: Info, className: 'bg-yellow-500 text-black' },
};

const statusConfig: Record<ErrorLogStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  investigating: { label: 'Investigating', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  ignored: { label: 'Ignored', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300' },
};

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatBreadcrumbTime(timestamp: number): string {
  return format(new Date(timestamp), 'HH:mm:ss.SSS');
}

const SuperAdminErrorLogDetail = () => {
  const { errorId } = useParams<{ errorId: string }>();
  const navigate = useNavigate();
  const { data: log, isLoading, error: fetchError } = useErrorLogById(errorId);
  const updateStatus = useUpdateErrorLogStatus();
  
  const [status, setStatus] = useState<ErrorLogStatus>('new');
  const [notes, setNotes] = useState('');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [consoleSectionOpen, setConsoleSectionOpen] = useState(true);
  const [networkSectionOpen, setNetworkSectionOpen] = useState(true);
  const [breadcrumbsSectionOpen, setBreadcrumbsSectionOpen] = useState(true);
  const [stackSectionOpen, setStackSectionOpen] = useState(true);
  const [metadataSectionOpen, setMetadataSectionOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when log loads
  useEffect(() => {
    if (log) {
      setStatus(log.status);
      setNotes(log.resolution_notes || '');
      setHasChanges(false);
    }
  }, [log]);

  // Track changes
  useEffect(() => {
    if (log) {
      const changed = status !== log.status || notes !== (log.resolution_notes || '');
      setHasChanges(changed);
    }
  }, [status, notes, log]);

  const handleSave = async () => {
    if (!log) return;
    
    try {
      await updateStatus.mutateAsync({
        id: log.id,
        status,
        resolutionNotes: notes || undefined,
      });
      toast.success('Error log updated');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to update error log');
    }
  };

  const handleApplyAIToNotes = (text: string) => {
    setNotes(prev => prev ? `${prev}\n\n---\n\nAI Analysis:\n${text}` : `AI Analysis:\n${text}`);
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (fetchError || !log) {
    return (
      <SuperAdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Error Not Found</h2>
          <p className="text-muted-foreground">The error log you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/super-admin/error-logs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Error Logs
          </Button>
        </div>
      </SuperAdminLayout>
    );
  }

  const severity = severityConfig[log.severity];
  const SeverityIcon = severity.icon;

  // Parse JSON fields safely
  const consoleLogs: ConsoleEntry[] = Array.isArray(log.console_logs) ? log.console_logs : [];
  const networkRequests: NetworkRequest[] = Array.isArray(log.network_requests) ? log.network_requests : [];
  const breadcrumbs: Breadcrumb[] = Array.isArray(log.breadcrumbs) ? log.breadcrumbs : [];
  const routeHistory: string[] = Array.isArray(log.route_history) ? log.route_history : [];
  const performanceMetrics = log.performance_metrics || {};

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/super-admin/error-logs')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={severity.className}>
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {severity.label}
                </Badge>
                <Badge className={statusConfig[log.status].className}>
                  {statusConfig[log.status].label}
                </Badge>
                <Badge variant="outline">{log.error_type}</Badge>
              </div>
              <h1 className="text-lg font-medium text-foreground line-clamp-2">
                {log.error_message}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(log.created_at), 'MMMM d, yyyy \'at\' HH:mm:ss')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-12 sm:ml-0">
            <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Analysis
            </Button>
            <ErrorLogPDFExport log={log} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Session</div>
                  <div className="font-semibold">{formatDuration(log.session_duration_ms)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Memory</div>
                  <div className="font-semibold">{performanceMetrics.usedJSHeapSize ? `${performanceMetrics.usedJSHeapSize}MB` : 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Connection</div>
                  <div className="font-semibold">{performanceMetrics.connectionType || 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Pages Visited</div>
                  <div className="font-semibold">{routeHistory.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Error Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive">{log.error_message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">User:</span>
                    <span className="font-medium">{log.profiles?.full_name || 'Anonymous'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Organization:</span>
                    <span className="font-medium">{log.organizations?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Device:</span>
                    <span className="font-medium">{log.device_type || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Browser:</span>
                    <span className="font-medium">{log.browser_info || 'Unknown'}</span>
                  </div>
                </div>

                {log.component_name && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Component:</span>{' '}
                    <code className="bg-muted px-2 py-0.5 rounded text-xs">{log.component_name}</code>
                  </div>
                )}
                {log.action_attempted && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Action:</span>{' '}
                    <span className="font-medium">{log.action_attempted}</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Page URL:</span>{' '}
                  <a href={log.page_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {log.page_url}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Console Logs */}
            {consoleLogs.length > 0 && (
              <Card>
                <Collapsible open={consoleSectionOpen} onOpenChange={setConsoleSectionOpen}>
                  <CardHeader className="cursor-pointer" onClick={() => setConsoleSectionOpen(!consoleSectionOpen)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          Console Logs ({consoleLogs.length})
                        </CardTitle>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", consoleSectionOpen && "rotate-180")} />
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ScrollArea className="h-[250px]">
                        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs space-y-1">
                          {consoleLogs.map((entry, i) => (
                            <div key={i} className={cn(
                              "py-0.5",
                              entry.level === 'error' && 'text-red-400',
                              entry.level === 'warn' && 'text-yellow-400',
                              entry.level === 'log' && 'text-slate-300'
                            )}>
                              <span className="text-slate-500">[{format(new Date(entry.timestamp), 'HH:mm:ss.SSS')}]</span>
                              <span className={cn(
                                "mx-2 uppercase text-[10px] px-1 rounded",
                                entry.level === 'error' && 'bg-red-500/20',
                                entry.level === 'warn' && 'bg-yellow-500/20',
                                entry.level === 'log' && 'bg-slate-500/20'
                              )}>{entry.level}</span>
                              <span className="break-all">{entry.message}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Network Requests */}
            {networkRequests.length > 0 && (
              <Card>
                <Collapsible open={networkSectionOpen} onOpenChange={setNetworkSectionOpen}>
                  <CardHeader className="cursor-pointer" onClick={() => setNetworkSectionOpen(!networkSectionOpen)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Network className="h-4 w-4" />
                          Network Requests ({networkRequests.length})
                        </CardTitle>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", networkSectionOpen && "rotate-180")} />
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-2">
                          {networkRequests.map((req, i) => (
                            <div key={i} className="text-xs flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                              <Badge variant={req.success ? 'outline' : 'destructive'} className="w-14 justify-center text-[10px]">
                                {req.status || 'ERR'}
                              </Badge>
                              <span className="font-mono text-muted-foreground w-12">{req.method}</span>
                              <span className="truncate flex-1 font-mono">{req.url}</span>
                              <span className="text-muted-foreground w-16 text-right">{req.duration}ms</span>
                              {req.error && <span className="text-destructive truncate max-w-[150px]">{req.error}</span>}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <Card>
                <Collapsible open={breadcrumbsSectionOpen} onOpenChange={setBreadcrumbsSectionOpen}>
                  <CardHeader className="cursor-pointer" onClick={() => setBreadcrumbsSectionOpen(!breadcrumbsSectionOpen)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MousePointer className="h-4 w-4" />
                          User Actions ({breadcrumbs.length})
                        </CardTitle>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", breadcrumbsSectionOpen && "rotate-180")} />
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-1">
                          {breadcrumbs.map((crumb, i) => (
                            <div key={i} className="text-xs flex items-center gap-2 p-2 rounded bg-muted/50">
                              <span className="text-muted-foreground w-20 font-mono">{formatBreadcrumbTime(crumb.timestamp)}</span>
                              <Badge variant="outline" className={cn(
                                "w-20 justify-center text-[10px]",
                                crumb.type === 'click' && 'border-blue-500/50 text-blue-500',
                                crumb.type === 'navigation' && 'border-green-500/50 text-green-500',
                                crumb.type === 'input' && 'border-purple-500/50 text-purple-500',
                                crumb.type === 'api_error' && 'border-red-500/50 text-red-500',
                                crumb.type === 'error' && 'border-red-500/50 text-red-500'
                              )}>
                                {crumb.type}
                              </Badge>
                              <span className="truncate flex-1">{crumb.message || crumb.path}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Stack Trace */}
            {log.error_stack && (
              <Card>
                <Collapsible open={stackSectionOpen} onOpenChange={setStackSectionOpen}>
                  <CardHeader className="cursor-pointer" onClick={() => setStackSectionOpen(!stackSectionOpen)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Stack Trace</CardTitle>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", stackSectionOpen && "rotate-180")} />
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ScrollArea className="h-[200px]">
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                          {log.error_stack}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Metadata */}
            {Object.keys(log.metadata || {}).length > 0 && (
              <Card>
                <Collapsible open={metadataSectionOpen} onOpenChange={setMetadataSectionOpen}>
                  <CardHeader className="cursor-pointer" onClick={() => setMetadataSectionOpen(!metadataSectionOpen)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Metadata</CardTitle>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", metadataSectionOpen && "rotate-180")} />
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Status & Resolution */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">Status & Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ErrorLogStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="ignored">Ignored</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Resolution Notes</Label>
                  <Textarea
                    placeholder="Add notes about the resolution or investigation..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                {log.resolved_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Resolved on {format(new Date(log.resolved_at), 'MMM d, yyyy HH:mm')}
                  </div>
                )}

                <Button 
                  onClick={handleSave} 
                  disabled={updateStatus.isPending || !hasChanges}
                  className="w-full"
                >
                  {updateStatus.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Route History */}
            {routeHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    Route History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {routeHistory.map((route, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-mono">
                        {route}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* AI Dialog */}
      <ErrorResolutionAIDialog
        log={log}
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onApplyToNotes={handleApplyAIToNotes}
      />
    </SuperAdminLayout>
  );
};

export default SuperAdminErrorLogDetail;
