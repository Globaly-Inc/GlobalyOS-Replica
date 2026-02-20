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
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

interface MenuOption {
  digit: string;
  label: string;
  action: string;
  message?: string;
}

interface BusinessHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
  after_hours_greeting: string;
}

interface IvrConfig {
  greeting?: string;
  menu_options?: MenuOption[];
  voicemail_enabled?: boolean;
  business_hours?: BusinessHours;
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
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    existing.business_hours || {
      enabled: false,
      start: '09:00',
      end: '17:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      after_hours_greeting: 'We are currently closed. Please leave a message after the beep.',
    }
  );
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    const cfg = (phoneNumber.ivr_config || {}) as IvrConfig;
    setGreeting(cfg.greeting || '');
    setVoicemailEnabled(cfg.voicemail_enabled !== false);
    setMenuOptions(cfg.menu_options || []);
    setBusinessHours(
      cfg.business_hours || {
        enabled: false,
        start: '09:00',
        end: '17:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        after_hours_greeting: 'We are currently closed. Please leave a message after the beep.',
      }
    );
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
        business_hours: businessHours,
      },
    });
    onOpenChange(false);
  };

  const handlePreview = () => {
    if (!greeting && menuOptions.length === 0) {
      toast.info('Add a greeting or menu options first');
      return;
    }
    setIsPreviewing(true);
    const fullText = [
      greeting || 'Thank you for calling.',
      ...menuOptions.filter(o => o.label).map(o => `Press ${o.digit} for ${o.label}.`),
    ].join(' ');

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = 0.9;
    utterance.onend = () => setIsPreviewing(false);
    utterance.onerror = () => setIsPreviewing(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stopPreview = () => {
    window.speechSynthesis.cancel();
    setIsPreviewing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopPreview(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>IVR Configuration</DialogTitle>
          <DialogDescription>
            Configure the phone menu for <span className="font-mono">{phoneNumber.phone_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Greeting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Greeting Message</Label>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={isPreviewing ? stopPreview : handlePreview}
              >
                <Volume2 className="h-3 w-3 mr-1" />
                {isPreviewing ? 'Stop' : 'Preview'}
              </Button>
            </div>
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

          <Separator />

          {/* Business Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Business Hours</Label>
                <p className="text-xs text-muted-foreground">Play a different greeting outside office hours</p>
              </div>
              <Switch
                checked={businessHours.enabled}
                onCheckedChange={(enabled) => setBusinessHours({ ...businessHours, enabled })}
              />
            </div>

            {businessHours.enabled && (
              <div className="space-y-3 pl-1">
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Opens at</Label>
                    <Input
                      type="time"
                      value={businessHours.start}
                      onChange={(e) => setBusinessHours({ ...businessHours, start: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Closes at</Label>
                    <Input
                      type="time"
                      value={businessHours.end}
                      onChange={(e) => setBusinessHours({ ...businessHours, end: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">After-hours Greeting</Label>
                  <Textarea
                    placeholder="We are currently closed. Please leave a message..."
                    value={businessHours.after_hours_greeting}
                    onChange={(e) => setBusinessHours({ ...businessHours, after_hours_greeting: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

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
                    <SelectTrigger className="w-[160px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">Play Message</SelectItem>
                      <SelectItem value="voicemail">Go to Voicemail</SelectItem>
                      <SelectItem value="forward">Forward to Agent</SelectItem>
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
                  {opt.action === 'forward' && (
                    <Input
                      placeholder="Phone number to forward to..."
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
          <Button variant="outline" onClick={() => { stopPreview(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateIvr.isPending}>
            {updateIvr.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
