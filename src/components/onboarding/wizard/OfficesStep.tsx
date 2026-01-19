/**
 * Organization Onboarding - Offices Step (Table Layout)
 * Dynamic columns based on enabled features from Welcome step
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/address-autocomplete';
import { WorkdaysChipSelector, WEEKDAYS_MON_FRI } from '@/components/ui/workdays-chip-selector';
import { ArrowLeft, ArrowRight, Building, Plus, Trash2, Loader2, Crown, Globe, CalendarDays, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getTimezoneForCountry, getTimezonesForCountry, hasMultipleTimezones } from '@/utils/countryTimezones';

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
  work_days?: number[];
  work_start_time?: string;
  work_end_time?: string;
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
  onSave: (offices: Office[]) => void;
  onBack: () => void;
  isSaving: boolean;
}

// Common timezones grouped by region
const TIMEZONE_OPTIONS = [
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'UTC', label: 'UTC' },
];

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

export function OfficesStep({ 
  organizationId, 
  organizationInfo,
  enabledFeatures = [],
  initialOffices, 
  onSave, 
  onBack, 
  isSaving 
}: OfficesStepProps) {
  const { toast } = useToast();
  const [isPersisting, setIsPersisting] = useState(false);

  // Check which features are enabled
  const hasAttendance = enabledFeatures.includes('attendance');
  const hasLeave = enabledFeatures.includes('leave');

  // Initialize offices with defaults
  const getInitialOffices = (): Office[] => {
    if (initialOffices.length > 0 && initialOffices[0].address) {
      return initialOffices.map(o => ({
        ...o,
        timezone: o.timezone || getTimezoneForCountry(o.address_components?.country_code),
        work_days: o.work_days || [1, 2, 3, 4, 5],
        work_start_time: o.work_start_time || '09:00',
        work_end_time: o.work_end_time || '17:00',
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
      work_days: [1, 2, 3, 4, 5],
      work_start_time: '09:00',
      work_end_time: '17:00',
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
      work_days: [1, 2, 3, 4, 5],
      work_start_time: '09:00',
      work_end_time: '17:00',
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

        // Upsert office schedule with work_days
        if (hasAttendance) {
          const { data: existingSchedule } = await supabase
            .from('office_schedules')
            .select('id')
            .eq('office_id', officeId)
            .maybeSingle();

          if (existingSchedule) {
            await supabase
              .from('office_schedules')
              .update({
                work_start_time: office.work_start_time,
                work_end_time: office.work_end_time,
                work_days: office.work_days,
                timezone: office.timezone,
              })
              .eq('id', existingSchedule.id);
          } else {
            await supabase
              .from('office_schedules')
              .insert({
                office_id: officeId,
                organization_id: organizationId,
                work_start_time: office.work_start_time,
                work_end_time: office.work_end_time,
                work_days: office.work_days,
                timezone: office.timezone,
              });
          }
        }

        insertedOffices.push({ ...office, id: officeId });
      }

      toast({
        title: 'Offices saved',
        description: `${insertedOffices.length} office${insertedOffices.length > 1 ? 's' : ''} saved successfully.`,
      });

      onSave(insertedOffices);
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

  // Calculate dynamic column count for responsive sizing
  const extraColumns = (hasAttendance ? 3 : 0) + (hasLeave ? 1 : 0);

  return (
    <TooltipProvider>
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Your Offices</CardTitle>
          <CardDescription>
            Configure your office locations{hasAttendance || hasLeave ? ' and quick settings' : ''}. You can adjust details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[140px] min-w-[140px]">Office Name</TableHead>
                    <TableHead className="w-[200px] min-w-[180px]">Location</TableHead>
                    {hasAttendance && (
                      <>
                        <TableHead className="w-[140px] min-w-[130px]">
                          <div className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            Timezone
                          </div>
                        </TableHead>
                        <TableHead className="w-[160px] min-w-[150px]">
                          <div className="flex items-center gap-1">
                            Workdays
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>Select working days for this office</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                        <TableHead className="w-[90px] min-w-[80px]">
                          <div className="flex items-center gap-1">
                            Holidays
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>Auto-add public holidays to calendar</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableHead>
                      </>
                    )}
                    {hasLeave && (
                      <TableHead className="w-[120px] min-w-[110px]">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Year Start
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>Leave balance calculation starts on this date</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offices.map((office, index) => (
                    <TableRow 
                      key={index}
                      className={cn(
                        index === 0 && "bg-amber-50/50 dark:bg-amber-950/20"
                      )}
                    >
                      {/* Office Name */}
                      <TableCell className="p-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                          <Input
                            value={office.name}
                            onChange={(e) => updateOffice(index, 'name', e.target.value)}
                            placeholder="e.g., Head Office"
                            className="h-8 text-sm"
                            disabled={isLoading}
                          />
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="p-2">
                        <AddressAutocomplete
                          value={office.address}
                          onChange={(address, components) => handleAddressChange(index, address, components)}
                          placeholder="Search address..."
                          disabled={isLoading}
                        />
                      </TableCell>

                      {/* Timezone (Attendance) */}
                      {hasAttendance && (
                        <TableCell className="p-2">
                          <Select
                            value={office.timezone || 'UTC'}
                            onValueChange={(v) => updateOffice(index, 'timezone', v)}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMEZONE_OPTIONS.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}

                      {/* Workdays (Attendance) */}
                      {hasAttendance && (
                        <TableCell className="p-2">
                          <WorkdaysChipSelector
                            value={office.work_days || WEEKDAYS_MON_FRI}
                            onChange={(days) => updateOffice(index, 'work_days', days)}
                            disabled={isLoading}
                            size="sm"
                          />
                        </TableCell>
                      )}

                      {/* Public Holidays (Attendance) */}
                      {hasAttendance && (
                        <TableCell className="p-2">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={office.public_holidays_enabled ?? true}
                              onCheckedChange={(v) => updateOffice(index, 'public_holidays_enabled', v)}
                              disabled={isLoading}
                            />
                          </div>
                        </TableCell>
                      )}

                      {/* Year Start (Leave) */}
                      {hasLeave && (
                        <TableCell className="p-2">
                          <div className="flex items-center gap-1">
                            <Select
                              value={String(office.leave_year_start_month || 1)}
                              onValueChange={(v) => updateOffice(index, 'leave_year_start_month', parseInt(v))}
                              disabled={isLoading}
                            >
                              <SelectTrigger className="h-8 text-sm w-[60px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MONTHS.map((m) => (
                                  <SelectItem key={m.value} value={String(m.value)}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={String(office.leave_year_start_day || 1)}
                              onValueChange={(v) => updateOffice(index, 'leave_year_start_day', parseInt(v))}
                              disabled={isLoading}
                            >
                              <SelectTrigger className="h-8 text-sm w-[50px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                                  <SelectItem key={d} value={String(d)}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      )}

                      {/* Actions */}
                      <TableCell className="p-2">
                        {index !== 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOffice(index)}
                            disabled={isLoading}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addOffice}
              className="w-full"
              disabled={isLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Office
            </Button>

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
    </TooltipProvider>
  );
}
