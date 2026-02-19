import { cn } from '@/lib/utils';
import { ChannelBadge } from './ChannelBadge';
import { formatDistanceToNow } from 'date-fns';
import type { InboxConversation, InboxContact } from '@/types/inbox';

interface ConversationCardProps {
  conversation: InboxConversation & { inbox_contacts?: InboxContact };
  isActive: boolean;
  onClick: () => void;
}

export const ConversationCard = ({ conversation, isActive, onClick }: ConversationCardProps) => {
  const contact = conversation.inbox_contacts;
  const displayName = contact?.name || contact?.phone || contact?.email || 'Unknown';
  const lastMsg = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
    : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-muted/50',
        isActive && 'bg-primary/5 border-l-2 border-l-primary',
        conversation.unread_count > 0 && !isActive && 'bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('text-sm truncate', conversation.unread_count > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
              {displayName}
            </span>
            <span className="text-[11px] text-muted-foreground flex-shrink-0">{lastMsg}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <ChannelBadge channel={conversation.channel_type} size="sm" />
            <span className={cn(
              'text-xs truncate',
              conversation.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {conversation.subject || 'No subject'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {conversation.status !== 'open' && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize',
                conversation.status === 'pending' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                conversation.status === 'snoozed' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                conversation.status === 'closed' && 'bg-muted text-muted-foreground',
              )}>
                {conversation.status}
              </span>
            )}
            {conversation.unread_count > 0 && (
              <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
