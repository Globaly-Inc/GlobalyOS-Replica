import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock, Globe, Users, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { Office, OfficeSchedule } from '@/pages/ManageOffices';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kathmandu', label: 'Nepal (UTC+5:45)' },
  { value: 'Asia/Kolkata', label: 'India (UTC+5:30)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/11)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (UTC+10/11)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'Europe/London', label: 'London (UTC+0/1)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/2)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
];

interface OfficeScheduleCardProps {
  office: Office;
}

export const OfficeScheduleCard = ({ office }: OfficeScheduleCardProps) => {
  const { currentOrg } = useOrganization();
  const [schedule, setSchedule] = useState<OfficeSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [employeesWithoutSchedule, setEmployeesWithoutSchedule] = useState(0);

  const [formData, setFormData] = useState({
    work_start_time: '09:00',
    work_end_time: '17:00',
    late_threshold_minutes: 15,
    timezone: 'UTC',
  });

  useEffect(() => {
    loadSchedule();
    loadEmployeesWithoutSchedule();
  }, [office.id]);

  const loadSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('office_schedules')
      .select('*')
      .eq('office_id', office.id)
      .maybeSingle();

    if (data) {
      setSchedule(data);
      setFormData({
        work_start_time: data.work_start_time?.slice(0, 5) || '09:00',
        work_end_time: data.work_end_time?.slice(0, 5) || '17:00',
        late_threshold_minutes: data.late_threshold_minutes || 15,
        timezone: data.timezone || 'UTC',
      });
    }
    setLoading(false);
  };

  const loadEmployeesWithoutSchedule = async () => {
    if (!currentOrg?.id) return;

    // Get employees in this office
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('office_id', office.id)
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active');

    if (!employees?.length) {
      setEmployeesWithoutSchedule(0);
      return;
    }

    const employeeIds = employees.map(e => e.id);

    // Get employees who have schedules
    const { data: schedules } = await supabase
      .from('employee_schedules')
      .select('employee_id')
      .in('employee_id', employeeIds);

    const withSchedule = new Set(schedules?.map(s => s.employee_id) || []);
    const withoutCount = employeeIds.filter(id => !withSchedule.has(id)).length;
    setEmployeesWithoutSchedule(withoutCount);
  };

  const handleSave = async () => {
    if (!currentOrg?.id) return;
    setSaving(true);

    const scheduleData = {
      office_id: office.id,
      organization_id: currentOrg.id,
      work_start_time: formData.work_start_time + ':00',
      work_end_time: formData.work_end_time + ':00',
      late_threshold_minutes: formData.late_threshold_minutes,
      timezone: formData.timezone,
    };

    let error;
    if (schedule) {
      const result = await supabase
        .from('office_schedules')
        .update(scheduleData)
        .eq('id', schedule.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('office_schedules')
        .insert(scheduleData)
        .select()
        .single();
      error = result.error;
      if (result.data) setSchedule(result.data);
    }

    setSaving(false);

    if (error) {
      toast.error('Failed to save schedule');
      console.error('Error saving schedule:', error);
      return;
    }

    toast.success('Schedule saved');
    loadSchedule();
  };

  const handleApplyToTeam = async () => {
    if (!currentOrg?.id) return;
    setApplying(true);

    // Get employees in this office without schedules
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('office_id', office.id)
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active');

    if (!employees?.length) {
      toast.info('No employees in this office');
      setApplying(false);
      setApplyDialogOpen(false);
      return;
    }

    const employeeIds = employees.map(e => e.id);

    // Get employees who already have schedules
    const { data: existingSchedules } = await supabase
      .from('employee_schedules')
      .select('employee_id')
      .in('employee_id', employeeIds);

    const withSchedule = new Set(existingSchedules?.map(s => s.employee_id) || []);
    const toCreate = employeeIds.filter(id => !withSchedule.has(id));

    if (toCreate.length === 0) {
      toast.info('All employees already have schedules');
      setApplying(false);
      setApplyDialogOpen(false);
      return;
    }

    // Create schedules for employees without one
    const schedulesToInsert = toCreate.map(employeeId => ({
      employee_id: employeeId,
      organization_id: currentOrg.id,
      work_start_time: formData.work_start_time + ':00',
      work_end_time: formData.work_end_time + ':00',
      late_threshold_minutes: formData.late_threshold_minutes,
      work_location: 'office' as const,
    }));

    const { error } = await supabase
      .from('employee_schedules')
      .insert(schedulesToInsert);

    setApplying(false);
    setApplyDialogOpen(false);

    if (error) {
      toast.error('Failed to apply schedules');
      console.error('Error applying schedules:', error);
      return;
    }

    toast.success(`Schedule applied to ${toCreate.length} employees`);
    loadEmployeesWithoutSchedule();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Default Work Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Default Work Schedule
            </CardTitle>
            {employeesWithoutSchedule > 0 && (
              <Button variant="outline" size="sm" onClick={() => setApplyDialogOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Apply to {employeesWithoutSchedule} team
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Work Start</Label>
              <Input
                type="time"
                value={formData.work_start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, work_start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Work End</Label>
              <Input
                type="time"
                value={formData.work_end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, work_end_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Late Threshold (min)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={formData.late_threshold_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, late_threshold_minutes: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Timezone
              </Label>
              <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Schedule to Team</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply the office schedule to {employeesWithoutSchedule} employees who don't have a work schedule set.
              Employees with existing schedules will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyToTeam} disabled={applying}>
              {applying ? 'Applying...' : `Apply to ${employeesWithoutSchedule} employees`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
