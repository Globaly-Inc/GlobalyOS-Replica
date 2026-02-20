import { useState, useRef, KeyboardEvent, useCallback, useEffect, useMemo } from 'react';
import { Send, Sparkles, Paperclip, StickyNote, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TemplatePicker } from './TemplatePicker';
import { useCreateMeetLink } from '@/hooks/useGoogleMeet';
import type { InboxChannelType } from '@/types/inbox';

interface InboxComposerProps {
  onSend: (text: string) => void;
  onSendNote: (text: string) => void;
  onAIDraft: () => Promise<string | undefined>;
  onAttachment?: (file: File) => void;
  onTypingChange?: (isTyping: boolean) => void;
  isSending: boolean;
  isAIDrafting: boolean;
  disabled?: boolean;
  channelType?: InboxChannelType;
  windowExpired?: boolean;
}

function getSmsSegmentInfo(text: string) {
  // GSM 7-bit: 160 chars per segment (or 153 for multi-part)
  // UCS-2: 70 chars per segment (or 67 for multi-part)
  const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ!"#¤%&'()*+,\-.\/0-9:;<=>?¡A-ZÄÖÑÜa-zäöñüà\^{}\\\[~\]|€]*$/;
  const isGsm = gsmRegex.test(text);
  const charLimit = isGsm ? 160 : 70;
  const multiLimit = isGsm ? 153 : 67;
  const len = text.length;
  const segments = len <= charLimit ? 1 : Math.ceil(len / multiLimit);
  return { chars: len, charLimit, segments, isGsm };
}

export const InboxComposer = ({
  onSend,
  onSendNote,
  onAIDraft,
  onAttachment,
  onTypingChange,
  isSending,
  isAIDrafting,
  disabled,
  channelType,
  windowExpired,
}: InboxComposerProps) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const createMeetLink = useCreateMeetLink();

  const smsInfo = useMemo(() => {
    if (channelType !== 'sms' || mode !== 'reply') return null;
    return getSmsSegmentInfo(text);
  }, [text, channelType, mode]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (mode === 'note') {
      onSendNote(trimmed);
    } else {
      onSend(trimmed);
    }
    setText('');
    onTypingChange?.(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.trim() && mode === 'reply') {
      onTypingChange?.(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingChange?.(false);
      }, 3000);
    } else {
      onTypingChange?.(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleAIDraft = async () => {
    try {
      const draft = await onAIDraft();
      if (draft) {
        setText(draft);
        textareaRef.current?.focus();
      }
    } catch {
      toast.error('Failed to generate AI draft');
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachment) {
      onAttachment(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTemplateSelect = (content: string) => {
    setText((prev) => (prev ? `${prev}\n${content}` : content));
    textareaRef.current?.focus();
  };

  const showWindowWarning = windowExpired && channelType === 'whatsapp' && mode === 'reply';

  return (
    <div className={cn(
      'border-t border-border bg-card px-4 py-3',
      mode === 'note' && 'bg-yellow-50/50 dark:bg-yellow-900/10'
    )}>
      {showWindowWarning && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          <span>⚠️ WhatsApp 24h window expired. Only template messages can be sent.</span>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => setMode('reply')}
          className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-md transition-colors',
            mode === 'reply'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Reply
        </button>
        <button
          onClick={() => setMode('note')}
          className={cn(
            'text-xs font-medium px-2.5 py-1 rounded-md transition-colors flex items-center gap-1',
            mode === 'note'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <StickyNote className="h-3 w-3" />
          Note
        </button>

        {/* SMS segment counter */}
        {smsInfo && text.length > 0 && (
          <span className={cn(
            'ml-auto text-[10px] font-mono tabular-nums',
            smsInfo.segments > 1 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
          )}>
            SMS · {smsInfo.chars}/{smsInfo.charLimit} · {smsInfo.segments} seg{smsInfo.segments > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'note' ? 'Add an internal note...' : showWindowWarning ? 'Select a template to send...' : 'Type a message...'}
          className="min-h-[40px] max-h-[120px] resize-none text-sm"
          disabled={disabled || isSending}
          rows={1}
        />
        <div className="flex items-center gap-1">
          {mode === 'reply' && (
            <>
              <TemplatePicker channelType={channelType} onSelect={handleTemplateSelect} />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleFileSelect}
                disabled={disabled}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={async () => {
                  try {
                    const link = await createMeetLink.mutateAsync();
                    setText((prev) => (prev ? `${prev}\n${link}` : link));
                    textareaRef.current?.focus();
                    toast.success('Meet link created');
                  } catch {}
                }}
                disabled={disabled || createMeetLink.isPending}
                title="Google Meet"
              >
                {createMeetLink.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4 text-green-600" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleAIDraft}
                disabled={disabled || isAIDrafting}
                title="AI Draft"
              >
                {isAIDrafting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-violet-500" />
                )}
              </Button>
            </>
          )}
          <Button
            size="icon"
            className="h-9 w-9"
            onClick={handleSend}
            disabled={disabled || isSending || !text.trim()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={handleFileChange}
      />
    </div>
  );
};
