/**
 * VirtualizedMessageList - Performance-optimized message rendering
 * Only renders visible messages (~15 nodes) instead of entire history (500+)
 * Uses react-window for virtualization with dynamic row heights
 */

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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

// Estimate height based on message content
const estimateRowHeight = (item: FlatItem): number => {
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
  const listRef = useRef<List>(null);
  const rowHeights = useRef<Record<number, number>>({});
  const outerRef = useRef<HTMLDivElement>(null);
  
  const flatItems = useMemo(() => 
    flattenMessages(groupedMessages, isLoadingMore, hasMoreMessages), 
    [groupedMessages, isLoadingMore, hasMoreMessages]
  );
  
  // Get row height - use measured height if available, otherwise estimate
  const getRowHeight = useCallback((index: number) => {
    if (rowHeights.current[index]) {
      return rowHeights.current[index];
    }
    return estimateRowHeight(flatItems[index]);
  }, [flatItems]);
  
  // Set measured row height
  const setRowHeight = useCallback((index: number, height: number) => {
    if (rowHeights.current[index] !== height && height > 0) {
      rowHeights.current[index] = height;
      listRef.current?.resetAfterIndex(index, false);
    }
  }, []);
  
  // Scroll to highlighted message
  useEffect(() => {
    if (highlightMessageId && listRef.current) {
      const index = flatItems.findIndex(
        item => item.type === 'message' && item.message?.id === highlightMessageId
      );
      if (index !== -1) {
        listRef.current.scrollToItem(index, 'center');
      }
    }
  }, [highlightMessageId, flatItems]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatItems.length > 0 && listRef.current) {
      // Only auto-scroll if we're near the bottom
      const list = listRef.current;
      const container = outerRef.current;
      if (container) {
        const { scrollHeight, scrollTop, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        if (isNearBottom) {
          list.scrollToItem(flatItems.length - 1, 'end');
        }
      }
    }
  }, [flatItems.length]);
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
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
  }, [
    flatItems, 
    currentEmployeeId, 
    reactions, 
    messageStars, 
    editingMessageId, 
    callbacks, 
    replyCounts, 
    isEditPending, 
    onlineStatuses,
    highlightMessageId
  ]);
  
  if (Object.keys(groupedMessages).length === 0) {
    return null;
  }
  
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          ref={listRef}
          outerRef={outerRef}
          height={height}
          width={width}
          itemCount={flatItems.length}
          itemSize={getRowHeight}
          overscanCount={5}
          initialScrollOffset={0}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';

export default VirtualizedMessageList;
