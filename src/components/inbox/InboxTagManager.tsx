import { useState, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

interface InboxTagManagerProps {
  tags: string[];
  onUpdate: (tags: string[]) => void;
}

export const InboxTagManager = ({ tags, onUpdate }: InboxTagManagerProps) => {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const tag = input.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onUpdate([...tags, tag]);
    }
    setInput('');
    setAdding(false);
  };

  const handleRemove = (tag: string) => {
    onUpdate(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setAdding(false);
      setInput('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] gap-1 pr-1">
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              className="hover:text-destructive transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md border border-dashed border-border"
          >
            <Plus className="h-2.5 w-2.5" />
            Add
          </button>
        )}
      </div>
      {adding && (
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAdd}
            placeholder="Tag name..."
            className="h-7 text-xs"
          />
        </div>
      )}
    </div>
  );
};
