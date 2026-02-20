import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormTheme } from '@/types/forms';

interface ThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: FormTheme;
  onThemeChange: (theme: FormTheme) => void;
}

export function ThemeDialog({ open, onOpenChange, theme, onThemeChange }: ThemeDialogProps) {
  function update(key: keyof FormTheme, value: string | number) {
    onThemeChange({ ...theme, [key]: value });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Form Theme</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.backgroundColor || '#ffffff'}
                  onChange={(e) => update('backgroundColor', e.target.value)}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={theme.backgroundColor || '#ffffff'}
                  onChange={(e) => update('backgroundColor', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Form Background</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.formBackgroundColor || '#ffffff'}
                  onChange={(e) => update('formBackgroundColor', e.target.value)}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={theme.formBackgroundColor || '#ffffff'}
                  onChange={(e) => update('formBackgroundColor', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.primaryColor || '#3b82f6'}
                  onChange={(e) => update('primaryColor', e.target.value)}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={theme.primaryColor || '#3b82f6'}
                  onChange={(e) => update('primaryColor', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.textColor || '#1f2937'}
                  onChange={(e) => update('textColor', e.target.value)}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={theme.textColor || '#1f2937'}
                  onChange={(e) => update('textColor', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Button Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.buttonColor || '#3b82f6'}
                  onChange={(e) => update('buttonColor', e.target.value)}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={theme.buttonColor || '#3b82f6'}
                  onChange={(e) => update('buttonColor', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Button Text</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.buttonTextColor || '#ffffff'}
                  onChange={(e) => update('buttonTextColor', e.target.value)}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={theme.buttonTextColor || '#ffffff'}
                  onChange={(e) => update('buttonTextColor', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Border Radius (px)</Label>
            <Input
              type="number"
              min={0}
              max={24}
              value={theme.borderRadius ?? 8}
              onChange={(e) => update('borderRadius', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Font Family</Label>
            <Input
              value={theme.fontFamily || ''}
              onChange={(e) => update('fontFamily', e.target.value)}
              placeholder="Inter, sans-serif"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
