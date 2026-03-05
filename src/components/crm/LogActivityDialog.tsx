/**
 * Log Activity Dialog
 * Dialog to log a new CRM activity with type-specific fields.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCRMActivity } from '@/services/useCRM';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string | null;
  companyId?: string | null;
}

const activityTypes = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
];

export const LogActivityDialog = ({ open, onOpenChange, contactId, companyId }: Props) => {
  const [type, setType] = useState('note');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState('');
  const createActivity = useCreateCRMActivity();

  const showSubject = type !== 'note';
  const showDuration = type === 'call' || type === 'meeting';

  const handleSubmit = () => {
    if (!content.trim() && !subject.trim()) return;
    createActivity.mutate(
      {
        contact_id: contactId ?? undefined,
        company_id: companyId ?? undefined,
        type: type as any,
        content: content || null,
        subject: subject || null,
        duration_minutes: duration ? parseInt(duration) : null,
      } as any,
      {
        onSuccess: () => {
          toast.success('Activity logged');
          setType('note');
          setSubject('');
          setContent('');
          setDuration('');
          onOpenChange(false);
        },
        onError: () => toast.error('Failed to log activity'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {activityTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showSubject && (
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line..." />
            </div>
          )}
          <div>
            <Label>Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Details..." rows={3} />
          </div>
          {showDuration && (
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 30" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createActivity.isPending}>
              {createActivity.isPending ? 'Saving...' : 'Log Activity'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
