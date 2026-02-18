/**
 * Tag Selector Component
 * Reusable autocomplete multi-select for managing tags on a contact.
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Plus, Tag } from 'lucide-react';
import { useCRMTags, useCreateCRMTag } from '@/services/useCRMTags';

interface Props {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export const TagSelector = ({ selectedTags, onTagsChange }: Props) => {
  const { data: orgTags = [] } = useCRMTags();
  const createTag = useCreateCRMTag();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const availableTags = orgTags.filter(t => !selectedTags.includes(t.name));
  const filtered = search
    ? availableTags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : availableTags;

  const addTag = (name: string) => {
    onTagsChange([...selectedTags, name]);
    setSearch('');
  };

  const removeTag = (name: string) => {
    onTagsChange(selectedTags.filter(t => t !== name));
  };

  const createAndAdd = async () => {
    if (!search.trim()) return;
    try {
      await createTag.mutateAsync({ name: search.trim() });
      addTag(search.trim());
    } catch {
      // tag may already exist, just add it
      addTag(search.trim());
    }
  };

  const getTagColor = (name: string) => {
    const tag = orgTags.find(t => t.name === name);
    return tag?.color || undefined;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {selectedTags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs gap-1"
            style={getTagColor(tag) ? { backgroundColor: getTagColor(tag) + '20', borderColor: getTagColor(tag), color: getTagColor(tag) } : undefined}
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <Input
              placeholder="Search or create tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs mb-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  const existing = filtered.find(t => t.name.toLowerCase() === search.toLowerCase());
                  if (existing) {
                    addTag(existing.name);
                  } else {
                    createAndAdd();
                  }
                }
              }}
            />
            <div className="max-h-32 overflow-auto space-y-1">
              {filtered.map((tag) => (
                <button
                  key={tag.id}
                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted transition-colors flex items-center gap-2"
                  onClick={() => { addTag(tag.name); setOpen(false); }}
                >
                  {tag.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />}
                  {tag.name}
                </button>
              ))}
              {search.trim() && !filtered.find(t => t.name.toLowerCase() === search.toLowerCase()) && (
                <button
                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted transition-colors text-primary"
                  onClick={createAndAdd}
                >
                  Create &quot;{search.trim()}&quot;
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
