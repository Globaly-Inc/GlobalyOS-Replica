import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Clock, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

export const AttendanceSettings = () => {
  const { currentOrg, refreshOrganizations } = useOrganization();
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [workdayHours, setWorkdayHours] = useState("8");
  const [maxDilDays, setMaxDilDays] = useState("");
  const [hasDilCap, setHasDilCap] = useState(false);

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
      .select("workday_hours, max_day_in_lieu_days, auto_attendance_adjustments_enabled")
      .eq("id", currentOrg.id)
      .single();

    if (!error && data) {
      setFeatureEnabled(data.auto_attendance_adjustments_enabled || false);
      setWorkdayHours(String(data.workday_hours || 8));
      setHasDilCap(data.max_day_in_lieu_days !== null);
      setMaxDilDays(data.max_day_in_lieu_days !== null ? String(data.max_day_in_lieu_days) : "");
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentOrg) return;

    const hours = parseFloat(workdayHours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      toast.error("Workday hours must be between 0 and 24");
      return;
    }

    setSaving(true);

    try {
      const updateData: { 
        workday_hours: number; 
        max_day_in_lieu_days: number | null;
        auto_attendance_adjustments_enabled: boolean;
      } = {
        workday_hours: hours,
        max_day_in_lieu_days: null,
        auto_attendance_adjustments_enabled: featureEnabled
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workdayHours">Workday Hours</Label>
                <Input
                  id="workdayHours"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={workdayHours}
                  onChange={(e) => setWorkdayHours(e.target.value)}
                  placeholder="8"
                />
                <p className="text-xs text-muted-foreground">
                  Hours that equal 1 full day for overtime/undertime conversion
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
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
                <li><strong>Early check-in / late check-out:</strong> Extra hours accumulate. When they reach {workdayHours || 8} hours, +1 &quot;Day In Lieu&quot; is automatically added.</li>
                <li><strong>Late check-in / early check-out:</strong> Deficit hours accumulate. When they reach {workdayHours || 8} hours, 1 day is deducted from Day In Lieu first, then Annual Leave.</li>
                <li>Adjustments are processed automatically at end of each day.</li>
              </ul>
            </div>
          </>
        )}

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
