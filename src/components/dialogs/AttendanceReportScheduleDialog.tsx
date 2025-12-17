import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Mail, Calendar, Clock, Users, Sparkles, Send } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

interface AttendanceReportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}));

function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export const AttendanceReportScheduleDialog = ({
  open,
  onOpenChange,
}: AttendanceReportScheduleDialogProps) => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [includeAISummary, setIncludeAISummary] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [recipients, setRecipients] = useState({
    owner: true,
    admin: true,
    hr: true,
    manager: false,
  });

  // Fetch existing schedule
  const { data: schedule } = useQuery({
    queryKey: ["attendance-report-schedule", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      const { data, error } = await supabase
        .from("attendance_report_schedules")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!currentOrg?.id && open,
  });

  // Populate form from existing schedule
  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      setFrequency(schedule.frequency as "weekly" | "monthly");
      setDayOfWeek(schedule.day_of_week || 1);
      setDayOfMonth(schedule.day_of_month || 1);
      setTimeOfDay(schedule.time_of_day?.substring(0, 5) || "09:00");
      setIncludeAISummary(schedule.include_ai_summary ?? true);
      setIncludeCharts(schedule.include_charts ?? true);
      if (schedule.recipients) {
        const r = schedule.recipients as any;
        setRecipients({
          owner: r.owner ?? true,
          admin: r.admin ?? true,
          hr: r.hr ?? true,
          manager: r.manager ?? false,
        });
      }
    }
  }, [schedule]);

  const handleSave = async () => {
    if (!currentOrg?.id) return;

    setSaving(true);
    try {
      const scheduleData = {
        organization_id: currentOrg.id,
        enabled,
        frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek : null,
        day_of_month: frequency === "monthly" ? dayOfMonth : null,
        time_of_day: timeOfDay,
        include_ai_summary: includeAISummary,
        include_charts: includeCharts,
        recipients,
        updated_at: new Date().toISOString(),
      };

      if (schedule?.id) {
        // Update existing
        const { error } = await supabase
          .from("attendance_report_schedules")
          .update(scheduleData)
          .eq("id", schedule.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("attendance_report_schedules")
          .insert(scheduleData);
        if (error) throw error;
      }

      toast.success("Report schedule saved successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance-report-schedule"] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error(error.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestReport = async () => {
    if (!currentOrg?.id) return;

    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("send-attendance-report", {
        body: {
          organizationId: currentOrg.id,
          isTest: true,
          includeAISummary,
          includeCharts,
        },
      });

      if (error) throw error;
      toast.success("Test report sent! Check your email.");
    } catch (error: any) {
      console.error("Error sending test report:", error);
      toast.error(error.message || "Failed to send test report");
    } finally {
      setSendingTest(false);
    }
  };

  const getScheduleDescription = () => {
    if (!enabled) return "Automatic reports are disabled";
    if (frequency === "weekly") {
      return `Every ${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label} at ${timeOfDay}`;
    }
    return `${DAYS_OF_MONTH.find(d => d.value === dayOfMonth)?.label} of each month at ${timeOfDay}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto AI Reporting
          </DialogTitle>
          <DialogDescription>
            Schedule automatic attendance reports with AI-powered summaries
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable Auto Reports</Label>
              <p className="text-xs text-muted-foreground">
                {getScheduleDescription()}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              {/* Frequency */}
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(val: "weekly" | "monthly") => setFrequency(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Weekly
                      </div>
                    </SelectItem>
                    <SelectItem value="monthly">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Monthly
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Day Selection */}
              <div className="grid grid-cols-2 gap-4">
                {frequency === "weekly" ? (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select value={String(dayOfWeek)} onValueChange={(val) => setDayOfWeek(Number(val))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Select value={String(dayOfMonth)} onValueChange={(val) => setDayOfMonth(Number(val))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_MONTH.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                  />
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-3">
                <Label>Recipients</Label>
                <Card className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Owners</span>
                    </div>
                    <Checkbox
                      checked={recipients.owner}
                      onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, owner: !!checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Admins</span>
                    </div>
                    <Checkbox
                      checked={recipients.admin}
                      onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, admin: !!checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">HR</span>
                    </div>
                    <Checkbox
                      checked={recipients.hr}
                      onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, hr: !!checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Managers (their team only)</span>
                      <Badge variant="outline" className="text-xs">Beta</Badge>
                    </div>
                    <Checkbox
                      checked={recipients.manager}
                      onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, manager: !!checked }))}
                    />
                  </div>
                </Card>
              </div>

              {/* Content Options */}
              <div className="space-y-3">
                <Label>Report Content</Label>
                <Card className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Include AI Summary</span>
                    </div>
                    <Switch checked={includeAISummary} onCheckedChange={setIncludeAISummary} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Include Trend Charts</span>
                    </div>
                    <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} />
                  </div>
                </Card>
              </div>

              {/* Send Test */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendTestReport}
                disabled={sendingTest}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingTest ? "Sending..." : "Send Test Report"}
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceReportScheduleDialog;
