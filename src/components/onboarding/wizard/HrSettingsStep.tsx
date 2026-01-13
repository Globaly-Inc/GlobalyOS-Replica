/**
 * Organization Onboarding - HR Settings Step
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Settings2 } from 'lucide-react';

interface HrSettingsStepProps {
  initialSettings?: {
    work_week_days?: string[];
    working_hours_per_day?: number;
    default_leave_policy?: string;
    default_onboarding_workflow?: string;
  };
  onSave: (settings: Record<string, unknown>) => void;
  onBack: () => void;
  isSaving: boolean;
}

const DAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

export function HrSettingsStep({ initialSettings, onSave, onBack, isSaving }: HrSettingsStepProps) {
  const [settings, setSettings] = useState({
    work_week_days: initialSettings?.work_week_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    working_hours_per_day: initialSettings?.working_hours_per_day || 8,
  });

  const toggleDay = (dayId: string) => {
    const days = settings.work_week_days.includes(dayId)
      ? settings.work_week_days.filter(d => d !== dayId)
      : [...settings.work_week_days, dayId];
    setSettings({ ...settings, work_week_days: days });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Settings2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">HR Settings</CardTitle>
        <CardDescription>
          Configure basic work settings. You can customize these later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Work Week Days</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleDay(day.id)}
                >
                  <Checkbox checked={settings.work_week_days.includes(day.id)} />
                  <span className="text-sm">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working Hours Per Day</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={settings.working_hours_per_day}
              onChange={(e) => setSettings({ ...settings, working_hours_per_day: Number(e.target.value) })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
