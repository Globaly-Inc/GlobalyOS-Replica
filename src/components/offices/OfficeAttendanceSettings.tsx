 import { useState, useEffect } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Button } from "@/components/ui/button";
 import { Switch } from "@/components/ui/switch";
 import { Label } from "@/components/ui/label";
 import { Loader2, Clock, Save, QrCode, Users, TrendingUp, LogOut, UserMinus } from "lucide-react";
 import { useOrganization } from "@/hooks/useOrganization";
 import { useCurrentEmployee } from "@/services/useCurrentEmployee";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import {
   useOfficeAttendanceSettings,
   useUpdateOfficeAttendanceSettings,
   useOfficeAttendanceExemptions,
   useAddAttendanceExemption,
   useRemoveAttendanceExemption,
   type OfficeAttendanceSettings as SettingsType,
 } from "@/hooks/useOfficeAttendanceSettings";
 import { CheckInMethodsTab } from "./attendance/CheckInMethodsTab";
 import { SessionsTab } from "./attendance/SessionsTab";
 import { OvertimeTab } from "./attendance/OvertimeTab";
 import { AutoCheckoutTab } from "./attendance/AutoCheckoutTab";
 import { ExemptionsTab } from "./attendance/ExemptionsTab";
 
 interface OfficeAttendanceSettingsProps {
   officeId: string;
   organizationId: string;
  embedded?: boolean;
 }
 
