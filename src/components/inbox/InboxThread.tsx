import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChannelBadge } from './ChannelBadge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Bot, CheckCheck, Check, Clock, AlertCircle, PhoneIncoming, PhoneOutgoing, Mic } from 'lucide-react';
import type { InboxMessage, InboxConversation, InboxContact } from '@/types/inbox';

interface InboxThreadProps {
  conversation: (InboxConversation & { inbox_contacts?: InboxContact }) | undefined;
  messages: InboxMessage[];
  isLoading: boolean;
}

const deliveryIcon = {
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
  sent: <Check className="h-3 w-3 text-muted-foreground" />,
  delivered: <CheckCheck className="h-3 w-3 text-muted-foreground" />,
  read: <CheckCheck className="h-3 w-3 text-blue-500" />,
  failed: <AlertCircle className="h-3 w-3 text-destructive" />,
};

function isVoiceSystemMessage(msg: InboxMessage): boolean {
  const content = msg.content as Record<string, unknown>;
  return msg.msg_type === 'system' && !!(content?.call_sid || content?.recording_url || content?.recording_duration);
}

function VoiceCallBubble({ msg }: { msg: InboxMessage }) {
  const content = msg.content as {
    body?: string;
    call_sid?: string;
    call_status?: string;
    recording_url?: string;
    recording_duration?: number;
    transcription?: string;
  };

  const isInbound = msg.direction === 'inbound';
  const hasRecording = !!content.recording_url;
  const duration = content.recording_duration;

  return (
    <div className="flex justify-center">
      <div className="bg-muted/60 border border-border rounded-xl px-4 py-3 max-w-sm space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {isInbound ? (
            <PhoneIncoming className="h-4 w-4 text-green-600" />
          ) : (
            <PhoneOutgoing className="h-4 w-4 text-blue-600" />
          )}
          <span>{content.body || (isInbound ? 'Inbound Call' : 'Outbound Call')}</span>
        </div>

        {duration !== undefined && duration > 0 && (
          <p className="text-xs text-muted-foreground">
            Duration: {duration >= 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`}
          </p>
        )}

        {hasRecording && (
          <div className="space-y-1.5">
            <audio
              controls
              className="w-full h-8"
              src={content.recording_url}
            >
              <a href={content.recording_url} target="_blank" rel="noopener noreferrer">
                Listen to recording
              </a>
            </audio>
          </div>
        )}

        {content.transcription && (
          <div className="bg-background/60 rounded-md px-2.5 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Mic className="h-3 w-3" />
              <span className="font-medium text-foreground">Transcription</span>
            </div>
            <p className="italic">"{content.transcription}"</p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          {format(new Date(msg.created_at), 'MMM d, HH:mm')}
        </p>
      </div>
    </div>
  );
}

export const InboxThread = ({ conversation, messages, isLoading }: InboxThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <ChannelBadge channel="whatsapp" size="lg" />
          </div>
          <p className="text-lg font-medium text-foreground">Omni-Channel Inbox</p>
          <p className="text-sm text-muted-foreground mt-1">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const contact = conversation.inbox_contacts;
  const displayName = contact?.name || contact?.phone || contact?.email || 'Unknown';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
            <ChannelBadge channel={conversation.channel_type} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {contact?.phone || contact?.email || ''}
          </p>
        </div>
        <div className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-medium capitalize',
          conversation.status === 'open' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          conversation.status === 'pending' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          conversation.status === 'snoozed' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          conversation.status === 'closed' && 'bg-muted text-muted-foreground',
        )}>
          {conversation.status}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((msg) => {
              const isOutbound = msg.direction === 'outbound';
              const isNote = msg.msg_type === 'note';
              const isSystem = msg.msg_type === 'system';
              const body = (msg.content as { body?: string })?.body || '';

              // Voice call bubble
              if (isVoiceSystemMessage(msg)) {
                return <VoiceCallBubble key={msg.id} msg={msg} />;
              }

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {body}
                    </span>
                  </div>
                );
              }

              if (isNote) {
                return (
                  <div key={msg.id} className="mx-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Internal Note</p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{body}</p>
                    <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-1">
                      {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5',
                    isOutbound
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  )}>
                    {msg.created_by_type === 'ai' && isOutbound && (
                      <div className="flex items-center gap-1 mb-1">
                        <Bot className="h-3 w-3" />
                        <span className="text-[10px] font-medium opacity-75">AI</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{body}</p>
                    <div className={cn(
                      'flex items-center gap-1 mt-1',
                      isOutbound ? 'justify-end' : 'justify-start'
                    )}>
                      <span className={cn(
                        'text-[10px]',
                        isOutbound ? 'opacity-70' : 'text-muted-foreground'
                      )}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                      {isOutbound && deliveryIcon[msg.delivery_status]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
