/**
 * Organization Onboarding - Offices Step (Card Layout)
 * Full-width cards with Attendance & Leave settings in sub-cards
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/address-autocomplete';
import { 
  WorkdaysScheduleSelector, 
  DaySchedulesMap, 
  DEFAULT_WEEKDAY_SCHEDULES,
  scheduleMapToWorkDaysArray 
} from '@/components/ui/workdays-schedule-selector';
import { YearStartPicker } from '@/components/ui/year-start-picker';
import { TimezoneSelector } from '@/components/ui/timezone-selector';
import { LeaveTypesCustomizer, LeaveTypeConfig, getDefaultLeaveTypesConfig } from './LeaveTypesCustomizer';
import { 
  ArrowLeft, 
  ArrowRight, 
  Building, 
  Plus, 
  Trash2, 
  Loader2, 
  Crown, 
  Clock, 
  CalendarDays, 
  PartyPopper 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getTimezoneForCountry } from '@/utils/countryTimezones';
import type { Json } from '@/integrations/supabase/types';

interface Office {
  id?: string;
  name: string;
  address: string;
  address_components?: {
    country?: string;
    country_code?: string;
    city?: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
  };
  // Attendance settings
  timezone?: string;
  day_schedules?: DaySchedulesMap;
  public_holidays_enabled?: boolean;
  // Leave settings
  leave_year_start_month?: number;
  leave_year_start_day?: number;
}

interface OrganizationInfo {
  name?: string;
  business_address?: string;
  business_address_components?: {
    country?: string;
    country_code?: string;
    locality?: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
  };
}

interface OfficesStepProps {
  organizationId: string;
  organizationInfo?: OrganizationInfo;
  enabledFeatures?: string[];
  initialOffices: Office[];
  initialLeaveTypesConfig?: LeaveTypeConfig[];
  onSave: (offices: Office[], leaveTypesConfig?: LeaveTypeConfig[]) => void;
  onBack: () => void;
  isSaving: boolean;
}

// Helper to convert old format to new DaySchedulesMap
const convertToDaySchedules = (
  workDays?: number[], 
  startTime?: string, 
  endTime?: string
): DaySchedulesMap => {
  if (!workDays || workDays.length === 0) {
    return { ...DEFAULT_WEEKDAY_SCHEDULES };
  }
  const schedules: DaySchedulesMap = {};
  workDays.forEach(day => {
    schedules[day.toString()] = {
      enabled: true,
      start: startTime || '09:00',
      end: endTime || '17:00',
    };
  });
  return schedules;
};

// Helper to format work hours summary
const formatWorkHoursSummary = (daySchedules?: DaySchedulesMap): string => {
  if (!daySchedules) return '9:00 AM - 5:00 PM';
  
  const enabledSchedules = Object.values(daySchedules).filter(s => s.enabled);
  if (enabledSchedules.length === 0) return 'No work days set';
  
  const firstDay = enabledSchedules[0];
  if (!firstDay) return '9:00 AM - 5:00 PM';
  
  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };
  
  return `${formatTime(firstDay.start || '09:00')} - ${formatTime(firstDay.end || '17:00')}`;
};

// Helper to format break time summary
const formatBreakSummary = (daySchedules?: DaySchedulesMap): string | null => {
  if (!daySchedules) return null;
  
  const enabledSchedules = Object.values(daySchedules).filter(s => s.enabled);
  if (enabledSchedules.length === 0) return null;
  
  const firstDay = enabledSchedules[0];
  if (!firstDay?.breakStart || !firstDay?.breakEnd) return null;
  
  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };
  
  return `${formatTime(firstDay.breakStart)} - ${formatTime(firstDay.breakEnd)}`;
};

export function OfficesStep({ 
  organizationId, 
  organizationInfo,
  enabledFeatures = [],
  initialOffices,
  initialLeaveTypesConfig,
  onSave, 
  onBack, 
  isSaving 
}: OfficesStepProps) {
  const { toast } = useToast();
  const [isPersisting, setIsPersisting] = useState(false);

  // Check which features are enabled
  const hasAttendance = enabledFeatures.includes('attendance');
  const hasLeave = enabledFeatures.includes('leave');

  // Leave types configuration state
  const [leaveTypesConfig, setLeaveTypesConfig] = useState<LeaveTypeConfig[]>(
    initialLeaveTypesConfig || getDefaultLeaveTypesConfig()
  );

  // Initialize offices with defaults
  const getInitialOffices = (): Office[] => {
    if (initialOffices.length > 0 && initialOffices[0].address) {
      return initialOffices.map(o => ({
        ...o,
        timezone: o.timezone || getTimezoneForCountry(o.address_components?.country_code),
        day_schedules: o.day_schedules || convertToDaySchedules(
          (o as any).work_days, 
          (o as any).work_start_time, 
          (o as any).work_end_time
        ),
        public_holidays_enabled: o.public_holidays_enabled ?? true,
        leave_year_start_month: o.leave_year_start_month || 1,
        leave_year_start_day: o.leave_year_start_day || 1,
      }));
    }
    
    const orgAddress = organizationInfo?.business_address || '';
    const components = organizationInfo?.business_address_components;
    const countryCode = components?.country_code;
    
    return [{
      name: organizationInfo?.name ? `${organizationInfo.name} HQ` : 'Head Office',
      address: orgAddress,
      address_components: components ? {
        country: components.country,
        country_code: components.country_code,
        city: components.locality,
        postal_code: components.postal_code,
        lat: components.lat,
        lng: components.lng,
      } : undefined,
      timezone: getTimezoneForCountry(countryCode),
      day_schedules: { ...DEFAULT_WEEKDAY_SCHEDULES },
      public_holidays_enabled: true,
      leave_year_start_month: 1,
      leave_year_start_day: 1,
    }];
  };

  const [offices, setOffices] = useState<Office[]>(getInitialOffices);

  // Update offices when organizationInfo changes
  useEffect(() => {
    if (organizationInfo && offices.length === 1 && !offices[0].address && organizationInfo.business_address) {
      setOffices(getInitialOffices());
    }
  }, [organizationInfo]);

  const addOffice = () => {
    setOffices([...offices, { 
      name: '', 
      address: '',
      timezone: 'UTC',
      day_schedules: { ...DEFAULT_WEEKDAY_SCHEDULES },
      public_holidays_enabled: true,
      leave_year_start_month: 1,
      leave_year_start_day: 1,
    }]);
  };

  const removeOffice = (index: number) => {
    if (offices.length > 1 && index !== 0) {
      setOffices(offices.filter((_, i) => i !== index));
    }
  };

  const updateOffice = (index: number, field: keyof Office, value: unknown) => {
    setOffices(offices.map((office, i) => 
      i === index ? { ...office, [field]: value } : office
    ));
  };

  const handleAddressChange = (index: number, address: string, components?: AddressComponents) => {
    setOffices(offices.map((office, i) => {
      if (i !== index) return office;
      const countryCode = components?.country_code;
      return { 
        ...office, 
        address,
        address_components: components ? {
          country: components.country,
          country_code: components.country_code,
          city: components.locality,
          postal_code: components.postal_code,
          lat: components.lat,
          lng: components.lng,
        } : office.address_components,
        // Auto-update timezone when country changes
        timezone: countryCode ? getTimezoneForCountry(countryCode) : office.timezone,
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOffices = offices.filter(o => o.name && o.address);
    if (validOffices.length === 0) {
      toast({
        title: 'At least one office required',
        description: 'Please add at least one office with name and address.',
        variant: 'destructive',
      });
      return;
    }

    setIsPersisting(true);

    try {
      const insertedOffices: Office[] = [];
      
      for (const office of validOffices) {
        const country = office.address_components?.country_code || '';
        const city = office.address_components?.city || '';

        // Check if office already exists
        const { data: existing } = await supabase
          .from('offices')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', office.name)
          .maybeSingle();

        let officeId: string;

        if (existing) {
          await supabase
            .from('offices')
            .update({
              country,
              city,
              address: office.address,
              timezone: office.timezone,
              leave_year_start_month: office.leave_year_start_month,
              leave_year_start_day: office.leave_year_start_day,
              public_holidays_enabled: office.public_holidays_enabled,
            })
            .eq('id', existing.id);
          officeId = existing.id;
        } else {
          const { data: newOffice, error } = await supabase
            .from('offices')
            .insert({
              organization_id: organizationId,
              name: office.name,
              country,
              city,
              address: office.address,
              timezone: office.timezone,
              leave_year_start_month: office.leave_year_start_month,
              leave_year_start_day: office.leave_year_start_day,
              public_holidays_enabled: office.public_holidays_enabled,
            })
            .select('id')
            .single();

          if (error) throw error;
          officeId = newOffice.id;
        }

        // Upsert office schedule with day_schedules
        if (hasAttendance && office.day_schedules) {
          const workDays = scheduleMapToWorkDaysArray(office.day_schedules);
          // Get first enabled day's times as default work hours
          const firstEnabledDay = Object.values(office.day_schedules).find(s => s.enabled);
          const workStartTime = firstEnabledDay?.start || '09:00';
          const workEndTime = firstEnabledDay?.end || '17:00';
          // Use JSON parse/stringify to ensure proper Json type
          const daySchedulesJson = JSON.parse(JSON.stringify(office.day_schedules)) as Json;

          const { data: existingSchedule } = await supabase
            .from('office_schedules')
            .select('id')
            .eq('office_id', officeId)
            .maybeSingle();

          if (existingSchedule) {
            await supabase
              .from('office_schedules')
              .update({
                work_start_time: workStartTime,
                work_end_time: workEndTime,
                work_days: workDays,
                day_schedules: daySchedulesJson,
                timezone: office.timezone,
              })
              .eq('id', existingSchedule.id);
          } else {
            await supabase
              .from('office_schedules')
              .insert([{
                office_id: officeId,
                organization_id: organizationId,
                work_start_time: workStartTime,
                work_end_time: workEndTime,
                work_days: workDays,
                day_schedules: daySchedulesJson,
                timezone: office.timezone,
              }]);
          }
        }

        insertedOffices.push({ ...office, id: officeId });
      }

      toast({
        title: 'Offices saved',
        description: `${insertedOffices.length} office${insertedOffices.length > 1 ? 's' : ''} saved successfully.`,
      });

      onSave(insertedOffices, hasLeave ? leaveTypesConfig : undefined);
    } catch (err) {
      console.error('Failed to persist offices:', err);
      toast({
        title: 'Error saving offices',
        description: 'Some offices may not have been saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPersisting(false);
    }
  };

  const isValid = offices.some(o => o.name && o.address);
  const isLoading = isSaving || isPersisting;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Building className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Your Offices</CardTitle>
        <CardDescription>
          Configure your office locations{hasAttendance || hasLeave ? ' and their settings' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Office Cards */}
          <div className="space-y-4">
            {offices.map((office, index) => (
              <div 
                key={index}
                className={cn(
                  "rounded-lg border p-4 space-y-4 transition-colors",
                  index === 0 && "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20"
                )}
              >
                {/* Header Row - Name, Location, Timezone */}
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Office Name */}
                  <div className="col-span-12 sm:col-span-3">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      {index === 0 ? 'Headquarters' : 'Office Name'}
                    </Label>
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <Input
                        value={office.name}
                        onChange={(e) => updateOffice(index, 'name', e.target.value)}
                        placeholder="e.g., Head Office"
                        className="h-9"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="col-span-12 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label>
                    <AddressAutocomplete
                      value={office.address}
                      onChange={(address, components) => handleAddressChange(index, address, components)}
                      placeholder="Search address..."
                      disabled={isLoading}
                    />
                  </div>

                  {/* Timezone */}
                  <div className="col-span-10 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Timezone</Label>
                    <TimezoneSelector
                      value={office.timezone || 'UTC'}
                      onChange={(v) => updateOffice(index, 'timezone', v)}
                      disabled={isLoading}
                      countryCode={office.address_components?.country_code}
                      placeholder="Select timezone"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="col-span-2 sm:col-span-1 flex justify-end pt-6">
                    {index !== 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOffice(index)}
                        disabled={isLoading}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Settings Row - Two Sub-Cards */}
                {(hasAttendance || hasLeave) && (
                  <div className={cn(
                    "grid gap-4",
                    hasAttendance && hasLeave ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                  )}>
                    {/* Attendance Settings Sub-Card */}
                    {hasAttendance && (
                      <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Attendance Settings</span>
                        </div>

                        {/* Workdays & Schedule Selector */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Work Schedule</Label>
                          <WorkdaysScheduleSelector
                            value={office.day_schedules || DEFAULT_WEEKDAY_SCHEDULES}
                            onChange={(schedules) => updateOffice(index, 'day_schedules', schedules)}
                            disabled={isLoading}
                          />
                        </div>

                        {/* Work Hours Summary */}
                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                          <div className="flex justify-between">
                            <span>Work Hours:</span>
                            <span className="font-medium text-foreground">
                              {formatWorkHoursSummary(office.day_schedules)}
                            </span>
                          </div>
                          {formatBreakSummary(office.day_schedules) && (
                            <div className="flex justify-between">
                              <span>Break:</span>
                              <span className="font-medium text-foreground">
                                {formatBreakSummary(office.day_schedules)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Public Holidays Toggle */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <PartyPopper className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Public Holidays</span>
                          </div>
                          <Switch
                            checked={office.public_holidays_enabled ?? true}
                            onCheckedChange={(checked) => 
                              updateOffice(index, 'public_holidays_enabled', checked)
                            }
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    )}

                    {/* Leave Settings Sub-Card */}
                    {hasLeave && (
                      <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Leave Settings</span>
                        </div>

                        {/* Year Start Picker */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Leave Year Start</Label>
                          <YearStartPicker
                            month={office.leave_year_start_month || 1}
                            day={office.leave_year_start_day || 1}
                            onChange={(month, day) => {
                              updateOffice(index, 'leave_year_start_month', month);
                              updateOffice(index, 'leave_year_start_day', day);
                            }}
                            disabled={isLoading}
                          />
                        </div>

                        {/* Leave Types Preview */}
                        <div className="pt-3 border-t space-y-2">
                          <Label className="text-xs text-muted-foreground">Default Leave Types</Label>
                          <div className="space-y-1.5">
                            {leaveTypesConfig.slice(0, 3).map((lt) => (
                              <div 
                                key={lt.name} 
                                className="flex justify-between text-xs"
                              >
                                <span className="text-foreground">{lt.name}</span>
                                <span className="text-muted-foreground">
                                  {lt.default_days} days/year
                                </span>
                              </div>
                            ))}
                            {leaveTypesConfig.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{leaveTypesConfig.length - 3} more types
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Office Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addOffice}
            className="w-full border-dashed"
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Office
          </Button>


          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" disabled={isLoading || !isValid} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
