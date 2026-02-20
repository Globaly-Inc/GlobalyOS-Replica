import { useState } from 'react';
import { Copy, Check, ExternalLink, Code2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Form } from '@/types/forms';

interface ShareFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Form | null;
  orgCode: string;
}

export function ShareFormDialog({ open, onOpenChange, form, orgCode }: ShareFormDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!form) return null;

  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/f/${orgCode}/${form.slug}`;
  const iframeSnippet = `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border:none;"></iframe>`;
  const responsiveSnippet = `<div style="position:relative;padding-bottom:75%;height:0;overflow:hidden;">
  <iframe src="${publicUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" frameborder="0"></iframe>
</div>`;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  }

  const isPublished = form.status === 'published';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Form</DialogTitle>
          <DialogDescription>Share your form via link or embed it on your website.</DialogDescription>
        </DialogHeader>

        {!isPublished && (
          <div className="bg-accent border border-border rounded-lg p-3 text-sm text-foreground">
            This form is not published yet. Publish it first to make it available via the public link.
          </div>
        )}

        <Tabs defaultValue="link">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="link" className="text-xs">Link</TabsTrigger>
            <TabsTrigger value="iframe" className="text-xs">Embed</TabsTrigger>
            <TabsTrigger value="responsive" className="text-xs">Responsive</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Public URL</Label>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly className="text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(publicUrl, 'link')}>
                  {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                {isPublished && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="iframe" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">iFrame Embed Code</Label>
              <Textarea value={iframeSnippet} readOnly rows={3} className="text-xs font-mono" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(iframeSnippet, 'iframe')}>
                {copied === 'iframe' ? <Check className="h-4 w-4 mr-1" /> : <Code2 className="h-4 w-4 mr-1" />}
                Copy Code
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="responsive" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Responsive Embed Code</Label>
              <Textarea value={responsiveSnippet} readOnly rows={5} className="text-xs font-mono" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(responsiveSnippet, 'responsive')}>
                {copied === 'responsive' ? <Check className="h-4 w-4 mr-1" /> : <Code2 className="h-4 w-4 mr-1" />}
                Copy Code
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
