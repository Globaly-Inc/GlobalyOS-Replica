import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Tag, CheckCircle, XCircle, Clock, UserPlus, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { WaContact, WaConversation } from '@/types/whatsapp';

interface Props {
  contact: WaContact | undefined;
  conversation: WaConversation | undefined;
  onResolve?: () => void;
}

export default function ContactProfilePanel({ contact, conversation, onResolve }: Props) {
  if (!contact) return null;

  const name = contact.name || contact.phone;
  const initials = name.slice(0, 2).toUpperCase();

  const optInIcon = {
    opted_in: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
    opted_out: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    pending: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  }[contact.opt_in_status];

  return (
    <ScrollArea className="h-full border-l border-border w-72">
      <div className="p-4 space-y-4">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-16 w-16 mb-2">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-foreground">{name}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <Phone className="h-3.5 w-3.5" />
            {contact.phone}
          </div>
        </div>

        <Separator />

        {/* Opt-in */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Consent</p>
          <div className="flex items-center gap-2">
            {optInIcon}
            <span className="text-sm capitalize">{contact.opt_in_status.replace('_', ' ')}</span>
          </div>
          {contact.opt_in_source && (
            <p className="text-xs text-muted-foreground mt-1">Source: {contact.opt_in_source}</p>
          )}
          {contact.opt_in_at && (
            <p className="text-xs text-muted-foreground">Since {format(new Date(contact.opt_in_at), 'MMM d, yyyy')}</p>
          )}
        </div>

        <Separator />

        {/* Tags */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
          {contact.tags && contact.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No tags</p>
          )}
        </div>

        <Separator />

        {/* Activity */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Activity</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            {contact.last_inbound_at && (
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-3 w-3" />
                Last inbound: {format(new Date(contact.last_inbound_at), 'MMM d, h:mm a')}
              </div>
            )}
            {contact.last_outbound_at && (
              <div className="flex items-center gap-1.5">
                <UserPlus className="h-3 w-3" />
                Last outbound: {format(new Date(contact.last_outbound_at), 'MMM d, h:mm a')}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {conversation && conversation.status !== 'resolved' && (
          <>
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onResolve}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve Conversation
            </Button>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
