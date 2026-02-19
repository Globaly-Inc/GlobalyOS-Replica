/**
 * Unified Activity Timeline
 * Chronological timeline showing all interaction types with visual treatments.
 */
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Phone, Mail, Users, CheckSquare, Plus, Send, MailOpen, MousePointer, AlertCircle, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { LogActivityDialog } from './LogActivityDialog';
import type { CRMActivity } from '@/types/crm';

const typeConfig: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  note: { icon: FileText, color: 'bg-muted text-muted-foreground', label: 'Note' },
  call: { icon: Phone, color: 'bg-green-100 text-green-700', label: 'Call' },
  email: { icon: Mail, color: 'bg-blue-100 text-blue-700', label: 'Email' },
  meeting: { icon: Users, color: 'bg-purple-100 text-purple-700', label: 'Meeting' },
  task: { icon: CheckSquare, color: 'bg-orange-100 text-orange-700', label: 'Task' },
  // Campaign events
  campaign_sent: { icon: Send, color: 'bg-indigo-100 text-indigo-700', label: 'Campaign Sent' },
  campaign_opened: { icon: MailOpen, color: 'bg-blue-100 text-blue-700', label: 'Email Opened' },
  campaign_clicked: { icon: MousePointer, color: 'bg-green-100 text-green-700', label: 'Link Clicked' },
  campaign_bounced: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Bounced' },
  campaign_unsubscribed: { icon: UserMinus, color: 'bg-orange-100 text-orange-700', label: 'Unsubscribed' },
};

const filterOptions = ['all', 'note', 'call', 'email', 'meeting', 'task', 'campaign_sent', 'campaign_opened', 'campaign_clicked', 'campaign_bounced', 'campaign_unsubscribed'] as const;

interface Props {
  activities: CRMActivity[];
  contactId?: string | null;
  companyId?: string | null;
}

export const ActivityTimeline = ({ activities, contactId, companyId }: Props) => {
  const [filter, setFilter] = useState<string>('all');
  const [logOpen, setLogOpen] = useState(false);

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);

  return (
    <div className="space-y-4">
      {/* Filter pills + Log button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {filterOptions.map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : typeConfig[f]?.label || f}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setLogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Log Activity
        </Button>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
      ) : (
        <div className="relative pl-6 space-y-4">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

          {filtered.map((a) => {
            const config = typeConfig[a.type] || typeConfig.note;
            const Icon = config.icon;
            return (
              <div key={a.id} className="relative flex gap-3">
                {/* Dot */}
                <div className={`absolute -left-6 top-1 h-5 w-5 rounded-full flex items-center justify-center ${config.color} ring-2 ring-background`}>
                  <Icon className="h-3 w-3" />
                </div>
                {/* Content */}
                <div className="flex-1 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={a.employee?.avatar_url || ''} />
                      <AvatarFallback className="text-[9px]">{a.employee?.first_name?.[0]}{a.employee?.last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{a.employee?.first_name} {a.employee?.last_name}</span>
                    <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}</span>
                  </div>
                  {a.subject && <p className="text-sm font-medium mt-1">{a.subject}</p>}
                  {a.content && <p className="text-sm text-muted-foreground mt-1">{a.content}</p>}
                  {a.duration_minutes && (
                    <span className="text-xs text-muted-foreground mt-1 inline-block">Duration: {a.duration_minutes} min</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LogActivityDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        contactId={contactId}
        companyId={companyId}
      />
    </div>
  );
};
