import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, Save, UserPlus, Search, MapPin, Building2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useTimezone } from "@/hooks/useTimezone";
import { toUTCDateTime } from "@/utils/timezone";

interface AddAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddAttendanceDialog = ({ open, onOpenChange }: AddAttendanceDialogProps) => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { timezone } = useTimezone();
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [recordDate, setRecordDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [locationType, setLocationType] = useState<"office" | "remote">("office");
  const [officeId, setOfficeId] = useState("");
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Fetch employees for selector
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-attendance", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          position,
          department,
          profiles!inner(full_name, avatar_url)
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .order("profiles(full_name)");

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id && open
  });

  // Fetch offices for selector
  const { data: offices = [] } = useQuery({
    queryKey: ["offices-for-attendance", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("offices")
        .select("id, name, city, country")
        .eq("organization_id", currentOrg.id)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id && open
  });

  const filteredEmployees = employees.filter(emp => {
    const name = (emp.profiles as any)?.full_name?.toLowerCase() || "";
    return name.includes(employeeSearch.toLowerCase());
  });

  const calculateWorkHours = (checkIn: string, checkOut: string): number | null => {
    if (!checkIn || !checkOut) return null;
    const [inHours, inMinutes] = checkIn.split(":").map(Number);
    const [outHours, outMinutes] = checkOut.split(":").map(Number);
    const inTotalMinutes = inHours * 60 + inMinutes;
    const outTotalMinutes = outHours * 60 + outMinutes;
    if (outTotalMinutes <= inTotalMinutes) return null;
    return (outTotalMinutes - inTotalMinutes) / 60;
  };

  const handleSave = async () => {
    if (!employeeId) {
      toast.error("Please select a team member");
      return;
    }
    if (!checkInTime) {
      toast.error("Check-in time is required");
      return;
    }
    if (locationType === "office" && !officeId) {
      toast.error("Please select an office");
      return;
    }

    setSaving(true);
    try {
      // Convert local times to UTC for database storage
      const checkInDateTime = toUTCDateTime(recordDate, checkInTime, timezone);
      const checkOutDateTime = checkOutTime 
        ? toUTCDateTime(recordDate, checkOutTime, timezone) 
        : null;

      const { error } = await supabase
        .from("attendance_records")
        .insert({
          employee_id: employeeId,
          organization_id: currentOrg!.id,
          date: recordDate,
          check_in_time: checkInDateTime,
          check_out_time: checkOutDateTime,
          status: locationType === "remote" ? "remote" : "present",
          check_in_office_id: locationType === "office" ? officeId : null,
          check_in_location_name: locationType === "remote" ? locationName : null,
          notes: notes || null,
        });

      if (error) throw error;

      toast.success("Attendance record added successfully");
      queryClient.invalidateQueries({ queryKey: ["org-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      
      // Reset form
      setEmployeeId("");
      setCheckInTime("09:00");
      setCheckOutTime("");
      setLocationType("office");
      setOfficeId("");
      setLocationName("");
      setNotes("");
      setEmployeeSearch("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding attendance:", error);
      toast.error(error.message || "Failed to add attendance record");
    } finally {
      setSaving(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === employeeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Attendance Record
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Team Member Selector */}
          <div className="space-y-2">
            <Label>Team Member *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member">
                  {selectedEmployee && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={(selectedEmployee.profiles as any)?.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {(selectedEmployee.profiles as any)?.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{(selectedEmployee.profiles as any)?.full_name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={(emp.profiles as any)?.avatar_url} />
                          <AvatarFallback className="text-[10px]">
                            {(emp.profiles as any)?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm">{(emp.profiles as any)?.full_name}</span>
                          <span className="text-xs text-muted-foreground">{emp.position}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          {/* Check-in / Check-out Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in Time *</Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out Time</Label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>

          {/* Location Type */}
          <div className="space-y-2">
            <Label>Location Type *</Label>
            <Select value={locationType} onValueChange={(val: "office" | "remote") => setLocationType(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Office</span>
                  </div>
                </SelectItem>
                <SelectItem value="remote">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Remote / WFH</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Office Selector (if office) */}
          {locationType === "office" && (
            <div className="space-y-2">
              <Label>Office *</Label>
              <Select value={officeId} onValueChange={setOfficeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map(office => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name} {office.city && `(${office.city})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Location Name (if remote) */}
          {locationType === "remote" && (
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                placeholder="e.g., Home, Cafe, etc."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this attendance record..."
              rows={2}
            />
          </div>

          {/* Calculated Hours Preview */}
          {checkInTime && checkOutTime && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                Calculated Hours:{" "}
                <span className="font-medium text-foreground">
                  {calculateWorkHours(checkInTime, checkOutTime)?.toFixed(1) || "Invalid"}h
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Add Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
