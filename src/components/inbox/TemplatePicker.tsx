import { useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useInboxMacros } from '@/hooks/useInboxMacros';
import type { InboxMacro, InboxChannelType } from '@/types/inbox';

interface TemplatePickerProps {
  channelType?: InboxChannelType;
  onSelect: (content: string) => void;
}

export const TemplatePicker = ({ channelType, onSelect }: TemplatePickerProps) => {
  const { data: macros = [] } = useInboxMacros();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = macros.filter((m) => {
    if (channelType && !(m.channel_compatibility as InboxChannelType[]).includes(channelType)) {
      return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.content.toLowerCase().includes(q);
  });

  const handleSelect = (macro: InboxMacro) => {
    onSelect(macro.content);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Insert Template">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="top">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="max-h-60">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No templates found</div>
          ) : (
            <div className="p-1">
              {filtered.map((macro) => (
                <button
                  key={macro.id}
                  onClick={() => handleSelect(macro)}
                  className="w-full text-left rounded-md px-2.5 py-2 hover:bg-muted transition-colors"
                >
                  <div className="text-xs font-medium text-foreground">{macro.name}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{macro.content}</div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
