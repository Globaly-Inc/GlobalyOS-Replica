import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WaTemplate } from '@/types/whatsapp';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template?: WaTemplate | null;
  onSave: (data: {
    name: string;
    category: string;
    language: string;
    components: unknown[];
  }) => void;
  isSaving: boolean;
}

const categories = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'utility', label: 'Utility' },
  { value: 'authentication', label: 'Authentication' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt_BR', label: 'Portuguese (BR)' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
];

export default function TemplateEditorDialog({ open, onOpenChange, template, onSave, isSaving }: Props) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState<string>(template?.category || 'utility');
  const [language, setLanguage] = useState(template?.language || 'en');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');

  // Parse existing components on open
  useState(() => {
    if (template?.components) {
      const comps = template.components as any[];
      const header = comps.find((c: any) => c.type === 'HEADER');
      const body = comps.find((c: any) => c.type === 'BODY');
      const footer = comps.find((c: any) => c.type === 'FOOTER');
      if (header?.text) setHeaderText(header.text);
      if (body?.text) setBodyText(body.text);
      if (footer?.text) setFooterText(footer.text);
    }
  });

  const handleSave = () => {
    const components: unknown[] = [];
    if (headerText.trim()) {
      components.push({ type: 'HEADER', format: 'TEXT', text: headerText.trim() });
    }
    if (bodyText.trim()) {
      components.push({ type: 'BODY', text: bodyText.trim() });
    }
    if (footerText.trim()) {
      components.push({ type: 'FOOTER', text: footerText.trim() });
    }
    onSave({ name, category, language, components });
  };

  // Extract variables from body text
  const variables = bodyText.match(/\{\{\d+\}\}/g) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="e.g. welcome_message"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Lowercase, underscores only</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Header (optional)</Label>
              <Input
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="Header text"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Body</Label>
              <Textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Hello {{1}}, your order {{2}} is confirmed!"
                className="mt-1 min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{{1}}'}, {'{{2}}'}, etc. for variables
              </p>
            </div>

            <div>
              <Label>Footer (optional)</Label>
              <Input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Reply STOP to unsubscribe"
                className="mt-1"
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <Label className="mb-2 block">Preview</Label>
            <div className="bg-muted/50 rounded-xl p-4 min-h-[300px]">
              <div className="bg-card rounded-lg p-3 shadow-sm max-w-[260px] border border-border">
                {headerText && (
                  <p className="text-sm font-semibold text-foreground mb-1">{headerText}</p>
                )}
                {bodyText ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{bodyText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Message body</p>
                )}
                {footerText && (
                  <p className="text-xs text-muted-foreground mt-2">{footerText}</p>
                )}
              </div>

              {variables.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Variables ({variables.length})</p>
                  <div className="space-y-1">
                    {variables.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{v}</span>
                        <span className="text-muted-foreground">— Variable {i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name || !bodyText.trim() || isSaving}>
            {isSaving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
