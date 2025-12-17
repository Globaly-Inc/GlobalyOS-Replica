import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  Bell,
  BellOff,
  Calendar,
  User,
  Building2,
  Briefcase,
  Users,
  ArrowLeft,
  Trash2,
  Sparkles
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useKpiDetail, useAddKpiUpdate, useSaveKpiUpdateSettings, useDeleteKpiUpdate } from '@/services/useKpiUpdates';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { OrgLink } from '@/components/OrgLink';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import type { KpiStatus, KpiReminderFrequency } from '@/types';

const statusColors: Record<KpiStatus, string> = {
  on_track: 'bg-green-100 text-green-800 border-green-200',
  at_risk: 'bg-amber-100 text-amber-800 border-amber-200',
  behind: 'bg-red-100 text-red-800 border-red-200',
  achieved: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
};

const statusLabels: Record<KpiStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  behind: 'Behind',
  achieved: 'Achieved',
  completed: 'Completed',
};

const KpiDetail = () => {
  const { kpiId } = useParams<{ kpiId: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { data: currentEmployee } = useCurrentEmployee();
  const { isAdmin, isHR } = useUserRole();
  
  const { data: kpi, isLoading } = useKpiDetail(kpiId);
  const addUpdate = useAddKpiUpdate();
  const saveSettings = useSaveKpiUpdateSettings();
  const deleteUpdate = useDeleteKpiUpdate();

  // Form state
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState<KpiStatus | ''>('');
  
  // Reminder settings state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [frequency, setFrequency] = useState<KpiReminderFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  
  // Timeline expansion
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  // Initialize settings from KPI data
  useEffect(() => {
    if (kpi?.update_settings) {
      const settings = kpi.update_settings;
      setReminderEnabled(settings.is_enabled);
      setFrequency(settings.frequency);
      setDayOfWeek(settings.day_of_week ?? 1);
      setDayOfMonth(settings.day_of_month ?? 1);
      setReminderTime(settings.reminder_time?.slice(0, 5) || '09:00');
    }
  }, [kpi?.update_settings]);

  // Check if user can edit this KPI
  const canEdit = () => {
    if (!kpi || !currentEmployee) return false;
    if (isAdmin || isHR) return true;
    
    // Own individual KPI
    if (kpi.employee_id === currentEmployee.id) return true;
    
    // Group KPI membership
    if (kpi.scope_type === 'department' && kpi.scope_department === currentEmployee.department) return true;
    if (kpi.scope_type === 'office' && kpi.scope_office_id === currentEmployee.office_id) return true;
    
    return false;
  };

  const handleSubmitUpdate = async () => {
    if (!kpi || !newValue || !notes.trim()) return;

    await addUpdate.mutateAsync({
      kpiId: kpi.id,
      previousValue: kpi.current_value,
      newValue: parseFloat(newValue),
      notes: notes.trim(),
      statusBefore: kpi.status,
      statusAfter: newStatus || kpi.status,
    });

    setNewValue('');
    setNotes('');
    setNewStatus('');
    setShowUpdateForm(false);
  };

  const handleSaveReminderSettings = async () => {
    if (!kpi) return;

    await saveSettings.mutateAsync({
      kpiId: kpi.id,
      frequency,
      dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : null,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
      reminderTime,
      isEnabled: reminderEnabled,
    });
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!kpi) return;
    await deleteUpdate.mutateAsync({ updateId, kpiId: kpi.id });
  };

  const progress = kpi?.target_value && kpi?.current_value 
    ? Math.min(100, Math.round((kpi.current_value / kpi.target_value) * 100))
    : 0;

  const displayedUpdates = showAllUpdates 
    ? kpi?.updates || [] 
    : (kpi?.updates || []).slice(0, 5);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!kpi) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">KPI not found</p>
          <Button variant="link" onClick={() => navigateOrg('/kpi-dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const getScopeIcon = () => {
    switch (kpi.scope_type) {
      case 'department': return <Users className="h-4 w-4" />;
      case 'office': return <Building2 className="h-4 w-4" />;
      case 'project': return <Briefcase className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getScopeName = () => {
    if (kpi.scope_type === 'individual' && kpi.employee) {
      return kpi.employee.profiles.full_name;
    }
    if (kpi.scope_type === 'department') return kpi.scope_department;
    if (kpi.scope_type === 'office') return 'Office KPI';
    if (kpi.scope_type === 'project') return 'Project KPI';
    return 'Unknown';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back Navigation */}
        <OrgLink to="/kpi-dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to KPI Dashboard
        </OrgLink>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={statusColors[kpi.status]}>
                {statusLabels[kpi.status]}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                {getScopeIcon()}
                {kpi.scope_type === 'individual' ? 'Individual' : kpi.scope_type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Q{kpi.quarter} {kpi.year}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{kpi.title}</h1>
            {kpi.description && (
              <p className="text-muted-foreground">{kpi.description}</p>
            )}
          </div>
          
          {canEdit() && (
            <Button onClick={() => setShowUpdateForm(!showUpdateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Update
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Progress
                  </h3>
                  <span className="text-2xl font-bold">{progress}%</span>
                </div>
                
                <Progress value={progress} className="h-3" />
                
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Current: </span>
                    <span className="font-medium">
                      {kpi.current_value ?? 0} {kpi.unit || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target: </span>
                    <span className="font-medium">
                      {kpi.target_value ?? 0} {kpi.unit || ''}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Add Update Form */}
            {showUpdateForm && canEdit() && (
              <Card className="p-6 border-primary/20 bg-primary/5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Add Progress Update
                </h3>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newValue">New Value</Label>
                      <Input
                        id="newValue"
                        type="number"
                        placeholder={`Current: ${kpi.current_value ?? 0}`}
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={newStatus} onValueChange={(v) => setNewStatus(v as KpiStatus)}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Keep current: ${statusLabels[kpi.status]}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (required)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Describe what you did to achieve this progress..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowUpdateForm(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmitUpdate}
                      disabled={!newValue || !notes.trim() || addUpdate.isPending}
                    >
                      {addUpdate.isPending ? 'Saving...' : 'Save Update'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Updates Timeline */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Update History
                {kpi.updates && kpi.updates.length > 0 && (
                  <Badge variant="secondary">{kpi.updates.length}</Badge>
                )}
              </h3>
              
              {displayedUpdates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No updates yet. Add your first progress update above.
                </p>
              ) : (
                <div className="space-y-4">
                  {displayedUpdates.map((update, index) => (
                    <div key={update.id} className="relative">
                      {index < displayedUpdates.length - 1 && (
                        <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
                      )}
                      <div className="flex gap-4">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={update.employee?.profiles.avatar_url || undefined} />
                          <AvatarFallback>
                            {update.employee?.profiles.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-medium">
                                {update.employee?.profiles.full_name || 'Unknown'}
                              </span>
                              <span className="text-muted-foreground text-sm ml-2">
                                {formatDistanceToNow(parseISO(update.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {canEdit() && update.employee?.id === currentEmployee?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteUpdate(update.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="mt-1 flex flex-wrap gap-2 text-sm">
                            {update.previous_value !== null && update.new_value !== null && (
                              <Badge variant="outline" className="bg-background">
                                {update.previous_value} → {update.new_value} {kpi.unit || ''}
                              </Badge>
                            )}
                            {update.status_before !== update.status_after && update.status_after && (
                              <Badge variant="outline" className={statusColors[update.status_after as KpiStatus]}>
                                {statusLabels[update.status_after as KpiStatus]}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="mt-2 text-sm text-muted-foreground">
                            {update.notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {kpi.updates && kpi.updates.length > 5 && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowAllUpdates(!showAllUpdates)}
                    >
                      {showAllUpdates ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show All ({kpi.updates.length} updates)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-medium flex items-center gap-1">
                    {getScopeIcon()}
                    {getScopeName()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(parseISO(kpi.created_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{format(parseISO(kpi.updated_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Updates</span>
                  <span>{kpi.updates?.length || 0}</span>
                </div>
              </div>
            </Card>

            {/* Reminder Settings */}
            {canEdit() && (
              <Card className="p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowReminderSettings(!showReminderSettings)}
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    {reminderEnabled ? (
                      <Bell className="h-5 w-5 text-primary" />
                    ) : (
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    Update Reminders
                  </h3>
                  {showReminderSettings ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                {showReminderSettings && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reminder-enabled">Enable Reminders</Label>
                      <Switch
                        id="reminder-enabled"
                        checked={reminderEnabled}
                        onCheckedChange={setReminderEnabled}
                      />
                    </div>
                    
                    {reminderEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select value={frequency} onValueChange={(v) => setFrequency(v as KpiReminderFrequency)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {(frequency === 'weekly' || frequency === 'biweekly') && (
                          <div className="space-y-2">
                            <Label>Day of Week</Label>
                            <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {frequency === 'monthly' && (
                          <div className="space-y-2">
                            <Label>Day of Month</Label>
                            <Select value={dayOfMonth.toString()} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 28 }, (_, i) => (
                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    {i + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Reminder Time</Label>
                          <Input
                            type="time"
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    
                    <Button 
                      className="w-full" 
                      onClick={handleSaveReminderSettings}
                      disabled={saveSettings.isPending}
                    >
                      {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
                    </Button>
                    
                    {kpi.update_settings?.next_reminder_at && reminderEnabled && (
                      <p className="text-xs text-muted-foreground text-center">
                        Next reminder: {format(parseISO(kpi.update_settings.next_reminder_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KpiDetail;
