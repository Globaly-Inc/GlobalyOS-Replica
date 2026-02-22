import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, Lock } from 'lucide-react';
import { useDealNotes, useAddDealNote } from '@/services/useCRMDeals';
import { format } from 'date-fns';

interface Props {
  dealId: string;
}

export function DealNotesTab({ dealId }: Props) {
  const { data: notes, isLoading } = useDealNotes(dealId);
  const addNote = useAddDealNote();
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await addNote.mutateAsync({ deal_id: dealId, content, is_internal: isInternal });
    setContent('');
  };

  return (
    <div className="space-y-4">
      {/* Compose */}
      <Card className="p-4 space-y-3">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a note..."
          className="min-h-[100px]"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={isInternal} onCheckedChange={setIsInternal} id="internal" />
            <Label htmlFor="internal" className="text-xs flex items-center gap-1">
              {isInternal && <Lock className="h-3 w-3" />}
              Internal note
            </Label>
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || addNote.isPending} className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Add Note
          </Button>
        </div>
      </Card>

      {/* Notes list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
      ) : !notes?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note: any) => (
            <Card key={note.id} className={`p-4 ${note.is_internal ? 'border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/20' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium capitalize">{note.author_type}</span>
                {note.is_internal && (
                  <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                    <Lock className="h-3 w-3" /> Internal
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(note.created_at), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
