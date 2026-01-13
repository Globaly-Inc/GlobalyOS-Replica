import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
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
  Route
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ErrorLog, ErrorLogStatus, ErrorSeverity, ConsoleEntry, NetworkRequest, Breadcrumb } from '@/types/errorLogs';
import { useUpdateErrorLogStatus } from '@/services/useErrorLogs';
import { toast } from 'sonner';

interface ErrorLogDetailDialogProps {
  log: ErrorLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const severityConfig: Record<ErrorSeverity, { label: string; icon: React.ElementType; className: string }> = {
  critical: { label: 'Critical', icon: AlertCircle, className: 'bg-destructive text-destructive-foreground' },
  error: { label: 'Error', icon: AlertTriangle, className: 'bg-orange-500 text-white' },
  warning: { label: 'Warning', icon: Info, className: 'bg-yellow-500 text-black' },
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

const ErrorLogDetailDialog = ({ log, open, onOpenChange }: ErrorLogDetailDialogProps) => {
  const [status, setStatus] = useState<ErrorLogStatus>(log.status);
  const [notes, setNotes] = useState(log.resolution_notes || '');
  const [consoleSectionOpen, setConsoleSectionOpen] = useState(true);
  const [networkSectionOpen, setNetworkSectionOpen] = useState(true);
  const [breadcrumbsSectionOpen, setBreadcrumbsSectionOpen] = useState(true);
  const updateStatus = useUpdateErrorLogStatus();

  const severity = severityConfig[log.severity];
  const SeverityIcon = severity.icon;

  // Parse JSON fields safely
  const consoleLogs: ConsoleEntry[] = Array.isArray(log.console_logs) ? log.console_logs : [];
  const networkRequests: NetworkRequest[] = Array.isArray(log.network_requests) ? log.network_requests : [];
  const breadcrumbs: Breadcrumb[] = Array.isArray(log.breadcrumbs) ? log.breadcrumbs : [];
  const routeHistory: string[] = Array.isArray(log.route_history) ? log.route_history : [];
  const performanceMetrics = log.performance_metrics || {};

  const handleSave = async () => {
    try {
      await updateStatus.mutateAsync({
        id: log.id,
        status,
        resolutionNotes: notes || undefined,
      });
      toast.success('Error log updated');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update error log');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={severity.className}>
              <SeverityIcon className="h-3 w-3 mr-1" />
              {severity.label}
            </Badge>
            <span className="text-base font-normal text-muted-foreground">
              {log.error_type} error
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Error Message */}
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium text-foreground">{log.error_message}</p>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Session</div>
                  <div className="font-medium">{formatDuration(log.session_duration_ms)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Memory</div>
                  <div className="font-medium">{performanceMetrics.usedJSHeapSize ? `${performanceMetrics.usedJSHeapSize}MB` : 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Network className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Connection</div>
                  <div className="font-medium">{performanceMetrics.connectionType || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Route className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Pages Visited</div>
                  <div className="font-medium">{routeHistory.length}</div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Time:</span>
                <span>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">User:</span>
                <span>{log.profiles?.full_name || 'Anonymous'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Organization:</span>
                <span>{log.organizations?.name || 'N/A'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Device:</span>
                <span>{log.device_type || 'Unknown'} • {log.browser_info || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center gap-2 col-span-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Page:</span>
                <a 
                  href={log.page_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {log.page_url}
                </a>
              </div>
            </div>

            {log.component_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Component:</span>{' '}
                <code className="bg-muted px-1 rounded">{log.component_name}</code>
              </div>
            )}

            {log.action_attempted && (
              <div className="text-sm">
                <span className="text-muted-foreground">Action:</span>{' '}
                <span>{log.action_attempted}</span>
              </div>
            )}

            <Separator />

            {/* Console Logs Section */}
            {consoleLogs.length > 0 && (
              <Collapsible open={consoleSectionOpen} onOpenChange={setConsoleSectionOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium cursor-pointer">Console Logs ({consoleLogs.length})</Label>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", consoleSectionOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 bg-slate-900 rounded-lg p-3 max-h-[200px] overflow-y-auto font-mono text-xs">
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
                        <span>{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Network Requests Section */}
            {networkRequests.length > 0 && (
              <Collapsible open={networkSectionOpen} onOpenChange={setNetworkSectionOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium cursor-pointer">Network Requests ({networkRequests.length})</Label>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", networkSectionOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                    {networkRequests.map((req, i) => (
                      <div key={i} className="text-xs flex items-center gap-2 p-2 rounded bg-muted/50">
                        <Badge variant={req.success ? 'outline' : 'destructive'} className="w-12 justify-center text-[10px]">
                          {req.status || 'ERR'}
                        </Badge>
                        <span className="font-mono text-muted-foreground w-12">{req.method}</span>
                        <span className="truncate flex-1 font-mono">{req.url}</span>
                        <span className="text-muted-foreground w-16 text-right">{req.duration}ms</span>
                        {req.error && <span className="text-destructive truncate max-w-[150px]">{req.error}</span>}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Breadcrumbs Section */}
            {breadcrumbs.length > 0 && (
              <Collapsible open={breadcrumbsSectionOpen} onOpenChange={setBreadcrumbsSectionOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium cursor-pointer">User Actions ({breadcrumbs.length})</Label>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", breadcrumbsSectionOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                    {breadcrumbs.map((crumb, i) => (
                      <div key={i} className="text-xs flex items-center gap-2 p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground w-20 font-mono">{formatBreadcrumbTime(crumb.timestamp)}</span>
                        <Badge variant="outline" className={cn(
                          "w-20 justify-center text-[10px]",
                          crumb.type === 'click' && 'border-blue-500/50 text-blue-400',
                          crumb.type === 'navigation' && 'border-green-500/50 text-green-400',
                          crumb.type === 'input' && 'border-purple-500/50 text-purple-400',
                          crumb.type === 'api_error' && 'border-red-500/50 text-red-400',
                          crumb.type === 'error' && 'border-red-500/50 text-red-400'
                        )}>
                          {crumb.type}
                        </Badge>
                        <span className="truncate flex-1">{crumb.message || crumb.path}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Route History */}
            {routeHistory.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Route History</Label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {routeHistory.map((route, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-mono">
                      {route}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Stack Trace */}
            {log.error_stack && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Stack Trace</Label>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                  {log.error_stack}
                </pre>
              </div>
            )}

            {/* Metadata */}
            {Object.keys(log.metadata).length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Metadata</Label>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}

            <Separator />

            {/* Status Update */}
            <div className="space-y-4">
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
                  rows={3}
                />
              </div>

              {log.resolved_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Resolved on {format(new Date(log.resolved_at), 'MMM d, yyyy HH:mm')}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateStatus.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorLogDetailDialog;
