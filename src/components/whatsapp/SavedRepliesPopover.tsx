import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SavedReply {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
  category: string | null;
  usage_count: number;
}

interface Props {
  orgId: string;
  onSelect: (body: string) => void;
}

export default function SavedRepliesPopover({ orgId, onSelect }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newShortcut, setNewShortcut] = useState('');

  const { data: replies = [] } = useQuery({
    queryKey: ['wa-saved-replies', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_saved_replies')
        .select('*')
        .eq('organization_id', orgId)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data as SavedReply[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('wa_saved_replies').insert({
        organization_id: orgId,
        title: newTitle.trim(),
        body: newBody.trim(),
        shortcut: newShortcut.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-saved-replies'] });
      toast.success('Saved reply created');
      setAddOpen(false);
      setNewTitle('');
      setNewBody('');
      setNewShortcut('');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wa_saved_replies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-saved-replies'] });
    },
  });

  const handleUse = async (reply: SavedReply) => {
    onSelect(reply.body);
    // Increment usage count
    await supabase.from('wa_saved_replies').update({ usage_count: reply.usage_count + 1 } as any).eq('id', reply.id);
  };

  const filtered = replies.filter(
    (r) =>
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.body.toLowerCase().includes(search.toLowerCase()) ||
      (r.shortcut && r.shortcut.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Saved Replies">
            <BookOpen className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" side="top">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search replies..."
                className="h-7 text-xs border-0 shadow-none p-0 focus-visible:ring-0"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-52">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">
                {replies.length === 0 ? 'No saved replies yet' : 'No matches'}
              </div>
            ) : (
              <div className="p-1">
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer group"
                    onClick={() => handleUse(r)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">{r.title}</span>
                        {r.shortcut && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">/{r.shortcut}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{r.body}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Saved Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Greeting" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Shortcut (optional)</Label>
              <Input value={newShortcut} onChange={(e) => setNewShortcut(e.target.value)} placeholder="e.g. hello" className="h-8 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Type /shortcut in chat to use</p>
            </div>
            <div>
              <Label className="text-xs">Message Body</Label>
              <Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Type the reply..." className="text-sm min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!newTitle.trim() || !newBody.trim() || createMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
