/**
 * PlaceholderDropdown – searchable, scrollable list of email template placeholders.
 * Each row shows the variable key + description + a copy-to-clipboard icon.
 * Optionally calls onInsert(key) when a row is clicked (for cursor insertion).
 */

import { useState } from 'react';
import { Copy, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { toast } from 'sonner';

export const PLACEHOLDERS = [
  { key: '{{candidate_name}}', description: 'Full name' },
  { key: '{{candidate_first_name}}', description: 'First name' },
  { key: '{{job_title}}', description: 'Job title' },
  { key: '{{company_name}}', description: 'Company name' },
  { key: '{{stage_name}}', description: 'Current stage' },
  { key: '{{application_date}}', description: 'Date applied' },
  { key: '{{assignment_link}}', description: 'Link to candidate assignment' },
  { key: '{{position_public_page_link}}', description: 'Public job posting URL' },
];

interface PlaceholderDropdownProps {
  /** Called when the user clicks a row (for inserting at cursor). Copy always works regardless. */
  onInsert?: (key: string) => void;
}

export function PlaceholderDropdown({ onInsert }: PlaceholderDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(key);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  const handleInsert = (key: string) => {
    onInsert?.(key);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button" className="gap-1.5">
          Placeholders
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[200]" align="start" side="top">
        <Command>
          <CommandInput placeholder="Search placeholders…" />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>No placeholders found.</CommandEmpty>
            <CommandGroup>
              {PLACEHOLDERS.map((p) => (
                <CommandItem
                  key={p.key}
                  value={`${p.key} ${p.description}`}
                  onSelect={() => handleInsert(p.key)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <code className="text-[11px] font-mono bg-muted px-1 py-0.5 rounded text-foreground">
                      {p.key}
                    </code>
                    <span className="ml-2 text-xs text-muted-foreground">{p.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCopy(p.key, e)}
                    className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedKey === p.key ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
