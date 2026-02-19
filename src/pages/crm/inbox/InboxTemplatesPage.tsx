import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useInboxMacros, useCreateInboxMacro, useUpdateInboxMacro, useDeleteInboxMacro } from '@/hooks/useInboxMacros';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ChannelBadge } from '@/components/inbox/ChannelBadge';
import type { InboxChannelType, InboxMacro } from '@/types/inbox';

const ALL_CHANNELS: InboxChannelType[] = ['whatsapp', 'telegram', 'messenger', 'instagram', 'tiktok', 'email'];

const InboxTemplatesPage = () => {
  const { currentOrg } = useOrganization();
  const { data: macros = [], isLoading } = useInboxMacros();
  const createMacro = useCreateInboxMacro();
  const updateMacro = useUpdateInboxMacro();
  const deleteMacro = useDeleteInboxMacro();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InboxMacro | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [channels, setChannels] = useState<InboxChannelType[]>([...ALL_CHANNELS]);
  const [search, setSearch] = useState('');

  const resetForm = () => {
    setName('');
    setContent('');
    setCategory('');
    setChannels([...ALL_CHANNELS]);
    setEditing(null);
  };

  const openEdit = (macro: InboxMacro) => {
    setEditing(macro);
    setName(macro.name);
    setContent(macro.content);
    setCategory(macro.category || '');
    setChannels(macro.channel_compatibility as InboxChannelType[]);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !content.trim() || !currentOrg?.id) return;

    const variables = [...content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);

    if (editing) {
      updateMacro.mutate(
        {
          id: editing.id,
          updates: {
            name: name.trim(),
            content: content.trim(),
            category: category.trim() || null,
            channel_compatibility: channels,
            variables,
          },
        },
        {
          onSuccess: () => {
            toast.success('Template updated');
            setDialogOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createMacro.mutate(
        {
          organization_id: currentOrg.id,
          name: name.trim(),
          content: content.trim(),
          category: category.trim() || null,
          channel_compatibility: channels,
          variables,
          is_active: true,
        },
        {
          onSuccess: () => {
            toast.success('Template created');
            setDialogOpen(false);
            resetForm();
          },
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteMacro.mutate(id, {
      onSuccess: () => toast.success('Template deleted'),
    });
  };

  const toggleChannel = (ch: InboxChannelType) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const filtered = macros.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.content.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q);
  });

  return (
    <div className="container px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quick Reply Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Reusable message templates with variable support</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Greeting, Business Hours" />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hi {{name}}, thanks for reaching out! Our hours are..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Use {'{{variable}}'} for dynamic placeholders</p>
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Support, Sales, FAQ" />
              </div>
              <div className="space-y-2">
                <Label>Channel Compatibility</Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CHANNELS.map((ch) => (
                    <label key={ch} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={channels.includes(ch)}
                        onCheckedChange={() => toggleChannel(ch)}
                      />
                      <ChannelBadge channel={ch} size="sm" showLabel />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button size="sm" onClick={handleSave} disabled={!name.trim() || !content.trim() || createMacro.isPending || updateMacro.isPending}>
                {(createMacro.isPending || updateMacro.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search templates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No templates yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((macro) => (
            <Card key={macro.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{macro.name}</CardTitle>
                    {macro.category && (
                      <Badge variant="secondary" className="text-[10px] mt-1">{macro.category}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(macro.content); toast.success('Copied'); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(macro)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(macro.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{macro.content}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {(macro.channel_compatibility as InboxChannelType[]).map((ch) => (
                    <ChannelBadge key={ch} channel={ch} size="xs" />
                  ))}
                </div>
                {macro.variables.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {macro.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-[10px]">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InboxTemplatesPage;
