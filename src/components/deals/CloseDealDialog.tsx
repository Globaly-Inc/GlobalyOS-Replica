import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCloseDeal } from '@/services/useCRMDeals';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  type: 'won' | 'lost' | 'cancelled';
}

export function CloseDealDialog({ open, onOpenChange, dealId, type }: Props) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const closeDeal = useCloseDeal();

  const handleClose = async () => {
    await closeDeal.mutateAsync({
      dealId,
      status: type,
      lost_reason: reason || undefined,
      lost_notes: notes || undefined,
    });
    onOpenChange(false);
    setReason('');
    setNotes('');
  };

  const titles: Record<string, string> = {
    won: 'Mark Deal as Won',
    lost: 'Mark Deal as Lost',
    cancelled: 'Cancel Deal',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'won' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
            {titles[type]}
          </DialogTitle>
          <DialogDescription>
            {type === 'won' ? 'Congratulations! Record the win.' : 'Provide a reason for closing this deal.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {type !== 'won' && (
            <div>
              <Label>Reason</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Budget constraints, went with competitor..." />
            </div>
          )}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleClose}
            disabled={closeDeal.isPending}
            variant={type === 'won' ? 'default' : 'destructive'}
          >
            {type === 'won' ? 'Confirm Win' : type === 'lost' ? 'Mark as Lost' : 'Cancel Deal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
