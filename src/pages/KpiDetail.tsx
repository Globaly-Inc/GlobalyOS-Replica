import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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
  CalendarDays,
  User,
  Building2,
  Briefcase,
  Users,
  ArrowLeft,
  Trash2,
  Sparkles,
  Paperclip,
  Pencil,
  Link2
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useKpiDetail, useAddKpiUpdate, useSaveKpiUpdateSettings, useDeleteKpiUpdate } from '@/services/useKpiUpdates';
import { useDeleteKpi, useKpiHierarchy, useLinkKpi, useAvailableParentKpis } from '@/services/useKpi';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { OrgLink } from '@/components/OrgLink';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import type { KpiStatus, KpiReminderFrequency, KpiAttachment, KpiMilestone } from '@/types';
import { 
  KpiAttachmentUpload, 
  KpiAttachmentPreview, 
  KpiMilestoneProgress, 
  KpiCelebration, 
  StaleKpiIndicator, 
  ParentKpiSection, 
  LinkedKpisSection,
  KpiActivityLogs,
  KpiOwnersDisplay
} from '@/components/kpi';
import { LinkedKpiSelector } from '@/components/kpi/LinkedKpiSelector';
import { useKpiOwners, KpiOwner } from '@/services/useKpiOwners';
import { EditKPIDialog } from '@/components/dialogs/EditKPIDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const { isAdmin, isHR, isOwner } = useUserRole();
  
  const { data: kpi, isLoading } = useKpiDetail(kpiId);
  const { data: hierarchy } = useKpiHierarchy(kpiId);
  const { data: kpiOwners = [] } = useKpiOwners(kpiId, kpi?.scope_type);
  const addUpdate = useAddKpiUpdate();
  const saveSettings = useSaveKpiUpdateSettings();
  const deleteUpdate = useDeleteKpiUpdate();
  const deleteKpi = useDeleteKpi();
  const linkKpiMutation = useLinkKpi();
  
  // Available parent KPIs for linking
  const { data: availableParentKpis = [] } = useAvailableParentKpis(
    kpi?.scope_type,
    kpi?.quarter || Math.ceil((new Date().getMonth() + 1) / 3),
    kpi?.year || new Date().getFullYear(),
    kpiId
  );

  // Form state
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState<KpiStatus | ''>('');
  const [attachments, setAttachments] = useState<KpiAttachment[]>([]);
  
  // Edit/Delete dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLinkParent, setShowLinkParent] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  
  // Celebration state
  const [celebrationMilestone, setCelebrationMilestone] = useState<{ percent: number; label: string } | null>(null);
  
  // Reminder settings state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [frequency, setFrequency] = useState<KpiReminderFrequency>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [reminderTime, setReminderTime] = useState('09:00');
  
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

  // Detect changes in reminder settings for smart save button
  const hasReminderChanges = useMemo(() => {
    if (!kpi?.update_settings) return true; // New settings - show save
    const settings = kpi.update_settings;
    return (
      reminderEnabled !== settings.is_enabled ||
      frequency !== settings.frequency ||
      dayOfWeek !== (settings.day_of_week ?? 1) ||
      dayOfMonth !== (settings.day_of_month ?? 1) ||
      reminderTime !== (settings.reminder_time?.slice(0, 5) || '09:00')
    );
  }, [kpi?.update_settings, reminderEnabled, frequency, dayOfWeek, dayOfMonth, reminderTime]);

  // Check if user can edit this KPI (Owner, Admin, Manager for subordinates, Self)
  const canEditKpi = () => {
    if (!kpi || !currentEmployee) return false;
    if (isOwner || isAdmin) return true;
    
    // Own individual KPI
    if (kpi.employee_id === currentEmployee.id) return true;
    
    // Manager can edit subordinates' KPIs - check if KPI owner reports to current user
    if (kpi.employee_id && (kpi.employee as any)?.manager_id === currentEmployee.id) return true;
    
    // Group KPI membership
    if (kpi.scope_type === 'department' && kpi.scope_department === currentEmployee.department) return true;
    if (kpi.scope_type === 'office' && kpi.scope_office_id === currentEmployee.office_id) return true;
    
    return false;
  };

  // Check if user can delete this KPI (Owner, Admin only)
  const canDeleteKpi = () => {
    if (!kpi || !currentEmployee) return false;
    return isOwner || isAdmin;
  };

  // Check if user can add updates (existing logic)
  const canEdit = () => {
    if (!kpi || !currentEmployee) return false;
    if (isAdmin || isHR || isOwner) return true;
    
    // Own individual KPI
    if (kpi.employee_id === currentEmployee.id) return true;
    
    // Group KPI membership
    if (kpi.scope_type === 'department' && kpi.scope_department === currentEmployee.department) return true;
    if (kpi.scope_type === 'office' && kpi.scope_office_id === currentEmployee.office_id) return true;
    
    return false;
  };

  // Check if user can edit KPI owners
  const canEditOwners = () => {
    if (!kpi || !currentEmployee) return false;
    if (isAdmin || isHR || isOwner) return true;
    
    // Manager can edit for subordinates
    if (kpi.employee_id) {
      return canEdit();
    }
    
    return false;
  };

  const handleSubmitUpdate = async () => {
    if (!kpi || !newValue || !notes.trim()) return;

    const result = await addUpdate.mutateAsync({
      kpiId: kpi.id,
      previousValue: kpi.current_value,
      newValue: parseFloat(newValue),
      notes: notes.trim(),
      statusBefore: kpi.status,
      statusAfter: newStatus || kpi.status,
      attachments: attachments,
    });

    // Show celebration if milestone reached
    if (result.milestoneReached) {
      setCelebrationMilestone(result.milestoneReached);
    }

    setNewValue('');
    setNotes('');
    setNewStatus('');
    setAttachments([]);
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

  const handleDeleteKpi = async () => {
    if (!kpi) return;
    await deleteKpi.mutateAsync({ kpiId: kpi.id, kpiTitle: kpi.title });
    navigateOrg('/kpi-dashboard');
  };

  const handleLinkToParent = async () => {
    if (!kpi || !selectedParentId) return;
    const parentKpi = availableParentKpis.find((p: any) => p.id === selectedParentId);
    await linkKpiMutation.mutateAsync({
      kpiId: kpi.id,
      parentKpiId: selectedParentId,
      parentTitle: parentKpi?.title,
    });
    setShowLinkParent(false);
    setSelectedParentId(null);
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

  // Owners are now fetched via useKpiOwners hook

  if (isLoading) {
    return (
      <div className="space-y-6 py-4 md:py-6">
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
    );
  }

  if (!kpi) {
    return (
      <div className="py-4 md:py-6 text-center">
        <p className="text-muted-foreground">KPI not found</p>
        <Button variant="link" onClick={() => navigateOrg('/kpi-dashboard')}>
          Back to Dashboard
        </Button>
      </div>
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
    <div className="space-y-6 py-4 md:py-6">
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
              <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                {kpi.quarter != null ? (
                  <>
                    <CalendarDays className="h-3 w-3" />
                    Q{kpi.quarter} {kpi.year}
                  </>
                ) : (
                  <>
                    <Calendar className="h-3 w-3" />
                    Annual {kpi.year}
                  </>
                )}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{kpi.title}</h1>
            {kpi.description && (
              <p className="text-muted-foreground">{kpi.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {canEditKpi() && (
              <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {canDeleteKpi() && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete KPI</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{kpi.title}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteKpi} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {canEdit() && (
              <Button onClick={() => setShowUpdateForm(!showUpdateForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Update
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stale KPI Warning Banner */}
            <StaleKpiIndicator 
              lastUpdated={kpi.updated_at} 
              frequency={kpi.update_settings?.frequency}
              variant="banner"
            />

            {/* Progress Card with Milestones */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Progress
                  </h3>
                </div>
                
                <KpiMilestoneProgress
                  progress={progress}
                  milestones={kpi.milestones as KpiMilestone[] | undefined}
                  currentValue={kpi.current_value}
                  targetValue={kpi.target_value}
                  unit={kpi.unit}
                />
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

                  {/* Attachments */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments (optional)
                    </Label>
                    <KpiAttachmentUpload
                      attachments={attachments}
                      onChange={setAttachments}
                      organizationId={currentOrg?.id || ''}
                      kpiId={kpi.id}
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
                          
                          {/* Attachments */}
                          <KpiAttachmentPreview attachments={update.attachments || []} />
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

            {/* Parent KPI Section - Moved below Update History */}
            {hierarchy?.parent ? (
              <ParentKpiSection
                parent={hierarchy.parent}
                childKpiId={kpi.id}
                contributionWeight={kpi.child_contribution_weight || 1}
                canEdit={canEditKpi()}
              />
            ) : (
              /* Link to Parent - Show when no parent and not organization scope */
              kpi.scope_type !== 'organization' && canEditKpi() && availableParentKpis.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Link to Parent KPI</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowLinkParent(!showLinkParent)}
                    >
                      {showLinkParent ? 'Cancel' : 'Link'}
                    </Button>
                  </div>
                  {showLinkParent && (
                    <div className="mt-4 space-y-3">
                      <LinkedKpiSelector
                        scopeType={kpi.scope_type}
                        quarter={kpi.quarter}
                        year={kpi.year}
                        selectedParentId={selectedParentId}
                        onSelect={setSelectedParentId}
                        excludeKpiId={kpi.id}
                      />
                      {selectedParentId && (
                        <Button 
                          onClick={handleLinkToParent} 
                          disabled={linkKpiMutation.isPending}
                          className="w-full"
                        >
                          {linkKpiMutation.isPending ? 'Linking...' : 'Confirm Link'}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              )
            )}

            {/* Linked KPIs Section (for org/group KPIs) */}
            {(kpi.scope_type === 'organization' || kpi.scope_type === 'department' || 
              kpi.scope_type === 'office' || kpi.scope_type === 'project') && (
              <LinkedKpisSection
                kpi={{
                  ...kpi,
                  children: hierarchy?.children || [],
                }}
                canEdit={canEdit()}
              />
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">
                    {kpi.scope_type === 'individual' ? 'Owner' : 'Owners'}
                  </span>
                  <KpiOwnersDisplay 
                    owners={kpiOwners}
                    kpiId={kpi.id}
                    canEdit={canEditOwners()}
                    scopeType={kpi.scope_type || 'individual'}
                  />
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

            {/* Reminder Settings - Always Open, Smart Save */}
            {canEdit() && (
              <Card className="p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  {reminderEnabled ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  Update Reminders
                </h3>
                
                <div className="space-y-4">
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
                  
                  {/* Smart Save Button - Only shows when changes detected */}
                  {hasReminderChanges && (
                    <Button 
                      className="w-full" 
                      onClick={handleSaveReminderSettings}
                      disabled={saveSettings.isPending}
                    >
                      {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
                    </Button>
                  )}
                  
                  {kpi.update_settings?.next_reminder_at && reminderEnabled && (
                    <p className="text-xs text-muted-foreground text-center">
                      Next reminder: {format(parseISO(kpi.update_settings.next_reminder_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* KPI Activity Logs */}
            <KpiActivityLogs kpiId={kpiId} />
          </div>
        </div>

        {/* Celebration Modal */}
        <KpiCelebration 
          milestone={celebrationMilestone} 
          onClose={() => setCelebrationMilestone(null)} 
        />

        {/* Edit KPI Dialog */}
        <EditKPIDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          kpi={kpi}
        />
      </div>
  );
};

export default KpiDetail;