export const OfficeAttendanceSettings = ({ officeId, organizationId, embedded = false }: OfficeAttendanceSettingsProps) => {
   const { data: settings, isLoading } = useOfficeAttendanceSettings(officeId);
   const { data: exemptions = [], isLoading: exemptionsLoading } = useOfficeAttendanceExemptions(officeId);
   const { data: currentEmployee } = useCurrentEmployee();
   const updateSettings = useUpdateOfficeAttendanceSettings();
   const addExemption = useAddAttendanceExemption();
   const removeExemption = useRemoveAttendanceExemption();
 
   // Local state for editing
   const [localSettings, setLocalSettings] = useState<Partial<SettingsType> | null>(null);
   const [hasChanges, setHasChanges] = useState(false);
 
   // Fetch leave types for this office
   const { data: leaveTypes = [] } = useQuery({
     queryKey: ['office-leave-types', officeId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('office_leave_types')
         .select('id, name')
         .eq('office_id', officeId)
         .order('name');
 
       if (error) throw error;
       return data || [];
     },
     enabled: !!officeId,
   });
 
   // Initialize local state when settings load
   useEffect(() => {
     if (settings) {
       setLocalSettings(settings);
       setHasChanges(false);
     }
   }, [settings]);
 
   const handleSettingChange = (field: string, value: any) => {
     setLocalSettings(prev => prev ? { ...prev, [field]: value } : null);
     setHasChanges(true);
   };
 
   const handleMethodChange = (workType: 'office' | 'hybrid' | 'remote', methods: string[]) => {
     const field = `${workType}_checkin_methods`;
     handleSettingChange(field, methods);
   };
 
   const handleSave = () => {
     if (!localSettings) return;
 
     const {
       id,
       office_id,
       organization_id,
       created_at,
       updated_at,
       ...settingsToSave
     } = localSettings as SettingsType;
 
     updateSettings.mutate(
       { officeId, settings: settingsToSave },
       { onSuccess: () => setHasChanges(false) }
     );
   };
 
   const handleAddExemption = (employeeId: string) => {
     addExemption.mutate({
       officeId,
       employeeId,
       organizationId,
       exemptedBy: currentEmployee?.id,
     });
   };
 
   const handleRemoveExemption = (exemptionId: string) => {
     removeExemption.mutate({ exemptionId, officeId });
   };
 
   if (isLoading || !localSettings) {
    if (embedded) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
     return (
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Clock className="h-5 w-5" />
             Attendance Settings
           </CardTitle>
         </CardHeader>
         <CardContent className="flex items-center justify-center py-8">
           <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
         </CardContent>
       </Card>
     );
   }
 
  const content = (
    <>
      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="checkin" className="gap-1.5 text-xs">
            <QrCode className="h-3.5 w-3.5" />
            Check-in Methods
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="overtime" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            Overtime
          </TabsTrigger>
          <TabsTrigger value="autocheckout" className="gap-1.5 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Auto Checkout
          </TabsTrigger>
          <TabsTrigger value="exemptions" className="gap-1.5 text-xs">
            <UserMinus className="h-3.5 w-3.5" />
            Exemptions
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="checkin" className="mt-0">
            <CheckInMethodsTab
              officeCheckinMethods={localSettings.office_checkin_methods || ['qr', 'location']}
              hybridCheckinMethods={localSettings.hybrid_checkin_methods || ['qr', 'location', 'remote']}
              remoteCheckinMethods={localSettings.remote_checkin_methods || ['remote']}
              requireLocationForOffice={localSettings.require_location_for_office ?? true}
              requireLocationForHybrid={localSettings.require_location_for_hybrid ?? false}
              locationRadiusMeters={localSettings.location_radius_meters ?? 100}
              onMethodChange={handleMethodChange}
              onLocationSettingsChange={handleSettingChange}
            />
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <SessionsTab
              multiSessionEnabled={localSettings.multi_session_enabled ?? true}
              maxSessionsPerDay={localSettings.max_sessions_per_day ?? 3}
              earlyCheckoutReasonRequired={localSettings.early_checkout_reason_required ?? true}
              onSettingChange={handleSettingChange}
            />
          </TabsContent>

          <TabsContent value="overtime" className="mt-0">
            <OvertimeTab
              autoAdjustmentsEnabled={localSettings.auto_adjustments_enabled ?? false}
              overtimeCreditLeaveTypeId={localSettings.overtime_credit_leave_type_id ?? null}
              undertimeDebitLeaveTypeId={localSettings.undertime_debit_leave_type_id ?? null}
              undertimeFallbackLeaveTypeId={localSettings.undertime_fallback_leave_type_id ?? null}
              maxDilDays={localSettings.max_dil_days ?? null}
              minOvertimeMinutes={localSettings.min_overtime_minutes ?? 30}
              minUndertimeMinutes={localSettings.min_undertime_minutes ?? 15}
              leaveTypes={leaveTypes}
              onSettingChange={handleSettingChange}
            />
          </TabsContent>

          <TabsContent value="autocheckout" className="mt-0">
            <AutoCheckoutTab
              autoCheckoutEnabled={localSettings.auto_checkout_enabled ?? false}
              autoCheckoutAfterMinutes={localSettings.auto_checkout_after_minutes ?? 60}
              autoCheckoutStatus={localSettings.auto_checkout_status ?? 'present'}
              onSettingChange={handleSettingChange}
            />
          </TabsContent>

          <TabsContent value="exemptions" className="mt-0">
            <ExemptionsTab
              officeId={officeId}
              exemptions={exemptions}
              isLoading={exemptionsLoading}
              onAddExemption={handleAddExemption}
              onRemoveExemption={handleRemoveExemption}
              isAdding={addExemption.isPending}
              isRemoving={removeExemption.isPending}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Save button - show for all tabs except exemptions (which saves immediately) */}
      {hasChanges && (
        <div className="pt-4 border-t flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attendance Rules
              </CardTitle>
              <CardDescription>
                Configure check-in rules and policies for this office
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="attendance-enabled" className="text-sm">Enabled</Label>
                <Switch
                  id="attendance-enabled"
                  checked={localSettings.attendance_enabled ?? true}
                  onCheckedChange={(checked) => handleSettingChange('attendance_enabled', checked)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {content}
        </CardContent>
      </Card>
    );
  }

   return (
     <Card>
       <CardHeader className="pb-3">
         <div className="flex items-start justify-between">
           <div className="space-y-1">
             <CardTitle className="flex items-center gap-2">
               <Clock className="h-5 w-5" />
               Attendance Settings
             </CardTitle>
             <CardDescription>
               Configure check-in rules and policies for this office
             </CardDescription>
           </div>
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-2">
               <Label htmlFor="attendance-enabled" className="text-sm">Enabled</Label>
               <Switch
                 id="attendance-enabled"
                 checked={localSettings.attendance_enabled ?? true}
                 onCheckedChange={(checked) => handleSettingChange('attendance_enabled', checked)}
               />
             </div>
           </div>
         </div>
       </CardHeader>
 
       <CardContent className="space-y-4">
        {content}
       </CardContent>
     </Card>
   );
 };