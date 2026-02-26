import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const EMOJI_LIST = [
  '📂', '📁', '🚀', '💡', '🎯', '📋', '🔧', '💼', '📊', '🎨',
  '🏠', '🌟', '📝', '🔥', '⚡', '🎮', '📸', '🎵', '📈', '🏆',
  '🌈', '💎', '🧩', '🔒', '📌', '🗂️', '📦', '🛠️', '🧪', '🎁',
  '🌍', '💬', '📅', '🔔', '❤️', '✅', '🎓', '🏗️', '⭐', '🔑',
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  size?: 'sm' | 'md';
}

export const EmojiPicker = ({ value, onChange, size = 'md' }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={size === 'sm' ? 'h-8 w-8 text-base p-0' : 'h-10 w-10 text-xl p-0'}
        >
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-base"
              onClick={() => { onChange(emoji); setOpen(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
