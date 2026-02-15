import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Send, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useOrganization } from '@/hooks/useOrganization';

interface ShareVacancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancy: {
    id: string;
    title: string;
    slug?: string | null;
    department?: { name: string } | null;
    location?: string | null;
    employment_type?: string | null;
    work_model?: string | null;
    office?: { name: string; city: string | null } | null;
  };
}

export const ShareVacancyDialog = ({ open, onOpenChange, vacancy }: ShareVacancyDialogProps) => {
  const { data: employee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const vacancySlug = vacancy.slug || vacancy.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const publicLink = `https://globalyos.com/careers/${currentOrg?.slug || ''}/${vacancySlug}`;
  const referrerName = employee?.profiles?.full_name || 'A team member';
  const companyName = currentOrg?.name || 'our company';
  const locationLabel = vacancy.office?.city || vacancy.office?.name || vacancy.location || '';
  const workModel = vacancy.work_model ? vacancy.work_model.charAt(0).toUpperCase() + vacancy.work_model.slice(1) : '';
  const employmentLabel = vacancy.employment_type ? vacancy.employment_type.replace(/_/g, '-') : '';

  const sharingText = `Hey! 👋\n\nI'm excited to share that my team at ${companyName} is hiring a ${vacancy.title}${locationLabel ? ` based in ${locationLabel}` : ''}${workModel ? ` (${workModel})` : ''}. ${employmentLabel ? `It's a ${employmentLabel} role. ` : ''}\n\nWe're building something truly special here, and this is an incredible opportunity to be part of it. If you or someone you know would be a great fit, I'd love for them to check it out!\n\n👉 Apply here: ${publicLink}\n\nFeel free to reach out to me directly if you have any questions — happy to share more about what it's like working here.\n\n— ${referrerName} at ${companyName}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sharingText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSendReferral = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!currentOrg?.id || !employee?.id) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-referral-email', {
        body: {
          organization_id: currentOrg.id,
          job_id: vacancy.id,
          job_title: vacancy.title,
          referrer_employee_id: employee.id,
          referrer_name: referrerName,
          candidate_email: email.trim(),
          public_link: publicLink,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Referral email sent!');
      setEmail('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send referral');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share: {vacancy.title}</DialogTitle>
          <DialogDescription>
            Share this position with your network or refer a candidate directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Copy sharing content */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Sharing Content</Label>
            <Textarea
              value={sharingText}
              readOnly
              rows={5}
              className="bg-muted text-sm resize-none"
            />
            <Button variant="outline" size="sm" className="w-full" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Email referral */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Refer via Email</Label>
            <p className="text-xs text-muted-foreground">
              Send a referral email on your behalf to a prospective candidate.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="candidate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReferral()}
                disabled={sending}
                className="flex-1"
              />
              <Button onClick={handleSendReferral} disabled={sending || !email.trim()} size="default">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
