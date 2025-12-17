import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Mail, Users, User, Sparkles, Send, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import type { Json } from "@/integrations/supabase/types";

interface AttendanceReportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScheduleItem {
  id: string;
  frequency: "weekly" | "monthly" | "quarterly" | "annual";
  day_of_week?: number;
  day_of_month?: number;
  quarter_month?: number;
  month_of_year?: number;
  time_of_day: string;
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

const MONTHS_OF_YEAR = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const QUARTER_MONTHS = [
  { value: 1, label: "1st month" },
  { value: 2, label: "2nd month" },
  { value: 3, label: "3rd month" },
];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

const createDefaultSchedule = (): ScheduleItem => ({
  id: crypto.randomUUID(),
  frequency: "weekly",
  day_of_week: 1,
  day_of_month: 1,
  quarter_month: 1,
  month_of_year: 1,
  time_of_day: "09:00",
});

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
  const [schedules, setSchedules] = useState<ScheduleItem[]>([createDefaultSchedule()]);
  const [includeAISummary, setIncludeAISummary] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummaryCards, setIncludeSummaryCards] = useState(true);
  const [recipients, setRecipients] = useState({
    owner: true,
    admin: true,
    hr: true,
    manager: false,
    user: false,
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
      setEnabled(schedule.enabled ?? false);
      setIncludeAISummary(schedule.include_ai_summary ?? true);
      setIncludeCharts(schedule.include_charts ?? true);
      setIncludeSummaryCards(schedule.include_summary_cards ?? true);
      
      // Load schedules array or migrate from old format
      const existingSchedules = schedule.schedules as unknown as ScheduleItem[] | null;
      if (existingSchedules && Array.isArray(existingSchedules) && existingSchedules.length > 0) {
        setSchedules(existingSchedules);
      } else if (schedule.frequency) {
        // Migrate from old single schedule format
        setSchedules([{
          id: crypto.randomUUID(),
          frequency: schedule.frequency as ScheduleItem["frequency"],
          day_of_week: schedule.day_of_week ?? 1,
          day_of_month: schedule.day_of_month ?? 1,
          quarter_month: 1,
          month_of_year: 1,
          time_of_day: schedule.time_of_day?.substring(0, 5) || "09:00",
        }]);
      }
      
      if (schedule.recipients) {
        const r = schedule.recipients as any;
        setRecipients({
          owner: r.owner ?? true,
          admin: r.admin ?? true,
          hr: r.hr ?? true,
          manager: r.manager ?? false,
          user: r.user ?? false,
        });
      }
    }
  }, [schedule]);

  const addSchedule = () => {
    setSchedules(prev => [...prev, createDefaultSchedule()]);
  };

  const removeSchedule = (id: string) => {
    if (schedules.length <= 1) return;
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const updateSchedule = (id: string, updates: Partial<ScheduleItem>) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSave = async () => {
    if (!currentOrg?.id) return;

    setSaving(true);
    try {
      const scheduleData = {
        organization_id: currentOrg.id,
        enabled,
        schedules: JSON.parse(JSON.stringify(schedules)) as Json,
        // Keep legacy fields populated with first schedule for backward compatibility
        frequency: schedules[0]?.frequency || "weekly",
        day_of_week: schedules[0]?.frequency === "weekly" ? schedules[0]?.day_of_week : null,
        day_of_month: ["monthly", "quarterly", "annual"].includes(schedules[0]?.frequency || "") ? schedules[0]?.day_of_month : null,
        time_of_day: schedules[0]?.time_of_day || "09:00",
        include_ai_summary: includeAISummary,
        include_charts: includeCharts,
        include_summary_cards: includeSummaryCards,
        recipients: recipients as unknown as Json,
        updated_at: new Date().toISOString(),
      };

      if (schedule?.id) {
        const { error } = await supabase
          .from("attendance_report_schedules")
          .update(scheduleData)
          .eq("id", schedule.id);
        if (error) throw error;
      } else {
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
          includeSummaryCards,
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

  const getScheduleDescription = (item: ScheduleItem): string => {
    const time = item.time_of_day || "09:00";
    switch (item.frequency) {
      case "weekly":
        return `Weekly on ${DAYS_OF_WEEK.find(d => d.value === item.day_of_week)?.label || "Monday"} at ${time}`;
      case "monthly":
        return `Monthly on the ${DAYS_OF_MONTH.find(d => d.value === item.day_of_month)?.label || "1st"} at ${time}`;
      case "quarterly":
        return `Quarterly (${QUARTER_MONTHS.find(m => m.value === item.quarter_month)?.label || "1st month"}, ${DAYS_OF_MONTH.find(d => d.value === item.day_of_month)?.label || "1st"}) at ${time}`;
      case "annual":
        return `Annually on ${MONTHS_OF_YEAR.find(m => m.value === item.month_of_year)?.label || "January"} ${item.day_of_month || 1}${getOrdinalSuffix(item.day_of_month || 1)} at ${time}`;
      default:
        return "";
    }
  };

  const getAllSchedulesDescription = () => {
    if (!enabled || schedules.length === 0) return "Automatic reports are disabled";
    return schedules.map(s => getScheduleDescription(s)).join("; ");
  };

  const renderDaySelector = (item: ScheduleItem) => {
    switch (item.frequency) {
      case "weekly":
        return (
          <Select 
            value={String(item.day_of_week ?? 1)} 
            onValueChange={(val) => updateSchedule(item.id, { day_of_week: Number(val) })}
          >
            <SelectTrigger className="w-[100px]">
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
        );
      case "monthly":
        return (
          <Select 
            value={String(item.day_of_month ?? 1)} 
            onValueChange={(val) => updateSchedule(item.id, { day_of_month: Number(val) })}
          >
            <SelectTrigger className="w-[80px]">
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
        );
      case "quarterly":
        return (
          <div className="flex gap-1">
            <Select 
              value={String(item.quarter_month ?? 1)} 
              onValueChange={(val) => updateSchedule(item.id, { quarter_month: Number(val) })}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTER_MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={String(item.day_of_month ?? 1)} 
              onValueChange={(val) => updateSchedule(item.id, { day_of_month: Number(val) })}
            >
              <SelectTrigger className="w-[70px]">
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
        );
      case "annual":
        return (
          <div className="flex gap-1">
            <Select 
              value={String(item.month_of_year ?? 1)} 
              onValueChange={(val) => updateSchedule(item.id, { month_of_year: Number(val) })}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_OF_YEAR.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={String(item.day_of_month ?? 1)} 
              onValueChange={(val) => updateSchedule(item.id, { day_of_month: Number(val) })}
            >
              <SelectTrigger className="w-[70px]">
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
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
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
              <p className="text-xs text-muted-foreground max-w-md truncate">
                {getAllSchedulesDescription()}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              {/* Schedules Table */}
              <div className="space-y-3">
                <Label>Schedules</Label>
                <Card className="p-3">
                  {/* Header Row */}
                  <div className="grid grid-cols-[100px_1fr_70px_36px] gap-2 mb-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Frequency</span>
                    <span>Day</span>
                    <span>Time</span>
                    <span></span>
                  </div>
                  
                  {/* Schedule Rows */}
                  <div className="space-y-2">
                    {schedules.map((item) => (
                      <div key={item.id} className="grid grid-cols-[100px_1fr_70px_36px] gap-2 items-center">
                        <Select 
                          value={item.frequency} 
                          onValueChange={(val: ScheduleItem["frequency"]) => updateSchedule(item.id, { frequency: val })}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex-1">
                          {renderDaySelector(item)}
                        </div>
                        
                        <Input
                          type="time"
                          value={item.time_of_day}
                          onChange={(e) => updateSchedule(item.id, { time_of_day: e.target.value })}
                          className="w-[70px] h-9"
                        />
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSchedule(item.id)}
                          disabled={schedules.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 text-primary"
                    onClick={addSchedule}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Schedule
                  </Button>
                </Card>
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
                    </div>
                    <Checkbox
                      checked={recipients.manager}
                      onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, manager: !!checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Users (their own attendance only)</span>
                    </div>
                    <Checkbox
                      checked={recipients.user}
                      onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, user: !!checked }))}
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
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Include Summary Cards</span>
                    </div>
                    <Switch checked={includeSummaryCards} onCheckedChange={setIncludeSummaryCards} />
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
