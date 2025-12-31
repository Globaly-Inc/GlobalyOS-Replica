import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Clock, Save, Loader2, Users, LogOut, UserX, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AttendanceSettingsProps {
  embedded?: boolean;
}

interface ExemptEmployee {
  id: string;
  user_id: string;
  position: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface EmployeeOption {
  id: string;
  user_id: string;
  position: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const AttendanceSettings = ({ embedded = false }: AttendanceSettingsProps) => {
  const { currentOrg, refreshOrganizations } = useOrganization();
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Overtime/DIL settings
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [maxDilDays, setMaxDilDays] = useState("");
  const [hasDilCap, setHasDilCap] = useState(false);
  
  // Multi-session settings
  const [multiSessionEnabled, setMultiSessionEnabled] = useState(true);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState("3");
  
  // Early checkout settings
  const [earlyCheckoutReasonRequired, setEarlyCheckoutReasonRequired] = useState(true);
  
  // Check-in exemption settings
  const [exemptEmployees, setExemptEmployees] = useState<ExemptEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);
  const [exemptSearchOpen, setExemptSearchOpen] = useState(false);
  const [exemptLoading, setExemptLoading] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadSettings();
    }
  }, [currentOrg?.id]);

  const loadSettings = async () => {
    if (!currentOrg) return;
    setLoading(true);

    // Load org settings
    const { data, error } = await supabase
      .from("organizations")
      .select("max_day_in_lieu_days, auto_attendance_adjustments_enabled, multi_session_enabled, max_sessions_per_day, early_checkout_reason_required")
      .eq("id", currentOrg.id)
      .single();

    if (!error && data) {
      setFeatureEnabled(data.auto_attendance_adjustments_enabled || false);
      setHasDilCap(data.max_day_in_lieu_days !== null);
      setMaxDilDays(data.max_day_in_lieu_days !== null ? String(data.max_day_in_lieu_days) : "");
      setMultiSessionEnabled(data.multi_session_enabled ?? true);
      setMaxSessionsPerDay(String(data.max_sessions_per_day ?? 3));
      setEarlyCheckoutReasonRequired(data.early_checkout_reason_required ?? true);
    }

    // Load exempt employees
    const { data: exemptData } = await supabase
      .from("employees")
      .select("id, user_id, position, profiles(full_name, avatar_url)")
      .eq("organization_id", currentOrg.id)
      .eq("checkin_exempt", true)
      .eq("status", "active");

    if (exemptData) {
      setExemptEmployees(exemptData as ExemptEmployee[]);
    }

    // Load all active employees for the dropdown
    const { data: allData } = await supabase
      .from("employees")
      .select("id, user_id, position, profiles(full_name, avatar_url)")
      .eq("organization_id", currentOrg.id)
      .eq("status", "active")
      .order("position");

    if (allData) {
      setAllEmployees(allData.map(emp => ({
        id: emp.id,
        user_id: emp.user_id,
        position: emp.position,
        full_name: (emp.profiles as any)?.full_name || null,
        avatar_url: (emp.profiles as any)?.avatar_url || null,
      })));
    }

    setLoading(false);
  };

  const handleAddExemption = async (employeeId: string) => {
    if (!currentOrg) return;
    setExemptLoading(true);

    try {
      const { error } = await supabase
        .from("employees")
        .update({ checkin_exempt: true })
        .eq("id", employeeId)
        .eq("organization_id", currentOrg.id);

      if (error) throw error;

      // Update local state
      const employee = allEmployees.find(e => e.id === employeeId);
      if (employee) {
        setExemptEmployees(prev => [...prev, {
          id: employee.id,
          user_id: employee.user_id,
          position: employee.position,
          profiles: {
            full_name: employee.full_name,
            avatar_url: employee.avatar_url,
          }
        }]);
      }

      toast.success("Employee exempted from check-in");
    } catch (error: any) {
      toast.error(error.message || "Failed to add exemption");
    } finally {
      setExemptLoading(false);
      setExemptSearchOpen(false);
    }
  };

  const handleRemoveExemption = async (employeeId: string) => {
    if (!currentOrg) return;
    setExemptLoading(true);

    try {
      const { error } = await supabase
        .from("employees")
        .update({ checkin_exempt: false })
        .eq("id", employeeId)
        .eq("organization_id", currentOrg.id);

      if (error) throw error;

      setExemptEmployees(prev => prev.filter(e => e.id !== employeeId));
      toast.success("Employee removed from exemptions");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove exemption");
    } finally {
      setExemptLoading(false);
    }
  };

  const nonExemptEmployees = allEmployees.filter(
    emp => !exemptEmployees.some(ex => ex.id === emp.id)
  );

  const handleSave = async () => {
    if (!currentOrg) return;

    setSaving(true);

    try {
      const updateData: { 
        max_day_in_lieu_days: number | null;
        auto_attendance_adjustments_enabled: boolean;
        multi_session_enabled: boolean;
        max_sessions_per_day: number;
        early_checkout_reason_required: boolean;
      } = {
        max_day_in_lieu_days: null,
        auto_attendance_adjustments_enabled: featureEnabled,
        multi_session_enabled: multiSessionEnabled,
        max_sessions_per_day: parseInt(maxSessionsPerDay) || 3,
        early_checkout_reason_required: earlyCheckoutReasonRequired
      };

      if (hasDilCap) {
        const cap = parseFloat(maxDilDays);
        if (isNaN(cap) || cap < 0) {
          toast.error("Day In Lieu cap must be a positive number");
          setSaving(false);
          return;
        }
        updateData.max_day_in_lieu_days = cap;
      }

      const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", currentOrg.id);

      if (error) throw error;

      await refreshOrganizations();
      toast.success("Attendance settings saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Only administrators can manage attendance settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Settings
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Attendance & Overtime Settings
        </CardTitle>
        <CardDescription>
          Configure how overtime and undertime hours are converted to leave days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Enable Automatic Adjustments</Label>
            <p className="text-sm text-muted-foreground">
              Automatically convert overtime to Day In Lieu and deduct leave for undertime
            </p>
          </div>
          <Switch
            checked={featureEnabled}
            onCheckedChange={setFeatureEnabled}
          />
        </div>

        {featureEnabled && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cap Day In Lieu Accumulation</Label>
                  <p className="text-xs text-muted-foreground">
                    Set a maximum number of Day In Lieu days an employee can accumulate
                  </p>
                </div>
                <Switch
                  checked={hasDilCap}
                  onCheckedChange={setHasDilCap}
                />
              </div>
              
              {hasDilCap && (
                <div className="space-y-2">
                  <Label htmlFor="maxDilDays">Maximum Day In Lieu Days</Label>
                  <Input
                    id="maxDilDays"
                    type="number"
                    min="0"
                    step="0.5"
                    value={maxDilDays}
                    onChange={(e) => setMaxDilDays(e.target.value)}
                    placeholder="e.g., 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Once reached, additional overtime will not add more DIL days
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <h4 className="font-medium text-sm">How it works</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Early check-in / late check-out:</strong> Extra hours accumulate based on each employee&apos;s work schedule. When they reach a full workday, +1 &quot;Day In Lieu&quot; is automatically added.</li>
                <li><strong>Late check-in / early check-out:</strong> Deficit hours accumulate. When they reach a full workday, 1 day is deducted from Day In Lieu first, then Annual Leave.</li>
                <li>Adjustments are processed automatically at end of each day.</li>
              </ul>
            </div>
          </>
        )}

        <Separator className="my-6" />

        {/* Session Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Session Settings</h3>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Allow Multiple Sessions Per Day</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, employees can check-in multiple times per day
              </p>
            </div>
            <Switch
              checked={multiSessionEnabled}
              onCheckedChange={setMultiSessionEnabled}
            />
          </div>

          {multiSessionEnabled && (
            <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
              <Label htmlFor="maxSessions">Maximum Sessions Per Day</Label>
              <Select value={maxSessionsPerDay} onValueChange={setMaxSessionsPerDay}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of times an employee can check-in/out per day
              </p>
            </div>
          )}

          {!multiSessionEnabled && (
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 p-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                When disabled, employees cannot check-in again after checking out for the day. 
                Owner, Admin, and HR can still add/edit attendance records manually.
              </p>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Early Checkout Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Early Checkout</h3>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Require Reason for Early Checkout</Label>
              <p className="text-sm text-muted-foreground">
                Employees must provide a reason when checking out before their scheduled end time
              </p>
            </div>
            <Switch
              checked={earlyCheckoutReasonRequired}
              onCheckedChange={setEarlyCheckoutReasonRequired}
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Check-in Exemptions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Check-in Exemptions</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Employees exempt from check-in won't appear in "Not Checked In" cards and won't receive check-in reminders.
          </p>

          {/* Exempt Employees List */}
          {exemptEmployees.length > 0 && (
            <div className="rounded-lg border divide-y">
              {exemptEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {emp.profiles?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{emp.profiles?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{emp.position}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveExemption(emp.id)}
                    disabled={exemptLoading}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Exempt Employee */}
          <Popover open={exemptSearchOpen} onOpenChange={setExemptSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Search className="h-4 w-4" />
                Add exempt employee...
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" align="start">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {nonExemptEmployees.map((emp) => (
                      <CommandItem
                        key={emp.id}
                        value={`${emp.full_name} ${emp.position}`}
                        onSelect={() => handleAddExemption(emp.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {emp.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm">{emp.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{emp.position}</p>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {exemptEmployees.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No employees are currently exempt from check-in requirements.
            </p>
          )}
        </div>

        <div className="pt-6">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
