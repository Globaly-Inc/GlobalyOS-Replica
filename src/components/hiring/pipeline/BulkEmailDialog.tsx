/**
 * Bulk Email Dialog
 * Dialog to compose and send bulk emails to selected candidates
 */

import { useState, useRef, useEffect } from 'react';
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
import { Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { toast } from 'sonner';
import { PlaceholderDropdown } from '@/components/hiring/PlaceholderDropdown';

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess?: () => void;
}

// ── Auto-resize hook ─────────────────────────────────────────
const MAX_BODY_HEIGHT = 480; // ~20 lines
const useAutoResize = (value: string) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, MAX_BODY_HEIGHT);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > MAX_BODY_HEIGHT ? 'auto' : 'hidden';
  }, [value]);
  return ref;
};

const DEFAULT_SUBJECT = 'Update on your application for {{job_title}}';
const DEFAULT_BODY =
  `Hi {{candidate_first_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}}.\n\n[Your message here]\n\nBest regards,\nThe Hiring Team`;

export function BulkEmailDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkEmailDialogProps) {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [isSending, setIsSending] = useState(false);

  const bodyRef = useAutoResize(body);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInsertPlaceholder = (key: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => prev + key);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = body.slice(0, start) + key + body.slice(end);
    setBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + key.length, start + key.length);
    }, 0);
  };

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
        setSubject(DEFAULT_SUBJECT);
        setBody(DEFAULT_BODY);
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
              ref={(el) => {
                (bodyRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                textareaRef.current = el;
              }}
              placeholder="Your message..."
              style={{ minHeight: '80px', maxHeight: '480px', overflowY: 'hidden' }}
              className="resize-none font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <PlaceholderDropdown onInsert={handleInsertPlaceholder} />
          <div className="flex gap-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
