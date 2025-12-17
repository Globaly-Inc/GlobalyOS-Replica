import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Clock, Save, Loader2, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

export const AttendanceSettings = () => {
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

  useEffect(() => {
    if (currentOrg) {
      loadSettings();
    }
  }, [currentOrg?.id]);

  const loadSettings = async () => {
    if (!currentOrg) return;
    setLoading(true);

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

    setLoading(false);
  };

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
