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
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, FolderKanban, Target, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCreateGroupKpi } from "@/services/useKpi";
import { cn } from "@/lib/utils";

interface CreateGroupKPIDialogProps {
  children: React.ReactNode;
  defaultQuarter?: number;
  defaultYear?: number;
}

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

export function CreateGroupKPIDialog({
  children,
  defaultQuarter = getCurrentQuarter(),
  defaultYear = getCurrentYear(),
}: CreateGroupKPIDialogProps) {
  const [open, setOpen] = useState(false);
  const { currentOrg } = useOrganization();
  const createGroupKpi = useCreateGroupKpi();

  // Form state
  const [scopeType, setScopeType] = useState<"department" | "office" | "project">("department");
  const [scopeValue, setScopeValue] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [year, setYear] = useState(defaultYear);

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
    enabled: !!currentOrg?.id && open,
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
    enabled: !!currentOrg?.id && open,
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
    enabled: !!currentOrg?.id && open,
  });

  // Fetch member counts
  const { data: memberCounts } = useQuery({
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
    enabled: !!currentOrg?.id && !!scopeValue && open,
  });

  // Reset scope value when scope type changes
  useEffect(() => {
    setScopeValue("");
  }, [scopeType]);

  const handleSubmit = async () => {
    if (!title.trim() || !scopeValue) return;

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

    // Reset form and close
    setTitle("");
    setDescription("");
    setTargetValue("");
    setUnit("");
    setScopeValue("");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Create Group KPI
          </DialogTitle>
          <DialogDescription>
            Create a KPI that applies to all members of a department, office, or project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Scope Type Selection */}
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

          {/* Scope Value Selection */}
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
            {scopeValue && memberCounts !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>This KPI will apply to {memberCounts} team member{memberCounts !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* KPI Title */}
          <div className="space-y-2">
            <Label htmlFor="title">KPI Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Quarterly Revenue Target"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
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
            disabled={!title.trim() || !scopeValue || createGroupKpi.isPending}
          >
            {createGroupKpi.isPending ? "Creating..." : "Create Group KPI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
