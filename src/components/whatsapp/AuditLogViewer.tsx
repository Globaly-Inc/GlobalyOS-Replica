import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Send, UserPlus, Shield, Megaphone, Settings, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const actionIcons: Record<string, React.ReactNode> = {
  message_sent: <Send className="h-3.5 w-3.5" />,
  broadcast_sent: <Megaphone className="h-3.5 w-3.5" />,
  contact_created: <UserPlus className="h-3.5 w-3.5" />,
  opt_out: <Shield className="h-3.5 w-3.5" />,
  opt_in: <Shield className="h-3.5 w-3.5" />,
  template_created: <FileText className="h-3.5 w-3.5" />,
  account_connected: <Settings className="h-3.5 w-3.5" />,
  account_disconnected: <Trash2 className="h-3.5 w-3.5" />,
  send_blocked: <Shield className="h-3.5 w-3.5" />,
};

const actionColors: Record<string, string> = {
  send_blocked: 'text-destructive',
  opt_out: 'text-amber-600 dark:text-amber-400',
};

interface Props {
  orgId: string | undefined;
}

export default function AuditLogViewer({ orgId }: Props) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['wa-audit-log', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_audit_log')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No audit events yet.</p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {logs.map((log) => {
                const details = log.details as Record<string, unknown> | null;
                const color = actionColors[log.action] || 'text-muted-foreground';
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                    <div className={`mt-0.5 ${color}`}>
                      {actionIcons[log.action] || <FileText className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        {log.entity_type && (
                          <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                        )}
                      </div>
                      {details?.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Reason: {String(details.reason)}
                        </p>
                      )}
                      {details?.recipients_count !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {String(details.recipients_count)} recipients
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(log.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
