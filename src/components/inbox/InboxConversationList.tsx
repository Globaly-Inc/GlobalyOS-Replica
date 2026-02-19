import { Search, Filter, ChevronDown, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationCard } from './ConversationCard';
import { ChannelBadge } from './ChannelBadge';
import { cn } from '@/lib/utils';
import type { InboxConversation, InboxContact, InboxConversationStatus, InboxChannelType } from '@/types/inbox';
import { CHANNEL_META } from '@/types/inbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InboxConversationListProps {
  conversations: (InboxConversation & { inbox_contacts?: InboxContact })[];
  activeConversationId: string | undefined;
  onSelect: (id: string) => void;
  isLoading: boolean;
  statusFilter: InboxConversationStatus | undefined;
  onStatusFilterChange: (s: InboxConversationStatus | undefined) => void;
  channelFilter: InboxChannelType | undefined;
  onChannelFilterChange: (c: InboxChannelType | undefined) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  assigneeFilter?: string | undefined;
  onAssigneeFilterChange?: (a: string | undefined) => void;
  unreadOnly?: boolean;
  onUnreadOnlyChange?: (v: boolean) => void;
}

const statusTabs: { label: string; value: InboxConversationStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'open' },
  { label: 'Pending', value: 'pending' },
  { label: 'Snoozed', value: 'snoozed' },
  { label: 'Closed', value: 'closed' },
];

const channelOptions = Object.entries(CHANNEL_META).map(([key, meta]) => ({
  value: key as InboxChannelType,
  label: meta.label,
}));

export const InboxConversationList = ({
  conversations,
  activeConversationId,
  onSelect,
  isLoading,
  statusFilter,
  onStatusFilterChange,
  channelFilter,
  onChannelFilterChange,
  searchQuery,
  onSearchChange,
  assigneeFilter,
  onAssigneeFilterChange,
  unreadOnly,
  onUnreadOnlyChange,
}: InboxConversationListProps) => {
  // Client-side filters
  const filtered = conversations.filter((c) => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = c.inbox_contacts?.name?.toLowerCase() || '';
      const phone = c.inbox_contacts?.phone?.toLowerCase() || '';
      const email = c.inbox_contacts?.email?.toLowerCase() || '';
      if (!name.includes(q) && !phone.includes(q) && !email.includes(q)) return false;
    }
    // Unread
    if (unreadOnly && (c.unread_count || 0) === 0) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-9 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => onStatusFilterChange(tab.value)}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}

        {/* Filters dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 text-xs">
              {channelFilter ? (
                <ChannelBadge channel={channelFilter} size="sm" />
              ) : (
                <Filter className="h-3.5 w-3.5" />
              )}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Channel filter */}
            <DropdownMenuItem onClick={() => onChannelFilterChange(undefined)}>
              All channels
            </DropdownMenuItem>
            {channelOptions.map((ch) => (
              <DropdownMenuItem key={ch.value} onClick={() => onChannelFilterChange(ch.value)}>
                <ChannelBadge channel={ch.value} size="sm" showLabel />
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            {/* Assignee filter */}
            <DropdownMenuItem onClick={() => onAssigneeFilterChange?.(undefined)}>
              All assignees
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAssigneeFilterChange?.('me')}>
              Assigned to me
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAssigneeFilterChange?.('unassigned')}>
              Unassigned
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Unread toggle */}
            <DropdownMenuItem onClick={() => onUnreadOnlyChange?.(!unreadOnly)}>
              <Eye className="h-3.5 w-3.5 mr-2" />
              {unreadOnly ? 'Show all' : 'Unread only'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active filters badge */}
      {(assigneeFilter || unreadOnly) && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border">
          {assigneeFilter && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {assigneeFilter === 'me' ? 'Assigned to me' : 'Unassigned'}
            </span>
          )}
          {unreadOnly && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Unread only
            </span>
          )}
          <button
            onClick={() => { onAssigneeFilterChange?.(undefined); onUnreadOnlyChange?.(false); }}
            className="text-[10px] text-muted-foreground hover:text-foreground ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No conversations</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? 'Try a different search term' : 'Conversations will appear here when messages arrive'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onClick={() => onSelect(conv.id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
};
