/**
 * Office Leave Settings Component
 * Manages per-office leave types and configuration
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { YearStartPicker } from '@/components/ui/year-start-picker';
import { CalendarDays, Plus, Pencil, Trash2, Loader2, Copy, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface OfficeLeaveType {
  id: string;
  office_id: string;
  organization_id: string;
  name: string;
  category: 'paid' | 'unpaid';
  description: string | null;
  default_days: number;
  min_days_advance: number;
  max_negative_days: number;
  applies_to_gender: 'all' | 'male' | 'female';
  applies_to_employment_types: string[] | null;
  carry_forward_mode: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Office {
  id: string;
  name: string;
  leave_year_start_month?: number;
  leave_year_start_day?: number;
  leave_enabled?: boolean;
}

interface OfficeLeaveSettingsProps {
  office: Office;
  organizationId: string;
  onOfficeUpdated?: (updates: Partial<Office>) => void;
}

const CARRY_FORWARD_OPTIONS = [
  { value: 'none', label: 'No carry-forward', description: 'Balance resets each year' },
  { value: 'all', label: 'Carry all', description: 'Full balance carries to next year' },
  { value: 'positive_only', label: 'Positive only', description: 'Only positive balances carry forward' },
  { value: 'negative_only', label: 'Negative only', description: 'Only negative balances carry forward' },
];

export function OfficeLeaveSettings({ office, organizationId, onOfficeUpdated }: OfficeLeaveSettingsProps) {
  const [leaveTypes, setLeaveTypes] = useState<OfficeLeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<OfficeLeaveType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'paid' as 'paid' | 'unpaid',
    description: '',
    default_days: 0,
    min_days_advance: 0,
    max_negative_days: 0,
    applies_to_gender: 'all' as 'all' | 'male' | 'female',
    carry_forward_mode: 'none',
    is_active: true,
  });

  useEffect(() => {
    loadLeaveTypes();
  }, [office.id]);

  const loadLeaveTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('office_leave_types')
      .select('*')
      .eq('office_id', office.id)
      .order('name');

    if (error) {
      console.error('Error loading office leave types:', error);
      toast.error('Failed to load leave types');
    } else {
      setLeaveTypes((data || []) as OfficeLeaveType[]);
    }
    setLoading(false);
  };

  const handleYearStartChange = async (month: number, day: number) => {
    const { error } = await supabase
      .from('offices')
      .update({
        leave_year_start_month: month,
        leave_year_start_day: day,
      })
      .eq('id', office.id);

    if (error) {
      toast.error('Failed to update leave year start');
    } else {
      toast.success('Leave year start updated');
      onOfficeUpdated?.({ leave_year_start_month: month, leave_year_start_day: day });
    }
  };

  const handleLeaveEnabledChange = async (enabled: boolean) => {
    const { error } = await supabase
      .from('offices')
      .update({ leave_enabled: enabled })
      .eq('id', office.id);

    if (error) {
      toast.error('Failed to update leave settings');
    } else {
      toast.success(enabled ? 'Leave management enabled' : 'Leave management disabled');
      onOfficeUpdated?.({ leave_enabled: enabled });
    }
  };

  const openAddDialog = () => {
    setEditingType(null);
    setFormData({
      name: '',
      category: 'paid',
      description: '',
      default_days: 0,
      min_days_advance: 0,
      max_negative_days: 0,
      applies_to_gender: 'all',
      carry_forward_mode: 'none',
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (leaveType: OfficeLeaveType) => {
    setEditingType(leaveType);
    setFormData({
      name: leaveType.name,
      category: leaveType.category,
      description: leaveType.description || '',
      default_days: leaveType.default_days,
      min_days_advance: leaveType.min_days_advance,
      max_negative_days: leaveType.max_negative_days,
      applies_to_gender: leaveType.applies_to_gender,
      carry_forward_mode: leaveType.carry_forward_mode,
      is_active: leaveType.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);

    try {
      if (editingType) {
        const { error } = await supabase
          .from('office_leave_types')
          .update({
            name: formData.name.trim(),
            category: formData.category,
            description: formData.description.trim() || null,
            default_days: formData.default_days,
            min_days_advance: formData.min_days_advance,
            max_negative_days: formData.max_negative_days,
            applies_to_gender: formData.applies_to_gender,
            carry_forward_mode: formData.carry_forward_mode,
            is_active: formData.is_active,
          })
          .eq('id', editingType.id);

        if (error) throw error;
        toast.success('Leave type updated');
      } else {
        const { error } = await supabase
          .from('office_leave_types')
          .insert({
            office_id: office.id,
            organization_id: organizationId,
            name: formData.name.trim(),
            category: formData.category,
            description: formData.description.trim() || null,
            default_days: formData.default_days,
            min_days_advance: formData.min_days_advance,
            max_negative_days: formData.max_negative_days,
            applies_to_gender: formData.applies_to_gender,
            carry_forward_mode: formData.carry_forward_mode,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Leave type created');
      }

      setEditDialogOpen(false);
      loadLeaveTypes();
    } catch (error) {
      console.error('Error saving leave type:', error);
      toast.error('Failed to save leave type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (leaveType: OfficeLeaveType) => {
    const { error } = await supabase
      .from('office_leave_types')
      .delete()
      .eq('id', leaveType.id);

    if (error) {
      toast.error('Failed to delete leave type');
    } else {
      toast.success('Leave type deleted');
      loadLeaveTypes();
    }
  };

  const handleToggleActive = async (leaveType: OfficeLeaveType) => {
    const { error } = await supabase
      .from('office_leave_types')
      .update({ is_active: !leaveType.is_active })
      .eq('id', leaveType.id);

    if (error) {
      toast.error('Failed to update leave type');
    } else {
      loadLeaveTypes();
    }
  };

  const copyFromTemplates = async () => {
    setSaving(true);
    try {
      // Fetch global templates
      const { data: templates, error } = await supabase
        .from('template_leave_types')
        .select('*')
        .or('country_code.is.null,country_code.eq.')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      if (!templates || templates.length === 0) {
        toast.error('No templates available');
        return;
      }

      // Insert as office leave types
      const { error: insertError } = await supabase
        .from('office_leave_types')
        .insert(
          templates.map(t => ({
            office_id: office.id,
            organization_id: organizationId,
            name: t.name,
            category: t.category,
            description: t.description,
            default_days: t.default_days,
            min_days_advance: t.min_days_advance,
            max_negative_days: t.max_negative_days,
            applies_to_gender: t.applies_to_gender,
            applies_to_employment_types: t.applies_to_employment_types,
            carry_forward_mode: t.carry_forward_mode,
            is_active: true,
          }))
        );

      if (insertError) throw insertError;

      toast.success(`Added ${templates.length} leave types from templates`);
      loadLeaveTypes();
    } catch (error) {
      console.error('Error copying templates:', error);
      toast.error('Failed to copy templates');
    } finally {
      setSaving(false);
    }
  };

  const leaveEnabled = office.leave_enabled ?? true;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Leave Settings</CardTitle>
              <CardDescription>Configure leave types and policies for this office</CardDescription>
            </div>
          </div>
          <Switch
            checked={leaveEnabled}
            onCheckedChange={handleLeaveEnabledChange}
          />
        </div>
      </CardHeader>

      {leaveEnabled && (
        <CardContent className="space-y-6">
          {/* Leave Year Configuration */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <Label className="text-sm font-medium">Leave Year Start</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When annual leave balances reset
              </p>
            </div>
            <YearStartPicker
              month={office.leave_year_start_month || 1}
              day={office.leave_year_start_day || 1}
              onChange={handleYearStartChange}
            />
          </div>

          {/* Leave Types */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Leave Types</Label>
              <div className="flex gap-2">
                {leaveTypes.length === 0 && (
                  <Button variant="outline" size="sm" onClick={copyFromTemplates} disabled={saving}>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy from Templates
                  </Button>
                )}
                <Button size="sm" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Type
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leaveTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leave types configured</p>
                <p className="text-xs mt-1">Add leave types or copy from templates</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaveTypes.map((lt) => (
                  <div
                    key={lt.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      lt.is_active ? "bg-card" : "bg-muted/30 opacity-60"
                    )}
                  >
                    <Switch
                      checked={lt.is_active}
                      onCheckedChange={() => handleToggleActive(lt)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{lt.name}</span>
                        <Badge
                          variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          lt.category === 'paid'
                            ? 'bg-green-100/80 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : ''
                        )}
                        >
                          {lt.category}
                        </Badge>
                        {lt.is_system && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            System
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lt.default_days} days • {lt.min_days_advance > 0 ? `${lt.min_days_advance}d advance` : 'No advance notice'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(lt)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{lt.name}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(lt)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
            <DialogDescription>
              Configure the leave type settings for this office
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Leave"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as 'paid' | 'unpaid' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Default Days</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.default_days}
                  onChange={(e) => setFormData({ ...formData, default_days: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label className="text-sm flex items-center gap-1">
                        Advance Notice
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>Days required before leave starts</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  type="number"
                  min={0}
                  value={formData.min_days_advance}
                  onChange={(e) => setFormData({ ...formData, min_days_advance: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label className="text-sm flex items-center gap-1">
                        Max Negative
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>Maximum negative balance allowed</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  type="number"
                  min={0}
                  value={formData.max_negative_days}
                  onChange={(e) => setFormData({ ...formData, max_negative_days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Applies to Gender</Label>
                <Select
                  value={formData.applies_to_gender}
                  onValueChange={(v) => setFormData({ ...formData, applies_to_gender: v as 'all' | 'male' | 'female' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male only</SelectItem>
                    <SelectItem value="female">Female only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Carry Forward</Label>
                <Select
                  value={formData.carry_forward_mode}
                  onValueChange={(v) => setFormData({ ...formData, carry_forward_mode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRY_FORWARD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label className="text-sm">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingType ? 'Save Changes' : 'Add Leave Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
