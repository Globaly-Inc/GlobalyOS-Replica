import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Clock, Check, CheckCheck, AlertCircle, Image, FileText, Video } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import type { WaMessage, WaContact } from '@/types/whatsapp';

interface Props {
  messages: WaMessage[];
  contact: WaContact | undefined;
  windowOpenUntil: string | null;
  onSend: (body: string) => void;
  isSending: boolean;
}

function MessageStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-primary" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
}

function MessageTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4 mr-1" />;
    case 'video':
      return <Video className="h-4 w-4 mr-1" />;
    case 'document':
      return <FileText className="h-4 w-4 mr-1" />;
    default:
      return null;
  }
}

function getMessageText(msg: WaMessage): string {
  const content = msg.content as Record<string, unknown>;
  if (content.body) return String(content.body);
  if (content.caption) return String(content.caption);
  if (msg.msg_type === 'template') return `[Template message]`;
  if (msg.msg_type === 'interactive') return `[Interactive message]`;
  return `[${msg.msg_type}]`;
}

export default function ChatThread({ messages, contact, windowOpenUntil, onSend, isSending }: Props) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const windowOpen = windowOpenUntil ? new Date(windowOpenUntil) > new Date() : false;
  const hoursLeft = windowOpenUntil
    ? Math.max(0, differenceInHours(new Date(windowOpenUntil), new Date()))
    : 0;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div>
          <h3 className="font-semibold text-sm text-foreground">{contact.name || contact.phone}</h3>
          <p className="text-xs text-muted-foreground">{contact.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          {windowOpen ? (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {hoursLeft}h window
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs gap-1 text-amber-600">
              <Clock className="h-3 w-3" />
              Window closed
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-2">
          {messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div
                key={msg.id}
                className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-xl px-3 py-2 text-sm',
                    isOutbound
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}
                >
                  <div className="flex items-start">
                    <MessageTypeIcon type={msg.msg_type} />
                    <span className="whitespace-pre-wrap break-words">{getMessageText(msg)}</span>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 mt-1',
                    isOutbound ? 'justify-end' : 'justify-start'
                  )}>
                    <span className={cn(
                      'text-[10px]',
                      isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                    {isOutbound && <MessageStatusIcon status={msg.status} />}
                  </div>
                  {msg.status === 'failed' && msg.error_message && (
                    <p className="text-[10px] text-destructive mt-1">{msg.error_message}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-border bg-card">
        {!windowOpen && (
          <p className="text-xs text-amber-600 mb-2">
            24h window closed. Only template messages can be sent.
          </p>
        )}
        <div className="flex gap-2">
          <Input
            placeholder={windowOpen ? 'Type a message...' : 'Send a template...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || !windowOpen}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || isSending || !windowOpen}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
