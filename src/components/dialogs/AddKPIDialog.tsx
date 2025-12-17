import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, MapPin, FolderKanban, Target, Users, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCreateKpi, useCreateGroupKpi } from "@/services/useKpi";
import { cn } from "@/lib/utils";
import { AIKPIAssist } from "@/components/AIKPIAssist";

interface AddKPIDialogProps {
  children: React.ReactNode;
  defaultQuarter?: number;
  defaultYear?: number;
  defaultType?: "individual" | "group";
  defaultEmployeeId?: string;
}

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

export function AddKPIDialog({
  children,
  defaultQuarter = getCurrentQuarter(),
  defaultYear = getCurrentYear(),
  defaultType = "individual",
  defaultEmployeeId,
}: AddKPIDialogProps) {
  const [open, setOpen] = useState(false);
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { isAdmin, isHR } = useUserRole();
  const createKpi = useCreateKpi();
  const createGroupKpi = useCreateGroupKpi();

  // Form state
  const [kpiType, setKpiType] = useState<"individual" | "group">(defaultType);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [scopeType, setScopeType] = useState<"department" | "office" | "project">("department");
  const [scopeValue, setScopeValue] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [year, setYear] = useState(defaultYear);

  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id, organization_id, manager_id, position, department")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch team members for individual KPI assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["kpi-assignable-employees", currentOrg?.id, currentEmployee?.id, isAdmin, isHR],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];
      
      if (isAdmin || isHR) {
        // Admin/HR: See all employees
        const { data, error } = await supabase
          .from("employees")
          .select("id, position, department, profiles(full_name, avatar_url)")
          .eq("organization_id", currentOrg.id)
          .eq("status", "active")
          .order("profiles(full_name)");
        if (error) throw error;
        return data;
      } else {
        // Manager/User: See self + direct reports
        const { data, error } = await supabase
          .from("employees")
          .select("id, position, department, profiles(full_name, avatar_url)")
          .eq("organization_id", currentOrg.id)
          .eq("status", "active")
          .or(`id.eq.${currentEmployee.id},manager_id.eq.${currentEmployee.id}`)
          .order("profiles(full_name)");
        if (error) throw error;
        return data;
      }
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id && open,
  });

  // Fetch departments from employees
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("department")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");
      if (error) throw error;
      const deptSet = new Set(data.map((e) => e.department).filter(Boolean));
      return Array.from(deptSet).sort();
    },
    enabled: !!currentOrg?.id && open && kpiType === "group",
  });

  // Fetch offices
  const { data: offices = [] } = useQuery({
    queryKey: ["offices", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && open && kpiType === "group",
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && open && kpiType === "group",
  });

  // Fetch member counts for group scope
  const { data: memberCount } = useQuery({
    queryKey: ["member-counts", currentOrg?.id, scopeType, scopeValue],
    queryFn: async () => {
      if (!currentOrg?.id || !scopeValue) return 0;

      if (scopeType === "department") {
        const { count } = await supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id)
          .eq("department", scopeValue)
          .eq("status", "active");
        return count || 0;
      } else if (scopeType === "office") {
        const { count } = await supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id)
          .eq("office_id", scopeValue)
          .eq("status", "active");
        return count || 0;
      } else if (scopeType === "project") {
        const { count } = await supabase
          .from("employee_projects")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id)
          .eq("project_id", scopeValue);
        return count || 0;
      }
      return 0;
    },
    enabled: !!currentOrg?.id && !!scopeValue && open && kpiType === "group",
  });

  // Reset form on dialog open/close
  useEffect(() => {
    if (open) {
      setKpiType(defaultType);
      if (defaultEmployeeId) {
        setEmployeeId(defaultEmployeeId);
      } else if (currentEmployee?.id && teamMembers.length === 1) {
        setEmployeeId(currentEmployee.id);
      }
    }
  }, [open, defaultType, defaultEmployeeId, currentEmployee?.id, teamMembers]);

  // Reset scope value when scope type changes
  useEffect(() => {
    setScopeValue("");
  }, [scopeType]);

  // Set default employee when current employee loads
  useEffect(() => {
    if (currentEmployee?.id && !employeeId && !defaultEmployeeId) {
      setEmployeeId(currentEmployee.id);
    }
  }, [currentEmployee?.id, employeeId, defaultEmployeeId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetValue("");
    setUnit("");
    setScopeValue("");
    setEmployeeId(defaultEmployeeId || currentEmployee?.id || "");
    setKpiType(defaultType);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    if (kpiType === "individual") {
      if (!employeeId) return;
      await createKpi.mutateAsync({
        employeeId,
        title: title.trim(),
        description: description.trim() || undefined,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        unit: unit.trim() || undefined,
        quarter,
        year,
      });
    } else {
      if (!scopeValue) return;
      await createGroupKpi.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        unit: unit.trim() || undefined,
        quarter,
        year,
        scopeType,
        scopeDepartment: scopeType === "department" ? scopeValue : undefined,
        scopeOfficeId: scopeType === "office" ? scopeValue : undefined,
        scopeProjectId: scopeType === "project" ? scopeValue : undefined,
      });
    }

    resetForm();
    setOpen(false);
  };

  const scopeOptions = [
    { value: "department", label: "Department", icon: Building, color: "text-purple-600" },
    { value: "office", label: "Office", icon: MapPin, color: "text-orange-600" },
    { value: "project", label: "Project", icon: FolderKanban, color: "text-blue-600" },
  ];

  const getScopeItems = () => {
    switch (scopeType) {
      case "department":
        return departments.map((d) => ({ id: d, name: d }));
      case "office":
        return offices;
      case "project":
        return projects;
      default:
        return [];
    }
  };

  const getScopeDisplayName = () => {
    if (scopeType === "department") return scopeValue;
    if (scopeType === "office") {
      const office = offices.find((o) => o.id === scopeValue);
      return office?.name || scopeValue;
    }
    if (scopeType === "project") {
      const project = projects.find((p) => p.id === scopeValue);
      return project?.name || scopeValue;
    }
    return scopeValue;
  };

  const getSelectedEmployee = () => {
    return teamMembers.find((m) => m.id === employeeId);
  };

  const handleAISuggestion = (suggestion: {
    title?: string;
    description?: string;
    suggestedTarget?: number | null;
    suggestedUnit?: string | null;
  }) => {
    if (suggestion.title) setTitle(suggestion.title);
    if (suggestion.description) setDescription(suggestion.description);
    if (suggestion.suggestedTarget) setTargetValue(suggestion.suggestedTarget.toString());
    if (suggestion.suggestedUnit) setUnit(suggestion.suggestedUnit);
  };

  const isPending = createKpi.isPending || createGroupKpi.isPending;
  const canCreateGroup = isAdmin || isHR;
  const selectedEmployee = getSelectedEmployee();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Add KPI
          </DialogTitle>
          <DialogDescription>
            Create a new KPI for an individual or a group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* KPI Type Toggle */}
          <div className="space-y-2">
            <Label>KPI Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKpiType("individual")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left",
                  kpiType === "individual"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Individual</p>
                  <p className="text-xs text-muted-foreground">Assign to a person</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => canCreateGroup && setKpiType("group")}
                disabled={!canCreateGroup}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left",
                  kpiType === "group"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30",
                  !canCreateGroup && "opacity-50 cursor-not-allowed"
                )}
              >
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Group</p>
                  <p className="text-xs text-muted-foreground">
                    {canCreateGroup ? "Assign to a team" : "Admin/HR only"}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Individual KPI: Employee Selection */}
          {kpiType === "individual" && (
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => {
                    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
                    return (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {profile?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{profile?.full_name}</span>
                          <span className="text-muted-foreground text-xs">· {member.position}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Group KPI: Scope Selection */}
          {kpiType === "group" && (
            <>
              <div className="space-y-2">
                <Label>Scope Type</Label>
                <RadioGroup
                  value={scopeType}
                  onValueChange={(v) => setScopeType(v as typeof scopeType)}
                  className="grid grid-cols-3 gap-2"
                >
                  {scopeOptions.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 cursor-pointer transition-colors",
                        scopeType === option.value
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                      <option.icon className={cn("h-5 w-5", option.color)} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>
                  Select {scopeType === "department" ? "Department" : scopeType === "office" ? "Office" : "Project"}
                </Label>
                <Select value={scopeValue} onValueChange={setScopeValue}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${scopeType}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getScopeItems().map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scopeValue && memberCount !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>This KPI will apply to {memberCount} team member{memberCount !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* KPI Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">KPI Title *</Label>
              <AIKPIAssist
                type={kpiType}
                field="both"
                currentTitle={title}
                currentDescription={description}
                scopeType={kpiType === "group" ? scopeType : undefined}
                scopeValue={kpiType === "group" ? getScopeDisplayName() : undefined}
                employeeRole={kpiType === "individual" ? selectedEmployee?.position : undefined}
                department={kpiType === "individual" ? selectedEmployee?.department : undefined}
                onSuggestion={handleAISuggestion}
                disabled={kpiType === "individual" ? !employeeId : !scopeValue}
              />
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Quarterly Revenue Target"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <AIKPIAssist
                type={kpiType}
                field="description"
                currentTitle={title}
                currentDescription={description}
                scopeType={kpiType === "group" ? scopeType : undefined}
                scopeValue={kpiType === "group" ? getScopeDisplayName() : undefined}
                employeeRole={kpiType === "individual" ? selectedEmployee?.position : undefined}
                department={kpiType === "individual" ? selectedEmployee?.department : undefined}
                onSuggestion={handleAISuggestion}
                disabled={kpiType === "individual" ? !employeeId : !scopeValue}
              />
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the KPI..."
              rows={2}
            />
          </div>

          {/* Target and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Value</Label>
              <Input
                id="target"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., %, $, tasks"
              />
            </div>
          </div>

          {/* Period Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((q) => (
                    <SelectItem key={q} value={q.toString()}>
                      Q{q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !title.trim() ||
              (kpiType === "individual" && !employeeId) ||
              (kpiType === "group" && !scopeValue) ||
              isPending
            }
          >
            {isPending ? "Creating..." : "Create KPI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
