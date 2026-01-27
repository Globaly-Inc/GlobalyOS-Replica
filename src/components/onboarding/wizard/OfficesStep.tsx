/**
 * Organization Onboarding - Offices Step (Accordion Layout)
 * Single-expanded accordion with per-office feature toggles and inline settings
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { StructuredAddressInput, type AddressValue, EMPTY_ADDRESS } from '@/components/ui/structured-address-input';
import { getCountryNameFromCode } from '@/lib/countries';
import { 
  DaySchedulesMap, 
  DEFAULT_WEEKDAY_SCHEDULES,
  scheduleMapToWorkDaysArray 
} from '@/components/ui/workdays-schedule-selector';
import { WorkdaysChipSelector } from '@/components/ui/workdays-chip-selector';
import { YearStartPicker } from '@/components/ui/year-start-picker';
import { TimezoneSelector } from '@/components/ui/timezone-selector';
import { LeaveTypeConfig, getDefaultLeaveTypesConfig, LeaveTypesCustomizer } from './LeaveTypesCustomizer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  PartyPopper,
  MapPin,
  Globe,
  Info,
  Download
} from 'lucide-react';
import QRCode from 'qrcode';
import { generateOfficeQRPDF } from '@/components/offices/OfficeQRPDFExport';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getTimezoneForCountry } from '@/utils/countryTimezones';
import { getFlagEmoji } from '@/lib/countries';
import type { Json } from '@/integrations/supabase/types';

interface OfficeLeaveTypeConfig {
  name: string;
  category: 'paid' | 'unpaid';
  default_days: number;
  is_enabled: boolean;
}

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
  address_value?: AddressValue; // Structured address state for input
  // Per-office feature toggles
  attendance_enabled?: boolean;
  leave_enabled?: boolean;
  // Attendance settings
  timezone?: string;
  day_schedules?: DaySchedulesMap;
  public_holidays_enabled?: boolean;
  // Leave settings (per-office)
  leave_year_start_month?: number;
  leave_year_start_day?: number;
  leave_types?: OfficeLeaveTypeConfig[]; // Per-office leave types
}

interface OrganizationInfo {
  name?: string;
  logo_url?: string;
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

// Helper to format workdays summary (e.g., "Mon-Fri")
const formatWorkdaysSummary = (daySchedules?: DaySchedulesMap): string => {
  if (!daySchedules) return 'Mon-Fri';
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const enabledDays = Object.entries(daySchedules)
    .filter(([_, s]) => s.enabled)
    .map(([d]) => parseInt(d, 10))
    .sort((a, b) => a - b);
  
  if (enabledDays.length === 0) return 'No work days';
  if (enabledDays.length === 1) return dayNames[enabledDays[0]];
  
  // Check for consecutive days
  let isConsecutive = true;
  for (let i = 1; i < enabledDays.length; i++) {
    if (enabledDays[i] - enabledDays[i - 1] !== 1) {
      isConsecutive = false;
      break;
    }
  }
  
  if (isConsecutive && enabledDays.length > 2) {
    return `${dayNames[enabledDays[0]]}-${dayNames[enabledDays[enabledDays.length - 1]]}`;
  }
  
  return enabledDays.map(d => dayNames[d]).join(', ');
};

// Helper to format work hours summary
const formatWorkHoursSummary = (daySchedules?: DaySchedulesMap): string => {
  if (!daySchedules) return '9:00 AM - 5:00 PM';
  
  const enabledSchedules = Object.values(daySchedules).filter(s => s.enabled);
  if (enabledSchedules.length === 0) return 'No work hours set';
  
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

// Helper to format break duration for summary
const formatBreakSummary = (daySchedules?: DaySchedulesMap): string | null => {
  if (!daySchedules) return null;
  
  const enabledSchedules = Object.values(daySchedules).filter(s => s.enabled);
  if (enabledSchedules.length === 0) return null;
  
  const firstDay = enabledSchedules[0];
  if (!firstDay?.breakStart || !firstDay?.breakEnd) return null;
  
  const [startH, startM] = firstDay.breakStart.split(':').map(Number);
  const [endH, endM] = firstDay.breakEnd.split(':').map(Number);
  const mins = endH * 60 + endM - (startH * 60 + startM);
  
  if (mins <= 0) return null;
  
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  
  if (hours > 0 && remainingMins > 0) return `${hours}h ${remainingMins}m break`;
  if (hours > 0) return `${hours}h break`;
  return `${mins}m break`;
};

// Helper to format net work hours for summary
const formatNetWorkHours = (daySchedules?: DaySchedulesMap): string | null => {
  if (!daySchedules) return null;
  
  const enabledSchedules = Object.values(daySchedules).filter(s => s.enabled);
  if (enabledSchedules.length === 0) return null;
  
  const firstDay = enabledSchedules[0];
  if (!firstDay?.start || !firstDay?.end) return null;
  
  const [startH, startM] = firstDay.start.split(':').map(Number);
  const [endH, endM] = firstDay.end.split(':').map(Number);
  let totalMins = endH * 60 + endM - (startH * 60 + startM);
  
  // Subtract break time if present
  if (firstDay.breakStart && firstDay.breakEnd) {
    const [bStartH, bStartM] = firstDay.breakStart.split(':').map(Number);
    const [bEndH, bEndM] = firstDay.breakEnd.split(':').map(Number);
    const breakMins = bEndH * 60 + bEndM - (bStartH * 60 + bStartM);
    if (breakMins > 0) totalMins -= breakMins;
  }
  
  if (totalMins <= 0) return null;
  
  const hours = totalMins / 60;
  if (hours % 1 === 0) return `${hours}h net`;
  return `${hours.toFixed(1)}h net`;
};

// Helper to format year start
const formatYearStart = (office: Office): string => {
  const month = office.leave_year_start_month || 1;
  const day = office.leave_year_start_day || 1;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[month - 1]} ${day}`;
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
  const [expandedOffice, setExpandedOffice] = useState<string>('office-0');
  const [downloadingQR, setDownloadingQR] = useState<string | null>(null);
  
  // Template defaults: Map<leaveName, Map<countryCode, defaultDays>> - '_global' key for global default
  const [templateDefaults, setTemplateDefaults] = useState<Map<string, Map<string, number>>>(new Map());

  // Check which features are enabled globally
  const hasAttendance = enabledFeatures.includes('attendance');
  const hasLeave = enabledFeatures.includes('leave');

  // Fetch template leave types with country defaults on mount
  useEffect(() => {
    const fetchTemplateDefaults = async () => {
      try {
        const { data, error } = await supabase
          .from('template_leave_types')
          .select(`
            name,
            default_days,
            country_defaults:template_leave_type_country_defaults(country_code, default_days)
          `)
          .is('country_code', null)
          .eq('is_active', true);
        
        if (error) {
          console.error('Error fetching template defaults:', error);
          return;
        }
        
        if (data) {
          const map = new Map<string, Map<string, number>>();
          data.forEach((t: any) => {
            const countryMap = new Map<string, number>();
            countryMap.set('_global', t.default_days || 0);
            t.country_defaults?.forEach((cd: { country_code: string; default_days: number }) => {
              countryMap.set(cd.country_code, cd.default_days);
            });
            map.set(t.name, countryMap);
          });
          setTemplateDefaults(map);
        }
      } catch (err) {
        console.error('Error fetching template defaults:', err);
      }
    };
    
    if (hasLeave) {
      fetchTemplateDefaults();
    }
  }, [hasLeave]);

  // Get default leave types config for a new office, applying country-specific defaults if available
  const getDefaultOfficeLeaveTypes = (countryCode?: string): OfficeLeaveTypeConfig[] => {
    return getDefaultLeaveTypesConfig().map(lt => {
      let defaultDays = lt.default_days;
      
      // Check if we have template defaults for this leave type
      const templateMap = templateDefaults.get(lt.name);
      if (templateMap) {
        // Use country-specific default if available, otherwise use global template default
        if (countryCode && templateMap.has(countryCode)) {
          defaultDays = templateMap.get(countryCode)!;
        } else if (templateMap.has('_global')) {
          defaultDays = templateMap.get('_global')!;
        }
      }
      
      return {
        name: lt.name,
        category: lt.category,
        default_days: defaultDays,
        is_enabled: lt.is_enabled,
      };
    });
  };

  // Initialize offices with defaults
  const getInitialOffices = (): Office[] => {
    if (initialOffices.length > 0 && initialOffices[0].address) {
      return initialOffices.map(o => {
        const countryCode = o.address_components?.country_code;
        return {
          ...o,
          attendance_enabled: o.attendance_enabled ?? hasAttendance,
          leave_enabled: o.leave_enabled ?? hasLeave,
          timezone: o.timezone || getTimezoneForCountry(countryCode),
          day_schedules: o.day_schedules || convertToDaySchedules(
            (o as any).work_days, 
            (o as any).work_start_time, 
            (o as any).work_end_time
          ),
          public_holidays_enabled: o.public_holidays_enabled ?? true,
          leave_year_start_month: o.leave_year_start_month || 1,
          leave_year_start_day: o.leave_year_start_day || 1,
          leave_types: o.leave_types || getDefaultOfficeLeaveTypes(countryCode),
        };
      });
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
      attendance_enabled: hasAttendance,
      leave_enabled: hasLeave,
      timezone: getTimezoneForCountry(countryCode),
      day_schedules: { ...DEFAULT_WEEKDAY_SCHEDULES },
      public_holidays_enabled: true,
      leave_year_start_month: 1,
      leave_year_start_day: 1,
      leave_types: getDefaultOfficeLeaveTypes(countryCode),
    }];
  };

  const [offices, setOffices] = useState<Office[]>(getInitialOffices);

  // Update offices when organizationInfo changes
  useEffect(() => {
    if (organizationInfo && offices.length === 1 && !offices[0].address && organizationInfo.business_address) {
      setOffices(getInitialOffices());
    }
  }, [organizationInfo]);
  
  // Re-apply template defaults when they are loaded, but only if leave types haven't been manually customized
  useEffect(() => {
    if (templateDefaults.size > 0 && offices.length > 0) {
      setOffices(prevOffices => prevOffices.map(office => {
        // Only update if leave_types match the old defaults (not yet customized)
        const countryCode = office.address_components?.country_code;
        const updatedLeaveTypes = getDefaultOfficeLeaveTypes(countryCode);
        return {
          ...office,
          leave_types: updatedLeaveTypes,
        };
      }));
    }
  }, [templateDefaults]);

  const addOffice = () => {
    const newIndex = offices.length;
    setOffices([...offices, { 
      name: '', 
      address: '',
      attendance_enabled: hasAttendance,
      leave_enabled: hasLeave,
      timezone: 'UTC',
      day_schedules: { ...DEFAULT_WEEKDAY_SCHEDULES },
      public_holidays_enabled: true,
      leave_year_start_month: 1,
      leave_year_start_day: 1,
      leave_types: getDefaultOfficeLeaveTypes(), // No country yet
    }]);
    setExpandedOffice(`office-${newIndex}`);
  };

  const removeOffice = (index: number) => {
    if (offices.length > 1 && index !== 0) {
      setOffices(offices.filter((_, i) => i !== index));
      if (expandedOffice === `office-${index}`) {
        setExpandedOffice('office-0');
      }
    }
  };

  const updateOffice = (index: number, field: keyof Office, value: unknown) => {
    setOffices(offices.map((office, i) => 
      i === index ? { ...office, [field]: value } : office
    ));
  };

  const updateOfficeMultiple = (index: number, updates: Partial<Office>) => {
    setOffices(offices.map((office, i) => 
      i === index ? { ...office, ...updates } : office
    ));
  };

  const updateDaySchedule = (
    index: number, 
    dayKey: string, 
    field: 'start' | 'end' | 'breakStart' | 'breakEnd' | 'lateThreshold', 
    value: string | number
  ) => {
    setOffices(offices.map((office, i) => {
      if (i !== index) return office;
      const currentSchedules = office.day_schedules || { ...DEFAULT_WEEKDAY_SCHEDULES };
      const daySchedule = currentSchedules[dayKey] || { enabled: true, start: '09:00', end: '17:00' };
      return {
        ...office,
        day_schedules: {
          ...currentSchedules,
          [dayKey]: { ...daySchedule, [field]: value }
        }
      };
    }));
  };

  const handleWorkdaysChange = (index: number, selectedDays: number[]) => {
    const office = offices[index];
    const currentSchedules = office.day_schedules || { ...DEFAULT_WEEKDAY_SCHEDULES };
    
    // Get first enabled day's schedule as template
    const templateSchedule = Object.values(currentSchedules).find(s => s.enabled) || {
      enabled: true,
      start: '09:00',
      end: '17:00',
    };
    
    // Create new schedules based on selected days
    const newSchedules: DaySchedulesMap = {};
    selectedDays.forEach(day => {
      const existing = currentSchedules[day.toString()];
      newSchedules[day.toString()] = existing?.enabled 
        ? existing 
        : { ...templateSchedule, enabled: true };
    });
    
    updateOffice(index, 'day_schedules', newSchedules);
  };

  // Helper to extract AddressValue from existing office data
  const extractAddressValue = (office: Office): AddressValue => {
    const components = office.address_components;
    if (office.address_value) return office.address_value;
    if (!components) return EMPTY_ADDRESS;
    
    return {
      country: components.country_code || '',
      street: office.address || '',
      city: components.city || '',
      state: '',
      postcode: components.postal_code || '',
      lat: components.lat,
      lng: components.lng,
    };
  };

  const handleAddressValueChange = (index: number, addressValue: AddressValue) => {
    setOffices(offices.map((office, i) => {
      if (i !== index) return office;
      
      // Build display address from structured value
      const displayAddress = [addressValue.street, addressValue.city, addressValue.postcode]
        .filter(Boolean).join(', ');
      
      // Auto-update timezone when country changes
      const countryCode = addressValue.country;
      const previousCountryCode = office.address_components?.country_code;
      const newTimezone = countryCode ? getTimezoneForCountry(countryCode) : office.timezone;
      
      // Update leave types with country-specific defaults when country changes
      let updatedLeaveTypes = office.leave_types;
      if (countryCode !== previousCountryCode && hasLeave) {
        updatedLeaveTypes = getDefaultOfficeLeaveTypes(countryCode);
      }
      
      return {
        ...office,
        address: displayAddress,
        address_value: addressValue,
        address_components: {
          country: countryCode ? getCountryNameFromCode(countryCode) : undefined,
          country_code: countryCode,
          city: addressValue.city,
          postal_code: addressValue.postcode,
          lat: addressValue.lat,
          lng: addressValue.lng,
        },
        timezone: newTimezone,
        leave_types: updatedLeaveTypes,
      };
    }));
  };

  // Download QR PDF for an office
  const handleDownloadQR = async (office: Office) => {
    if (!office.id || !organizationId) return;
    
    setDownloadingQR(office.id);
    
    try {
      // Fetch the active QR code for this office
      const { data: qrCode, error } = await supabase
        .from('office_qr_codes')
        .select('code')
        .eq('office_id', office.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!qrCode?.code) {
        toast({
          title: "No QR Code",
          description: "Please save this office first to generate a QR code.",
          variant: "destructive",
        });
        return;
      }
      
      // Generate QR image
      const qrDataUrl = await QRCode.toDataURL(qrCode.code, { 
        width: 300, 
        margin: 2 
      });
      
      // Get org info for PDF - use onboarding data first, fallback to organizations table
      let orgName = organizationInfo?.name || '';
      let orgLogoUrl = organizationInfo?.logo_url || null;
      let orgPhone: string | null = null;
      let orgEmail: string | null = null;
      let orgWebsite: string | null = null;
      
      // If no logo in onboarding data, try the organizations table (for non-onboarding usage)
      if (!orgLogoUrl) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name, logo_url, business_phone, business_email, website')
          .eq('id', organizationId)
          .single();
        orgName = org?.name || orgName;
        orgLogoUrl = org?.logo_url || null;
        orgPhone = org?.business_phone || null;
        orgEmail = org?.business_email || null;
        orgWebsite = org?.website || null;
      } else {
        // Fetch contact info even if we have logo
        const { data: org } = await supabase
          .from('organizations')
          .select('business_phone, business_email, website')
          .eq('id', organizationId)
          .single();
        orgPhone = org?.business_phone || null;
        orgEmail = org?.business_email || null;
        orgWebsite = org?.website || null;
      }
      
      // Generate and download PDF
      await generateOfficeQRPDF({
        officeName: office.name,
        qrCodeDataUrl: qrDataUrl,
        orgName,
        orgLogoUrl,
        officeAddress: office.address || null,
        officeCity: office.address_components?.city || null,
        officeCountry: office.address_components?.country || null,
        orgPhone,
        orgEmail,
        orgWebsite,
      });
    } catch (error) {
      console.error('Error downloading QR:', error);
      toast({
        title: "Download Failed",
        description: "Could not generate QR code PDF.",
        variant: "destructive",
      });
    } finally {
      setDownloadingQR(null);
    }
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

        // Upsert office schedule with day_schedules (only if attendance is enabled for this office)
        if (office.attendance_enabled && office.day_schedules) {
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

      // Pass offices with per-office leave types
      onSave(insertedOffices, undefined);
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

  // Get selected workdays from day_schedules
  const getSelectedWorkdays = (daySchedules?: DaySchedulesMap): number[] => {
    if (!daySchedules) return [1, 2, 3, 4, 5]; // Default Mon-Fri
    return Object.entries(daySchedules)
      .filter(([_, s]) => s.enabled)
      .map(([d]) => parseInt(d, 10));
  };

  // Get first enabled day for inline time editing
  const getFirstEnabledDay = (daySchedules?: DaySchedulesMap): { key: string; schedule: any } | null => {
    if (!daySchedules) return null;
    const entry = Object.entries(daySchedules).find(([_, s]) => s.enabled);
    if (!entry) return null;
    return { key: entry[0], schedule: entry[1] };
  };

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
          {/* Office Accordion */}
          <Accordion 
            type="single" 
            collapsible 
            value={expandedOffice}
            onValueChange={(v) => setExpandedOffice(v)}
            className="space-y-3"
          >
            {offices.map((office, index) => {
              const isExpanded = expandedOffice === `office-${index}`;
              const isHQ = index === 0;
              const firstDay = getFirstEnabledDay(office.day_schedules);
              
              return (
                <AccordionItem 
                  key={index} 
                  value={`office-${index}`}
                  className={cn(
                    "rounded-lg border px-4 transition-colors",
                    isHQ && "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20",
                    !isHQ && "bg-card"
                  )}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      {isHQ ? (
                        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {office.name || (isHQ ? 'Head Office' : 'New Office')}
                        </div>
                        {!isExpanded && (
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                            {office.address && (
<span className="flex items-center gap-1">
                                {office.address_components?.country_code && (
                                  <span className="text-sm">{getFlagEmoji(office.address_components.country_code)}</span>
                                )}
                                {office.address}
                              </span>
                            )}
                            {office.timezone && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {office.timezone.split('/').pop()?.replace('_', ' ')}
                              </span>
                            )}
                            {office.attendance_enabled && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatWorkdaysSummary(office.day_schedules)}, {formatWorkHoursSummary(office.day_schedules)}{formatBreakSummary(office.day_schedules) && ` · ${formatBreakSummary(office.day_schedules)}`}{formatNetWorkHours(office.day_schedules) && ` · ${formatNetWorkHours(office.day_schedules)}`}
                              </span>
                            )}
                            {office.leave_enabled && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                Year starts {formatYearStart(office)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="pb-4">
                    <div className="space-y-4 pt-2">
                      {/* Basic Info Row */}
                      <div className="flex gap-3 items-start">
                        {/* Office Name - Equal width */}
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">
                            {isHQ ? 'Headquarters Name' : 'Office Name'}
                          </Label>
                          <Input
                            value={office.name}
                            onChange={(e) => updateOffice(index, 'name', e.target.value)}
                            placeholder="e.g., Head Office"
                            className="h-9"
                            disabled={isLoading}
                          />
                        </div>

                        {/* Location - Country + Address */}
                        <div className="flex-[2] min-w-0">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label>
                          <StructuredAddressInput
                            value={extractAddressValue(office)}
                            onChange={(addressValue) => handleAddressValueChange(index, addressValue)}
                            disabled={isLoading}
                            compact
                            allowBusinesses
                            singleRow
                            addressLabel="Address"
                          />
                        </div>

                        {/* Delete Button - Fixed width */}
                        <div className="flex-shrink-0 pt-6">
                          {!isHQ && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeOffice(index);
                              }}
                              disabled={isLoading}
                              className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Settings Grid */}
                      {(hasAttendance || hasLeave) && (
                        <div className={cn(
                          "grid gap-4",
                          hasAttendance && hasLeave 
                            ? "grid-cols-1 md:grid-cols-2" 
                            : "grid-cols-1"
                        )}>
                          {/* Attendance Settings */}
                          {hasAttendance && (
                            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">Attendance Settings</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {office.id && office.attendance_enabled && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadQR(office);
                                      }}
                                      disabled={downloadingQR === office.id || isLoading}
                                      className="h-8 px-2 text-muted-foreground hover:text-primary"
                                    >
                                      {downloadingQR === office.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                      <span className="ml-1.5 text-xs">QR PDF</span>
                                    </Button>
                                  )}
                                  <Switch 
                                    id={`attendance-${index}`}
                                    checked={office.attendance_enabled ?? true}
                                    onCheckedChange={(v) => updateOffice(index, 'attendance_enabled', v)}
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>

                              {!office.attendance_enabled && (
                                <div className="pt-2 space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    Enable to configure:
                                  </p>
                                  <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                                    <li>Work days and office timezone</li>
                                    <li>Daily start and end times</li>
                                    <li>Break schedules</li>
                                    <li>Late arrival thresholds</li>
                                  </ul>
                                </div>
                              )}

                              {office.attendance_enabled && (
                                <>
                              {/* Work Days + Timezone Row */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Work Days</Label>
                                  <WorkdaysChipSelector
                                    value={getSelectedWorkdays(office.day_schedules)}
                                    onChange={(days) => handleWorkdaysChange(index, days)}
                                    disabled={isLoading}
                                    size="lg"
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label className="text-xs text-muted-foreground">Timezone</Label>
                                  <TimezoneSelector
                                    value={office.timezone || 'UTC'}
                                    onChange={(v) => updateOffice(index, 'timezone', v)}
                                    disabled={isLoading}
                                    countryCode={office.address_components?.country_code}
                                    placeholder="Select timezone"
                                  />
                                </div>
                              </div>

                              {/* Work Hours - Inline with Late Threshold */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                                  <Input
                                    type="time"
                                    value={firstDay?.schedule?.start || '09:00'}
                                    onChange={(e) => {
                                      if (firstDay) {
                                        // Update all enabled days with the same start time
                                        const newSchedules = { ...office.day_schedules };
                                        Object.keys(newSchedules!).forEach(key => {
                                          if (newSchedules![key].enabled) {
                                            newSchedules![key] = { ...newSchedules![key], start: e.target.value };
                                          }
                                        });
                                        updateOffice(index, 'day_schedules', newSchedules);
                                      }
                                    }}
                                    className="h-9"
                                    disabled={isLoading}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">End Time</Label>
                                  <Input
                                    type="time"
                                    value={firstDay?.schedule?.end || '17:00'}
                                    onChange={(e) => {
                                      if (firstDay) {
                                        const newSchedules = { ...office.day_schedules };
                                        Object.keys(newSchedules!).forEach(key => {
                                          if (newSchedules![key].enabled) {
                                            newSchedules![key] = { ...newSchedules![key], end: e.target.value };
                                          }
                                        });
                                        updateOffice(index, 'day_schedules', newSchedules);
                                      }
                                    }}
                                    className="h-9"
                                    disabled={isLoading}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    Late Threshold
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[200px]">
                                          <p>Minutes after start time before an employee is marked as late</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={60}
                                      value={firstDay?.schedule?.lateThreshold ?? 15}
                                      onChange={(e) => {
                                        if (firstDay) {
                                          const newSchedules = { ...office.day_schedules };
                                          Object.keys(newSchedules!).forEach(key => {
                                            if (newSchedules![key].enabled) {
                                              newSchedules![key] = { ...newSchedules![key], lateThreshold: parseInt(e.target.value, 10) || 0 };
                                            }
                                          });
                                          updateOffice(index, 'day_schedules', newSchedules);
                                        }
                                      }}
                                      className="h-9 w-20"
                                      disabled={isLoading}
                                    />
                                    <span className="text-xs text-muted-foreground">mins</span>
                                  </div>
                                </div>
                              </div>

                              {/* Break Time - Inline with Net Hours */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Break Start</Label>
                                  <Input
                                    type="time"
                                    value={firstDay?.schedule?.breakStart || '12:00'}
                                    onChange={(e) => {
                                      if (firstDay) {
                                        const newSchedules = { ...office.day_schedules };
                                        Object.keys(newSchedules!).forEach(key => {
                                          if (newSchedules![key].enabled) {
                                            newSchedules![key] = { ...newSchedules![key], breakStart: e.target.value };
                                          }
                                        });
                                        updateOffice(index, 'day_schedules', newSchedules);
                                      }
                                    }}
                                    className="h-9"
                                    disabled={isLoading}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Break End</Label>
                                  <Input
                                    type="time"
                                    value={firstDay?.schedule?.breakEnd || '13:00'}
                                    onChange={(e) => {
                                      if (firstDay) {
                                        const newSchedules = { ...office.day_schedules };
                                        Object.keys(newSchedules!).forEach(key => {
                                          if (newSchedules![key].enabled) {
                                            newSchedules![key] = { ...newSchedules![key], breakEnd: e.target.value };
                                          }
                                        });
                                        updateOffice(index, 'day_schedules', newSchedules);
                                      }
                                    }}
                                    className="h-9"
                                    disabled={isLoading}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Net Working Hours</Label>
                                  <div className="h-9 flex items-center">
                                    <span className="text-sm font-medium text-foreground">
                                      {(() => {
                                        const start = firstDay?.schedule?.start || '09:00';
                                        const end = firstDay?.schedule?.end || '17:00';
                                        const breakStart = firstDay?.schedule?.breakStart || '12:00';
                                        const breakEnd = firstDay?.schedule?.breakEnd || '13:00';
                                        
                                        const parseTime = (time: string) => {
                                          const [hours, minutes] = time.split(':').map(Number);
                                          return hours * 60 + minutes;
                                        };
                                        
                                        const totalMinutes = parseTime(end) - parseTime(start);
                                        const breakMinutes = parseTime(breakEnd) - parseTime(breakStart);
                                        const netMinutes = Math.max(0, totalMinutes - breakMinutes);
                                        
                                        const hours = Math.floor(netMinutes / 60);
                                        const mins = netMinutes % 60;
                                        
                                        if (mins === 0) return `${hours}h`;
                                        return `${hours}h ${mins}m`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              </>
                              )}
                            </div>
                          )}

                          {/* Leave Settings */}
                          {hasLeave && (
                            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">Leave Settings</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {office.leave_enabled && (
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Year Starts</Label>
                                      <YearStartPicker
                                        month={office.leave_year_start_month || 1}
                                        day={office.leave_year_start_day || 1}
                                        onChange={(month, day) => {
                                          updateOfficeMultiple(index, {
                                            leave_year_start_month: month,
                                            leave_year_start_day: day,
                                          });
                                        }}
                                        disabled={isLoading}
                                      />
                                    </div>
                                  )}
                                  <Switch 
                                    id={`leave-${index}`}
                                    checked={office.leave_enabled ?? true}
                                    onCheckedChange={(v) => updateOffice(index, 'leave_enabled', v)}
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>

                              {!office.leave_enabled && (
                                <div className="pt-2 space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    Enable to configure:
                                  </p>
                                  <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                                    <li>Leave year start date</li>
                                    <li>Leave types and default balances</li>
                                    <li>Custom leave policies per office</li>
                                  </ul>
                                </div>
                              )}

                              {office.leave_enabled && (
                                <>

                              {/* Leave Types Customizer - Per Office */}
                              <LeaveTypesCustomizer
                                value={(office.leave_types || []).map(lt => ({
                                  name: lt.name,
                                  category: lt.category,
                                  default_days: lt.default_days,
                                  is_enabled: lt.is_enabled,
                                  is_custom: false,
                                }))}
                                onChange={(config) => {
                                  updateOffice(index, 'leave_types', config.map(lt => ({
                                    name: lt.name,
                                    category: lt.category,
                                    default_days: lt.default_days,
                                    is_enabled: lt.is_enabled,
                                  })));
                                }}
                                disabled={isLoading}
                              />
                              </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Add Office Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addOffice}
            disabled={isLoading}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Office
          </Button>

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
