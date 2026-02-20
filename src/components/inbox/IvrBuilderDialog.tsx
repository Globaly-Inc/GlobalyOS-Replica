import { useState, useEffect } from 'react';
import { useUpdateIvrConfig } from '@/hooks/useTelephony';
import type { OrgPhoneNumber } from '@/hooks/useTelephony';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface MenuOption {
  digit: string;
  label: string;
  action: string;
  message?: string;
}

interface IvrConfig {
  greeting?: string;
  menu_options?: MenuOption[];
  voicemail_enabled?: boolean;
}

interface IvrBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: OrgPhoneNumber;
}

export function IvrBuilderDialog({ open, onOpenChange, phoneNumber }: IvrBuilderDialogProps) {
  const updateIvr = useUpdateIvrConfig();

  const existing = (phoneNumber.ivr_config || {}) as IvrConfig;
  const [greeting, setGreeting] = useState(existing.greeting || '');
  const [voicemailEnabled, setVoicemailEnabled] = useState(existing.voicemail_enabled !== false);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>(existing.menu_options || []);

  useEffect(() => {
    const cfg = (phoneNumber.ivr_config || {}) as IvrConfig;
    setGreeting(cfg.greeting || '');
    setVoicemailEnabled(cfg.voicemail_enabled !== false);
    setMenuOptions(cfg.menu_options || []);
  }, [phoneNumber.id]);

  const addOption = () => {
    const nextDigit = String(menuOptions.length + 1);
    setMenuOptions([...menuOptions, { digit: nextDigit, label: '', action: 'message', message: '' }]);
  };

  const removeOption = (idx: number) => {
    setMenuOptions(menuOptions.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, updates: Partial<MenuOption>) => {
    setMenuOptions(menuOptions.map((opt, i) => (i === idx ? { ...opt, ...updates } : opt)));
  };

  const handleSave = async () => {
    await updateIvr.mutateAsync({
      id: phoneNumber.id,
      ivr_config: {
        greeting,
        voicemail_enabled: voicemailEnabled,
        menu_options: menuOptions.filter((o) => o.label.trim()),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>IVR Configuration</DialogTitle>
          <DialogDescription>
            Configure the phone menu for <span className="font-mono">{phoneNumber.phone_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Greeting */}
          <div className="space-y-2">
            <Label>Greeting Message</Label>
            <Textarea
              placeholder="Thank you for calling Acme Corp. Please listen to the following options."
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This text will be spoken to callers using text-to-speech.
            </p>
          </div>

          {/* Voicemail */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Voicemail</Label>
              <p className="text-xs text-muted-foreground">Allow callers to leave a voicemail</p>
            </div>
            <Switch checked={voicemailEnabled} onCheckedChange={setVoicemailEnabled} />
          </div>

          {/* Menu Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Menu Options</Label>
              <Button variant="outline" size="sm" onClick={addOption} disabled={menuOptions.length >= 9}>
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
            </div>

            {menuOptions.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No menu options. Callers will hear the greeting and be offered voicemail.
              </p>
            )}

            {menuOptions.map((opt, idx) => (
              <div key={idx} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Press</span>
                    <Input
                      value={opt.digit}
                      onChange={(e) => updateOption(idx, { digit: e.target.value.slice(0, 1) })}
                      className="w-10 text-center text-sm"
                    />
                  </div>
                  <Input
                    placeholder="e.g. Sales, Support"
                    value={opt.label}
                    onChange={(e) => updateOption(idx, { label: e.target.value })}
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeOption(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select value={opt.action} onValueChange={(v) => updateOption(idx, { action: v })}>
                    <SelectTrigger className="w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">Play Message</SelectItem>
                      <SelectItem value="voicemail">Go to Voicemail</SelectItem>
                    </SelectContent>
                  </Select>
                  {opt.action === 'message' && (
                    <Input
                      placeholder="Message to play..."
                      value={opt.message || ''}
                      onChange={(e) => updateOption(idx, { message: e.target.value })}
                      className="flex-1 text-xs"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateIvr.isPending}>
            {updateIvr.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
