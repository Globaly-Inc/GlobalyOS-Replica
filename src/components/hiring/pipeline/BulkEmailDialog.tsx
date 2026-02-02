/**
 * Bulk Email Dialog
 * Dialog to compose and send bulk emails to selected candidates
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { toast } from 'sonner';

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess?: () => void;
}

const TEMPLATE_VARIABLES = [
  { key: '{{candidate_name}}', description: 'Full name' },
  { key: '{{candidate_first_name}}', description: 'First name' },
  { key: '{{job_title}}', description: 'Job title' },
  { key: '{{company_name}}', description: 'Company name' },
];

export function BulkEmailDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkEmailDialogProps) {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const [subject, setSubject] = useState('Update on your application for {{job_title}}');
  const [body, setBody] = useState(
    `Hi {{candidate_first_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}}.\n\n[Your message here]\n\nBest regards,\nThe Hiring Team`
  );
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!currentOrg?.id || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-hiring-email', {
        body: {
          organization_id: currentOrg.id,
          application_ids: selectedIds,
          subject: subject.trim(),
          body: body.trim(),
          sender_employee_id: currentEmployee?.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Email sent to ${data.sent} candidate(s)${data.failed > 0 ? `. ${data.failed} failed.` : ''}`);
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setSubject('Update on your application for {{job_title}}');
        setBody(
          `Hi {{candidate_first_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}}.\n\n[Your message here]\n\nBest regards,\nThe Hiring Team`
        );
      } else {
        throw new Error(data?.message || 'Failed to send emails');
      }
    } catch (error: any) {
      console.error('Error sending bulk email:', error);
      toast.error(error.message || 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to Candidates
          </DialogTitle>
          <DialogDescription>
            Compose an email to send to {selectedIds.length} selected candidate(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipients count */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedIds.length} recipient(s)
            </Badge>
          </div>

          {/* Template variables info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Available variables:</strong>{' '}
              {TEMPLATE_VARIABLES.map((v, i) => (
                <span key={v.key}>
                  <button
                    type="button"
                    className="font-mono text-primary hover:underline"
                    onClick={() => insertVariable(v.key)}
                  >
                    {v.key}
                  </button>
                  {i < TEMPLATE_VARIABLES.length - 1 && ', '}
                </span>
              ))}
            </AlertDescription>
          </Alert>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Your message..."
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !subject.trim() || !body.trim()}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
