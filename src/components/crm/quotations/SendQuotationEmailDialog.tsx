/**
 * SendQuotationEmailDialog - Email quotation to contact with customizable template
 */
import { useState, useEffect } from 'react';
import { Send, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CRMQuotation } from '@/types/crm-quotation';

interface SendQuotationEmailDialogProps {
  quotation: CRMQuotation;
  children?: React.ReactNode;
}

export const SendQuotationEmailDialog = ({ quotation, children }: SendQuotationEmailDialogProps) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const contactName = quotation.contact
    ? `${quotation.contact.first_name} ${quotation.contact.last_name || ''}`.trim()
    : '';
  const contactEmail = quotation.contact?.email || '';

  const [recipientEmail, setRecipientEmail] = useState(contactEmail);
  const [recipientName, setRecipientName] = useState(contactName);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setRecipientEmail(contactEmail);
      setRecipientName(contactName);
      setSubject(`Quotation ${quotation.quotation_number}`);
      setMessage(
        `We are pleased to share the quotation for your review.\n\nPlease click the link below to view the full details and approve if you are satisfied.`
      );
    }
  }, [open, contactEmail, contactName, quotation.quotation_number]);

  const handleSend = async () => {
    if (!recipientEmail.trim()) {
      toast.error('Recipient email is required');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          quotationId: quotation.id,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          subject: subject.trim() || undefined,
          message: message.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Quotation emailed to ${recipientEmail}`);
      qc.invalidateQueries({ queryKey: ['crm-quotation', quotation.id] });
      qc.invalidateQueries({ queryKey: ['crm-quotations'] });
      qc.invalidateQueries({ queryKey: ['crm-quotation-comments', quotation.id] });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send quotation email');
    } finally {
      setSending(false);
    }
  };

  const grandTotal = `${quotation.currency} ${(quotation.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Quotation via Email
          </DialogTitle>
          <DialogDescription>
            Send {quotation.quotation_number} ({grandTotal}) to your client with a customizable email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quotation summary */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{quotation.quotation_number}</p>
              <p className="text-xs text-muted-foreground">{quotation.options?.length || 0} option(s) • {grandTotal}</p>
            </div>
            <Badge variant="outline" className="capitalize">{quotation.status}</Badge>
          </div>

          <Separator />

          {/* Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Recipient Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="Client name"
                  className="pl-8 h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Recipient Email *</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="pl-8 h-9"
                  required
                />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs">Email Subject</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Quotation subject..."
              className="h-9"
            />
          </div>

          {/* Custom message */}
          <div className="space-y-1.5">
            <Label className="text-xs">Personal Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a personal note to your client..."
              rows={4}
              className="text-sm"
            />
          </div>

          {/* Preview info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 space-y-1">
            <p className="font-medium text-foreground">Email will include:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Your organization branding</li>
              <li>Quotation summary with all options, services, and fees</li>
              <li>Grand total and validity date</li>
              <li>"View & Approve Quotation" button linking to the public approval page</li>
              {quotation.cover_letter && <li>Cover letter</li>}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !recipientEmail.trim()} className="gap-1.5">
            {sending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
