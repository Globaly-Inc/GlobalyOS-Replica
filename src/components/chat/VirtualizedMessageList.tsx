/**
 * VirtualizedMessageList - Performance-optimized message rendering
 * Only renders visible messages (~15 nodes) instead of entire history (500+)
 * Uses react-window v2 for virtualization with dynamic row heights
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { List, useDynamicRowHeight, type ListImperativeAPI } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import SystemEventMessage from './SystemEventMessage';
import type { ChatMessage } from '@/types/chat';

interface MessageCallbacks {
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onStar: (id: string) => void;
  onPin: (id: string, isPinned: boolean) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
}

interface VirtualizedMessageListProps {
  groupedMessages: Record<string, ChatMessage[]>;
  reactions: Record<string, Record<string, { emoji: string; users: { id: string; name: string; avatar?: string }[] }>>;
  messageStars: { message_id: string }[];
  currentEmployeeId: string | undefined;
  onlineStatuses: Record<string, boolean>;
  replyCounts: Record<string, number>;
  editingMessageId: string | null;
  highlightMessageId?: string;
  callbacks: MessageCallbacks;
  isEditPending: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
}

interface FlatItem {
  type: 'separator' | 'message' | 'loading' | 'beginning';
  date?: string;
  message?: ChatMessage;
  prevMessage?: ChatMessage | null;
  nextMessage?: ChatMessage | null;
}

// Check if two messages should be grouped (same sender within 5 minutes)
const shouldGroupMessages = (currentMsg: ChatMessage, prevMsg: ChatMessage | null): boolean => {
  if (!prevMsg) return false;
  if (currentMsg.sender_id !== prevMsg.sender_id) return false;
  if (currentMsg.content_type === 'system_event' || prevMsg.content_type === 'system_event') return false;
  
  const timeDiff = Math.abs(
    new Date(currentMsg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
  ) / 60000; // minutes
  
  return timeDiff < 5;
};

// Flatten grouped messages with separators for virtualization
const flattenMessages = (
  grouped: Record<string, ChatMessage[]>,
  isLoadingMore: boolean,
  hasMoreMessages: boolean
): FlatItem[] => {
  const items: FlatItem[] = [];
  
  // Add loading indicator at top if loading more
  if (isLoadingMore) {
    items.push({ type: 'loading' });
  } else if (!hasMoreMessages) {
    items.push({ type: 'beginning' });
  }
  
  const dates = Object.keys(grouped).sort();
  
  dates.forEach((date) => {
    const messages = grouped[date];
    items.push({ type: 'separator', date });
    
    messages.forEach((message, index) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
      items.push({ type: 'message', message, prevMessage, nextMessage });
    });
  });
  
  return items;
};

// Row props type for react-window v2
interface RowProps {
  flatItems: FlatItem[];
  reactions: VirtualizedMessageListProps['reactions'];
  messageStars: VirtualizedMessageListProps['messageStars'];
  currentEmployeeId: string | undefined;
  onlineStatuses: Record<string, boolean>;
  replyCounts: Record<string, number>;
  editingMessageId: string | null;
  highlightMessageId?: string;
  callbacks: MessageCallbacks;
  isEditPending: boolean;
}

// Row component for react-window v2
function MessageRow({ 
  index, 
  style,
  flatItems,
  reactions,
  messageStars,
  currentEmployeeId,
  onlineStatuses,
  replyCounts,
  editingMessageId,
  highlightMessageId,
  callbacks,
  isEditPending,
}: { 
  index: number; 
  style: React.CSSProperties;
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
} & RowProps): React.ReactElement | null {
  const item = flatItems[index];
  
  if (item.type === 'loading') {
    return (
      <div style={style} className="flex justify-center py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          Loading older messages...
        </div>
      </div>
    );
  }
  
  if (item.type === 'beginning') {
    return (
      <div style={style} className="flex justify-center py-4">
        <span className="text-xs text-muted-foreground">Beginning of conversation</span>
      </div>
    );
  }
  
  if (item.type === 'separator') {
    return (
      <div style={style}>
        <DateSeparator date={item.date!} />
      </div>
    );
  }
  
  const message = item.message!;
  
  // Handle system event messages
  if (message.content_type === 'system_event' && message.system_event_data) {
    return (
      <div style={style}>
        <SystemEventMessage 
          eventData={message.system_event_data} 
          timestamp={message.created_at} 
        />
      </div>
    );
  }
  
  const isOwn = message.sender_id === currentEmployeeId;
  const isGrouped = shouldGroupMessages(message, item.prevMessage || null);
  const isLastInGroup = !item.nextMessage || !shouldGroupMessages(item.nextMessage, message);
  const messageReactions = reactions[message.id] || {};
  const isStarred = messageStars.some(s => s.message_id === message.id);
  
  return (
    <div 
      style={style} 
      id={`message-${message.id}`}
      className={highlightMessageId === message.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
    >
      <MessageBubble
        message={message}
        isOwn={isOwn}
        isGrouped={isGrouped}
        isLastInGroup={isLastInGroup}
        reactions={messageReactions}
        isEditing={editingMessageId === message.id}
        currentEmployeeId={currentEmployeeId}
        onEdit={() => callbacks.onEdit(message.id)}
        onCancelEdit={callbacks.onCancelEdit}
        onSaveEdit={(content) => callbacks.onSaveEdit(message.id, content)}
        onDelete={() => callbacks.onDelete(message.id)}
        onStar={() => callbacks.onStar(message.id)}
        onPin={() => callbacks.onPin(message.id, message.is_pinned)}
        onReact={(emoji) => callbacks.onReact(message.id, emoji)}
        onReply={() => callbacks.onReply(message)}
        replyCount={replyCounts[message.id]}
        isEditPending={isEditPending}
        isStarred={isStarred}
        isOnline={message.sender_id ? onlineStatuses[message.sender_id] : false}
      />
    </div>
  );
}

// Estimate height based on message content
const estimateRowHeight = (index: number, rowProps: RowProps): number => {
  const item = rowProps.flatItems[index];
  if (!item) return 60;
  
  if (item.type === 'separator') return 40;
  if (item.type === 'loading') return 48;
  if (item.type === 'beginning') return 32;
  
  if (!item.message) return 60;
  
  const message = item.message;
  
  // System events are smaller
  if (message.content_type === 'system_event') return 40;
  
  // Estimate based on content length
  const contentLength = message.content?.length || 0;
  const hasAttachments = (message.attachments?.length || 0) > 0;
  
  let baseHeight = 60; // Minimum height
  
  // Add height for content (rough estimate: 20px per 80 chars)
  baseHeight += Math.ceil(contentLength / 80) * 20;
  
  // Add height for attachments
  if (hasAttachments) {
    baseHeight += 100 * (message.attachments?.length || 1);
  }
  
  // Cap at reasonable max
  return Math.min(baseHeight, 500);
};

// Inner list component to work with AutoSizer
const InnerList = React.memo(({ 
  height, 
  width,
  flatItems,
  rowProps,
  listRef,
  dynamicRowHeight,
}: { 
  height: number | undefined; 
  width: number | undefined;
  flatItems: FlatItem[];
  rowProps: RowProps;
  listRef: React.RefObject<ListImperativeAPI | null>;
  dynamicRowHeight: ReturnType<typeof useDynamicRowHeight>;
}) => {
  if (!height || !width) return null;
  
  return (
    <List
      listRef={listRef}
      style={{ height, width }}
      rowCount={flatItems.length}
      rowHeight={dynamicRowHeight}
      rowComponent={MessageRow}
      rowProps={rowProps}
      overscanCount={5}
    />
  );
});

InnerList.displayName = 'InnerList';

export const VirtualizedMessageList = React.memo(({
  groupedMessages,
  reactions,
  messageStars,
  currentEmployeeId,
  onlineStatuses,
  replyCounts,
  editingMessageId,
  highlightMessageId,
  callbacks,
  isEditPending,
  isLoadingMore,
  hasMoreMessages,
}: VirtualizedMessageListProps) => {
  const listRef = useRef<ListImperativeAPI | null>(null);
  
  const flatItems = useMemo(() => 
    flattenMessages(groupedMessages, isLoadingMore, hasMoreMessages), 
    [groupedMessages, isLoadingMore, hasMoreMessages]
  );
  
  // Use dynamic row heights from react-window v2
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: 60,
    key: flatItems.length, // Reset when items change
  });
  
  // Row props passed to each row component
  const rowProps: RowProps = useMemo(() => ({
    flatItems,
    reactions,
    messageStars,
    currentEmployeeId,
    onlineStatuses,
    replyCounts,
    editingMessageId,
    highlightMessageId,
    callbacks,
    isEditPending,
  }), [
    flatItems, 
    reactions, 
    messageStars, 
    currentEmployeeId, 
    onlineStatuses, 
    replyCounts, 
    editingMessageId, 
    highlightMessageId, 
    callbacks, 
    isEditPending
  ]);
  
  // Scroll to highlighted message
  useEffect(() => {
    if (highlightMessageId && listRef.current) {
      const index = flatItems.findIndex(
        item => item.type === 'message' && item.message?.id === highlightMessageId
      );
      if (index !== -1) {
        listRef.current.scrollToRow({ index, align: 'center' });
      }
    }
  }, [highlightMessageId, flatItems]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatItems.length > 0 && listRef.current) {
      // Scroll to the last item
      listRef.current.scrollToRow({ index: flatItems.length - 1, align: 'end' });
    }
  }, [flatItems.length]);
  
  if (Object.keys(groupedMessages).length === 0) {
    return null;
  }
  
  return (
    <AutoSizer
      ChildComponent={({ height, width }) => (
        <InnerList
          height={height}
          width={width}
          flatItems={flatItems}
          rowProps={rowProps}
          listRef={listRef}
          dynamicRowHeight={dynamicRowHeight}
        />
      )}
    />
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';

export default VirtualizedMessageList;
