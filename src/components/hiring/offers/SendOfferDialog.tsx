/**
 * Send Offer Dialog
 * Dialog to send an offer email to the candidate
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SendOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  offerTitle?: string;
  candidateName?: string;
  candidateEmail?: string;
}

export function SendOfferDialog({
  open,
  onOpenChange,
  offerId,
  offerTitle,
  candidateName,
  candidateEmail,
}: SendOfferDialogProps) {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!currentOrg?.id || !offerId) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-offer-email', {
        body: {
          organization_id: currentOrg.id,
          offer_id: offerId,
          custom_message: customMessage.trim() || undefined,
          sender_employee_id: currentEmployee?.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Offer email sent successfully!');
        queryClient.invalidateQueries({ queryKey: ['hiring', 'offer'] });
        queryClient.invalidateQueries({ queryKey: ['hiring', 'applications'] });
        onOpenChange(false);
        setCustomMessage('');
      } else {
        throw new Error(data?.message || 'Failed to send offer email');
      }
    } catch (error: any) {
      console.error('Error sending offer email:', error);
      toast.error(error.message || 'Failed to send offer email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Send Offer to Candidate
          </DialogTitle>
          <DialogDescription>
            Send the job offer for <strong>{offerTitle}</strong> to{' '}
            <strong>{candidateName}</strong> ({candidateEmail}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="mb-2">The email will include:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Position title and level</li>
              <li>Compensation details</li>
              <li>Start date</li>
              <li>Offer expiration date (if set)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customMessage">
              Personal Message <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              placeholder="Add a personal message to include in the offer email..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Offer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
