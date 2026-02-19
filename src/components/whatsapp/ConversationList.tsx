import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Search, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { WaConversation, WaContact } from '@/types/whatsapp';

type ConvWithContact = WaConversation & { wa_contacts: WaContact };

interface Props {
  conversations: ConvWithContact[];
  selectedId: string | undefined;
  onSelect: (conv: ConvWithContact) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
}

const statusFilters = ['all', 'open', 'assigned', 'resolved'];

export default function ConversationList({ conversations, selectedId, onSelect, statusFilter, onStatusFilterChange }: Props) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const name = c.wa_contacts?.name || c.wa_contacts?.phone || '';
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {/* Status pills */}
        <div className="flex gap-1.5 mt-2">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => onStatusFilterChange(s)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-full capitalize transition-colors',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const contact = conv.wa_contacts;
            const name = contact?.name || contact?.phone || 'Unknown';
            const initials = name.slice(0, 2).toUpperCase();

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50',
                  selectedId === conv.id && 'bg-muted'
                )}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{name}</span>
                    {conv.last_message_at && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {contact?.phone}
                    </span>
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="h-5 min-w-[20px] text-xs px-1.5">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}
