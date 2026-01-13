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
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  User, 
  Building2, 
  Globe, 
  Monitor,
  Clock,
  CheckCircle
} from 'lucide-react';
import type { ErrorLog, ErrorLogStatus, ErrorSeverity } from '@/types/errorLogs';
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

const ErrorLogDetailDialog = ({ log, open, onOpenChange }: ErrorLogDetailDialogProps) => {
  const [status, setStatus] = useState<ErrorLogStatus>(log.status);
  const [notes, setNotes] = useState(log.resolution_notes || '');
  const updateStatus = useUpdateErrorLogStatus();

  const severity = severityConfig[log.severity];
  const SeverityIcon = severity.icon;

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <div className="space-y-6">
          {/* Error Message */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium text-foreground">{log.error_message}</p>
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
              <span>{log.device_type || 'Unknown'}</span>
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

          {log.browser_info && (
            <div className="text-sm">
              <span className="text-muted-foreground">Browser:</span>{' '}
              <span>{log.browser_info}</span>
            </div>
          )}

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
      </DialogContent>
    </Dialog>
  );
};

export default ErrorLogDetailDialog;
