import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Loader2, Monitor, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { EmailBuilder } from '@/components/campaigns/EmailBuilder';
import { useCampaign, useUpdateCampaign } from '@/services/useCampaigns';
import { renderEmailHtml } from '@/components/campaigns/HtmlRenderer';
import type { EmailBuilderState } from '@/types/campaigns';
import { DEFAULT_BUILDER_STATE } from '@/types/campaigns';

export default function CampaignBuilderPage() {
  const { id, orgCode } = useParams<{ id: string; orgCode: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading } = useCampaign(id);
  const updateMutation = useUpdateCampaign();

  const [builderState, setBuilderState] = useState<EmailBuilderState>(DEFAULT_BUILDER_STATE);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load content from campaign
  useEffect(() => {
    if (campaign?.content_json) {
      setBuilderState(campaign.content_json as EmailBuilderState);
    }
  }, [campaign?.id]);

  // Auto-save with 1.5s debounce
  const handleChange = useCallback((newState: EmailBuilderState) => {
    setBuilderState(newState);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!id) return;
      try {
        await updateMutation.mutateAsync({
          id,
          content_json: newState as any,
        });
        setLastSaved(new Date());
      } catch {
        // silent — user can manually save
      }
    }, 1500);
  }, [id, updateMutation]);

  const handleManualSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ id, content_json: builderState as any });
      setLastSaved(new Date());
      toast.success('Email saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const previewHtml = renderEmailHtml(builderState, true);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate(`/org/${orgCode}/crm/campaigns/${id}`)}
            className="gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {campaign?.name ?? 'Campaign'}
          </Button>
          {lastSaved && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          <Button size="sm" className="gap-1.5 h-8" onClick={handleManualSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Builder */}
      <div className="flex-1 overflow-hidden">
        <EmailBuilder state={builderState} onChange={handleChange} />
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-auto p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Email Preview</span>
          </div>
          <div className="overflow-auto">
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ height: '70vh' }}
              title="Email preview"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
