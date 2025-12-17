import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Clock, Bell, Eye, AlarmClockOff } from 'lucide-react';
import { usePendingKpiUpdates, useSnoozeKpiReminder, useAddKpiUpdate } from '@/services/useKpiUpdates';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import type { KpiStatus } from '@/types';

const statusLabels: Record<KpiStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  behind: 'Behind',
  achieved: 'Achieved',
  completed: 'Completed',
};

const statusColors: Record<KpiStatus, string> = {
  on_track: 'bg-green-100 text-green-800',
  at_risk: 'bg-amber-100 text-amber-800',
  behind: 'bg-red-100 text-red-800',
  achieved: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
};

export const PendingKpiUpdates = () => {
  const { data: pendingUpdates, isLoading } = usePendingKpiUpdates();
  const snoozeReminder = useSnoozeKpiReminder();
  const addUpdate = useAddKpiUpdate();
  const { navigateOrg } = useOrgNavigation();

  const [updateDialog, setUpdateDialog] = useState<{ open: boolean; kpi: any | null }>({ open: false, kpi: null });
  const [newValue, setNewValue] = useState('');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState<KpiStatus | ''>('');

  if (isLoading || !pendingUpdates || pendingUpdates.length === 0) {
    return null;
  }

  const handleSnooze = async (kpiId: string) => {
    await snoozeReminder.mutateAsync({ kpiId, hours: 24 });
  };

  const handleQuickUpdate = async () => {
    if (!updateDialog.kpi || !newValue || !notes.trim()) return;
    const kpi = updateDialog.kpi;
    await addUpdate.mutateAsync({
      kpiId: kpi.id,
      previousValue: kpi.current_value,
      newValue: parseFloat(newValue),
      notes: notes.trim(),
      statusBefore: kpi.status,
      statusAfter: newStatus || kpi.status,
    });
    setUpdateDialog({ open: false, kpi: null });
    setNewValue('');
    setNotes('');
    setNewStatus('');
  };

  return (
    <>
      <Card className="p-6 border-amber-200 bg-amber-50/50">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Bell className="h-5 w-5 text-amber-600" />
          KPI Updates Due
          <Badge variant="secondary" className="ml-2">{pendingUpdates.length}</Badge>
        </h3>
        <div className="space-y-4">
          {pendingUpdates.map((item: any) => {
            const kpi = item.kpi;
            const progress = kpi.target_value && kpi.current_value
              ? Math.min(100, Math.round((kpi.current_value / kpi.target_value) * 100))
              : 0;
            return (
              <div key={item.id} className="rounded-lg bg-background p-4 shadow-sm border">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{kpi.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={statusColors[kpi.status as KpiStatus]}>
                          {statusLabels[kpi.status as KpiStatus]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {kpi.current_value ?? 0} / {kpi.target_value ?? 0} {kpi.unit || ''}
                        </span>
                      </div>
                    </div>
                    <Target className="h-5 w-5 text-amber-600 shrink-0" />
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setUpdateDialog({ open: true, kpi })}>
                      <Clock className="mr-1 h-3 w-3" />
                      Update Now
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSnooze(kpi.id)} disabled={snoozeReminder.isPending}>
                      <AlarmClockOff className="mr-1 h-3 w-3" />
                      Later
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigateOrg(`/kpi/${kpi.id}`)}>
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={updateDialog.open} onOpenChange={(open) => setUpdateDialog({ open, kpi: updateDialog.kpi })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick KPI Update</DialogTitle>
          </DialogHeader>
          {updateDialog.kpi && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{updateDialog.kpi.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Current: {updateDialog.kpi.current_value ?? 0} / {updateDialog.kpi.target_value ?? 0} {updateDialog.kpi.unit || ''}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>New Value</Label>
                  <Input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as KpiStatus)}>
                    <SelectTrigger><SelectValue placeholder="Keep current" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (required)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialog({ open: false, kpi: null })}>Cancel</Button>
            <Button onClick={handleQuickUpdate} disabled={!newValue || !notes.trim() || addUpdate.isPending}>
              {addUpdate.isPending ? 'Saving...' : 'Save Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
