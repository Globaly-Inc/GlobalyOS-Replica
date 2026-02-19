import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Sparkles, Paperclip, StickyNote, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InboxComposerProps {
  onSend: (text: string) => void;
  onSendNote: (text: string) => void;
  onAIDraft: () => Promise<string | undefined>;
  isSending: boolean;
  isAIDrafting: boolean;
  disabled?: boolean;
}

export const InboxComposer = ({
  onSend,
  onSendNote,
  onAIDraft,
  isSending,
  isAIDrafting,
  disabled,
}: InboxComposerProps) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (mode === 'note') {
      onSendNote(trimmed);
    } else {
      onSend(trimmed);
    }
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAIDraft = async () => {
    try {
      const draft = await onAIDraft();
      if (draft) {
        setText(draft);
        textareaRef.current?.focus();
      }
    } catch (err) {
      toast.error('Failed to generate AI draft');
    }
  };

  return (
    <div className={cn(
      'border-t border-border bg-card px-4 py-3',
      mode === 'note' && 'bg-yellow-50/50 dark:bg-yellow-900/10'
    )}>
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
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'note' ? 'Add an internal note...' : 'Type a message...'}
          className="min-h-[40px] max-h-[120px] resize-none text-sm"
          disabled={disabled || isSending}
          rows={1}
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleAIDraft}
            disabled={disabled || isAIDrafting || mode === 'note'}
            title="AI Draft"
          >
            {isAIDrafting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-violet-500" />
            )}
          </Button>
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
    </div>
  );
};
