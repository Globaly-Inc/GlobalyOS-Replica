import { ChannelBadge } from './ChannelBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Phone, Mail, Tag, Clock, UserCheck, XCircle, Pause, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { InboxConversation, InboxContact, InboxConversationStatus } from '@/types/inbox';

interface InboxContactPanelProps {
  conversation: (InboxConversation & { inbox_contacts?: InboxContact }) | undefined;
  onUpdateStatus: (status: InboxConversationStatus) => void;
  onAssign: (userId: string | null) => void;
}

export const InboxContactPanel = ({ conversation, onUpdateStatus, onAssign }: InboxContactPanelProps) => {
  if (!conversation) return null;

  const contact = conversation.inbox_contacts;
  const displayName = contact?.name || contact?.phone || contact?.email || 'Unknown';

  return (
    <ScrollArea className="h-full border-l border-border bg-card">
      <div className="p-4 space-y-5">
        {/* Contact info */}
        <div className="text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 text-lg font-semibold text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
          <div className="flex items-center justify-center gap-1 mt-1">
            <ChannelBadge channel={conversation.channel_type} size="sm" showLabel />
          </div>
        </div>

        <Separator />

        {/* Contact details */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</h4>
          {contact?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact?.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{contact.email}</span>
            </div>
          )}
          {contact?.crm_contact_id && (
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-primary text-xs">View in CRM</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Status & Assignment */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</h4>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={conversation.status}
              onValueChange={(v) => onUpdateStatus(v as InboxConversationStatus)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="snoozed">Snoozed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onUpdateStatus('closed')}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Resolve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onUpdateStatus('snoozed')}
            >
              <Pause className="h-3.5 w-3.5 mr-1" />
              Snooze
            </Button>
          </div>
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h4>
          <div className="flex flex-wrap gap-1">
            {conversation.tags.length > 0 ? (
              conversation.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No tags</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Created {format(new Date(conversation.created_at), 'MMM d, yyyy HH:mm')}</span>
            </div>
            {conversation.first_response_at && (
              <div className="flex items-center gap-2">
                <UserCheck className="h-3 w-3" />
                <span>First response {format(new Date(conversation.first_response_at), 'MMM d, HH:mm')}</span>
              </div>
            )}
            {conversation.resolved_at && (
              <div className="flex items-center gap-2">
                <XCircle className="h-3 w-3" />
                <span>Resolved {format(new Date(conversation.resolved_at), 'MMM d, HH:mm')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Consent */}
        {contact?.consent && Object.keys(contact.consent).length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consent</h4>
              {Object.entries(contact.consent).map(([channel, info]) => (
                <div key={channel} className="text-xs">
                  <span className="capitalize font-medium">{channel}:</span>{' '}
                  <span className="text-muted-foreground">
                    {(info as { status?: string })?.status || 'unknown'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};
