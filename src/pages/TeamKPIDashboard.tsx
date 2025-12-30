import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { OrgLink } from "@/components/OrgLink";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  LineChart,
  FileText,
  Building,
  FolderKanban,
  X,
  Filter,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarDays,
  Plus,
  LayoutGrid,
  Eye,
  Globe,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { useKpiDashboardFilters } from "@/hooks/useKpiDashboardFilters";
import { cn } from "@/lib/utils";
import { KPITemplatesDialog } from "@/components/dialogs/KPITemplatesDialog";
import { EditKPIDialog } from "@/components/dialogs/EditKPIDialog";
import { AddKPIDialog } from "@/components/dialogs/AddKPIDialog";
import { useGroupKpis, useOrganizationKpis } from "@/services/useKpi";
import { OrganisationKpiCard } from "@/components/kpi";
import { UnifiedKpiCard } from "@/components/kpi/UnifiedKpiCard";
import { KpiBulkActionsBar, SelectedKpi } from "@/components/kpi/KpiBulkActionsBar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { Kpi } from "@/types/kpi";
import { toast } from "sonner";

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

const TeamKPIDashboard = () => {
  const { user } = useAuth();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { buildOrgPath } = useOrgNavigation();
  
  const {
    quarter, setQuarter,
    year, setYear,
    departmentFilter, setDepartmentFilter,
    projectFilter, setProjectFilter,
    officeFilter, setOfficeFilter,
    selectedEmployees, setSelectedEmployees,
    clearFilters,
  } = useKpiDashboardFilters();
  
  // Employee filter popover state
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  
  // Mobile filter drawer state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Bulk selection state
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Edit/Delete state
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [deletingKpiId, setDeletingKpiId] = useState<string | null>(null);

  // Get current employee using centralized hook
  const { data: currentEmployee, isLoading: loadingCurrentEmployee } = useCurrentEmployee();

  // Real-time subscription for instant KPI updates
  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel('kpis-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kpis',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          // Invalidate all KPI-related queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['team-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['employee-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['group-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['team-kpis-historical'] });
          queryClient.invalidateQueries({ queryKey: ['employee-inherited-kpis'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);

  // Check if current user has direct reports (is a manager)
  const { data: directReportsCount = 0 } = useQuery({
    queryKey: ["has-direct-reports", currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return 0;
      const { count } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("manager_id", currentEmployee.id)
        .eq("status", "active");
      return count || 0;
    },
    enabled: !!currentEmployee?.id,
  });

  const isManager = directReportsCount > 0;

  // Fetch team members based on role:
  // - Owner/Admin/HR: See all employees
  // - Manager: See self + direct reports
  // - User: See only self
  const { data: teamMembers = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["team-kpi-members", currentEmployee?.id, isAdmin, isHR, isManager, currentOrg?.id, roleLoading],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      
      if (isAdmin || isHR) {
        // Admin/HR: See all employees
        const { data, error } = await supabase
          .from("employees")
          .select("id, position, department, manager_id, office_id, profiles(full_name, avatar_url)")
          .eq("organization_id", currentEmployee.organization_id)
          .eq("status", "active");
        if (error) throw error;
        return data;
      } else {
        // Manager/User: See self + direct reports (if any)
        const { data, error } = await supabase
          .from("employees")
          .select("id, position, department, manager_id, office_id, profiles(full_name, avatar_url)")
          .eq("organization_id", currentEmployee.organization_id)
          .eq("status", "active")
          .or(`id.eq.${currentEmployee.id},manager_id.eq.${currentEmployee.id}`);
        if (error) throw error;
        return data;
      }
    },
    enabled: !!currentEmployee?.id && !roleLoading, // Wait for role to load
  });

  // Helper to determine if user can edit a specific KPI
  const canEditKpi = (kpi: Kpi) => {
    if (isOwner || isAdmin) return true; // Owner/Admin can edit all
    
    // User can always edit their own KPIs
    if (kpi.employee_id === currentEmployee?.id) return true;
    
    // Manager can edit their direct reports' KPIs
    const employee = teamMembers.find(m => m.id === kpi.employee_id);
    if (employee?.manager_id === currentEmployee?.id) return true;
    
    return false;
  };

  // Helper to determine if user can DELETE a specific KPI
  // Only Owner, Admin, and Manager (for subordinates' KPIs) can delete - NOT Self
  const canDeleteKpi = (kpi: Kpi) => {
    // Owner and Admin can delete all
    if (isOwner || isAdmin) return true;
    
    // Manager can delete their direct reports' KPIs (NOT their own)
    if (kpi.employee_id && kpi.employee_id !== currentEmployee?.id) {
      const employee = teamMembers.find(m => m.id === kpi.employee_id);
      if (employee?.manager_id === currentEmployee?.id) return true;
    }
    
    // Self CANNOT delete their own KPIs
    // No other users can delete
    return false;
  };

  // Helper to determine if user can EDIT a Group KPI
  // Only KPI Owners (from kpi_owners), Owner, or Admin can edit Group KPIs
  const canEditGroupKpi = (kpi: any) => {
    if (isOwner || isAdmin) return true;
    
    // Check if current employee is in the kpi_owners array
    const owners = kpi.kpi_owners || [];
    return owners.some((owner: any) => owner.employee_id === currentEmployee?.id);
  };

  // Fetch projects for filter
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
    enabled: !!currentOrg?.id,
  });

  // Fetch offices for filter
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
    enabled: !!currentOrg?.id,
  });

  // Fetch employee-project mappings
  const { data: employeeProjects = [] } = useQuery({
    queryKey: ["employee-projects", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("employee_projects")
        .select("employee_id, project_id")
        .eq("organization_id", currentOrg.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch group KPIs (quarter 0 = all quarters/annual)
  const { data: groupKpis = [], isLoading: loadingGroupKpis } = useGroupKpis(
    quarter !== 0 ? quarter : undefined,
    year
  );

  // Fetch organization KPIs
  const { data: organizationKpis = [], isLoading: loadingOrgKpis } = useOrganizationKpis(
    quarter !== 0 ? quarter : undefined,
    year
  );

  // Fetch all KPIs for the team (based on view mode)
  const { data: teamKPIs = [], isLoading: loadingKPIs } = useQuery({
    queryKey: ["team-kpis", teamMembers.map(t => t.id), quarter, year],
    queryFn: async () => {
      if (teamMembers.length === 0) return [];
      
      let query = supabase
        .from("kpis")
        .select("*")
        .in("employee_id", teamMembers.map(t => t.id))
        .eq("year", year);
      
      // Only filter by quarter when a specific quarter is selected (1-4)
      if (quarter !== 0) {
        query = query.eq("quarter", quarter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      // Filter to only individual KPIs
      return (data || []).filter((kpi: any) => !kpi.scope_type || kpi.scope_type === 'individual');
    },
    enabled: teamMembers.length > 0,
  });
  
  // Delete KPI mutation
  const deleteMutation = useMutation({
    mutationFn: async (kpiId: string) => {
      const { error } = await supabase
        .from("kpis")
        .delete()
        .eq("id", kpiId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["employee-kpis"] });
      toast.success("KPI deleted successfully");
      setDeletingKpiId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete KPI");
      console.error(error);
    },
  });

  // Bulk delete KPI mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (kpiIds: string[]) => {
      const { error } = await supabase
        .from("kpis")
        .delete()
        .in("id", kpiIds);
      if (error) throw error;
    },
    onSuccess: (_, kpiIds) => {
      queryClient.invalidateQueries({ queryKey: ["team-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["employee-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["group-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["organization-kpis"] });
      toast.success(`Deleted ${kpiIds.length} KPIs successfully`);
      setSelectedKpis(new Set());
      setBulkDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to delete selected KPIs");
      console.error(error);
    },
  });

  // Fetch historical KPIs for trend analysis (last 4 quarters)
  const { data: historicalKPIs = [] } = useQuery({
    queryKey: ["team-kpis-historical", teamMembers.map(t => t.id), year],
    queryFn: async () => {
      if (teamMembers.length === 0) return [];
      
      // Get KPIs from current year and previous year for trend analysis
      const { data, error } = await supabase
        .from("kpis")
        .select("*")
        .in("employee_id", teamMembers.map(t => t.id))
        .or(`year.eq.${year},year.eq.${year - 1}`)
        .order("year", { ascending: true })
        .order("quarter", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: teamMembers.length > 0,
  });

  // Extract unique departments from team members
  const departments = useMemo(() => {
    const deptSet = new Set(teamMembers.map(m => m.department).filter(Boolean));
    return Array.from(deptSet).sort();
  }, [teamMembers]);

  // Get member count per department
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teamMembers.forEach(m => {
      if (m.department) {
        counts[m.department] = (counts[m.department] || 0) + 1;
      }
    });
    return counts;
  }, [teamMembers]);

  // Get member count per project
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employeeProjects.forEach(ep => {
      if (teamMembers.some(m => m.id === ep.employee_id)) {
        counts[ep.project_id] = (counts[ep.project_id] || 0) + 1;
      }
    });
    return counts;
  }, [employeeProjects, teamMembers]);

  // Get member count per office
  const officeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teamMembers.forEach(m => {
      if (m.office_id) {
        counts[m.office_id] = (counts[m.office_id] || 0) + 1;
      }
    });
    return counts;
  }, [teamMembers]);

  // Build employee list for the popover
  const employeesList = useMemo(() => {
    return teamMembers.map(m => ({
      id: m.id,
      name: (m as any).profiles?.full_name || 'Unknown',
      avatarUrl: (m as any).profiles?.avatar_url,
      position: m.position,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

  // Filter employee list based on search
  const filteredEmployeesList = useMemo(() => {
    if (!employeeSearchQuery) return employeesList;
    const query = employeeSearchQuery.toLowerCase();
    return employeesList.filter(e => 
      e.name.toLowerCase().includes(query) || 
      e.position?.toLowerCase().includes(query)
    );
  }, [employeesList, employeeSearchQuery]);

  // Employee filter label
  const employeeFilterLabel = useMemo(() => {
    if (selectedEmployees.length === 0) return "All Team";
    if (selectedEmployees.length === 1) {
      const emp = employeesList.find(e => e.id === selectedEmployees[0]);
      return emp?.name || "1 Selected";
    }
    return `${selectedEmployees.length} Selected`;
  }, [selectedEmployees, employeesList]);

  // Filter team members based on department, project, office, and employee filters
  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter(member => {
      // Employee filter
      if (selectedEmployees.length > 0 && !selectedEmployees.includes(member.id)) {
        return false;
      }
      if (departmentFilter !== "all" && member.department !== departmentFilter) {
        return false;
      }
      if (projectFilter !== "all") {
        const memberProjectIds = employeeProjects
          .filter(ep => ep.employee_id === member.id)
          .map(ep => ep.project_id);
        if (!memberProjectIds.includes(projectFilter)) {
          return false;
        }
      }
      if (officeFilter !== "all" && member.office_id !== officeFilter) {
        return false;
      }
      return true;
    });
  }, [teamMembers, selectedEmployees, departmentFilter, projectFilter, officeFilter, employeeProjects]);

  // Filter KPIs based on filtered team members
  const filteredTeamKPIs = useMemo(() => {
    const filteredMemberIds = filteredTeamMembers.map(m => m.id);
    return teamKPIs.filter(kpi => filteredMemberIds.includes(kpi.employee_id));
  }, [teamKPIs, filteredTeamMembers]);

  // Toggle single KPI selection
  const toggleSelectKpi = (kpiId: string) => {
    const newSelected = new Set(selectedKpis);
    if (newSelected.has(kpiId)) {
      newSelected.delete(kpiId);
    } else {
      newSelected.add(kpiId);
    }
    setSelectedKpis(newSelected);
  };

  // Get all selectable KPIs based on DELETE permissions (for bulk actions)
  const getAllSelectableKpis = useMemo((): SelectedKpi[] => {
    const selectableKpis: SelectedKpi[] = [];
    
    // Add organization KPIs (only Owner/Admin can delete)
    if (isOwner || isAdmin) {
      organizationKpis.forEach(kpi => {
        selectableKpis.push({
          id: kpi.id,
          scopeType: 'organization',
          canEdit: true,
        });
      });
    }
    
    // Add group KPIs (only Owner/Admin can delete)
    if (isOwner || isAdmin) {
      groupKpis.forEach(kpi => {
        selectableKpis.push({
          id: kpi.id,
          scopeType: kpi.scope_type,
          canEdit: true,
        });
      });
    }
    
    // Add individual KPIs that user can DELETE (Owner/Admin/Manager for subordinates only)
    filteredTeamKPIs.forEach(kpi => {
      if (canDeleteKpi(kpi as unknown as Kpi)) {
        selectableKpis.push({
          id: kpi.id,
          scopeType: 'individual',
          canEdit: true,
        });
      }
    });
    
    return selectableKpis;
  }, [isOwner, isAdmin, organizationKpis, groupKpis, filteredTeamKPIs, currentEmployee?.id, teamMembers]);

  // Select all visible KPIs (that user can edit)
  const selectAllKpis = () => {
    const allSelectableIds = new Set(getAllSelectableKpis.map(k => k.id));
    setSelectedKpis(allSelectableIds);
  };

  // Clear all selections
  const deselectAllKpis = () => {
    setSelectedKpis(new Set());
  };

  // Get selected KPI details for the bulk actions bar
  const getSelectedKpiDetails = useMemo((): SelectedKpi[] => {
    return getAllSelectableKpis.filter(k => selectedKpis.has(k.id));
  }, [getAllSelectableKpis, selectedKpis]);

  // Check if user can delete any selected KPIs
  const hasEditableKpisSelected = useMemo(() => {
    return getSelectedKpiDetails.some(k => k.canEdit);
  }, [getSelectedKpiDetails]);

  // Export selected KPIs to CSV
  const exportSelectedKpis = () => {
    // Gather all KPIs
    const allKpis = [
      ...organizationKpis.map(k => ({ ...k, scope_type: 'organization' })),
      ...groupKpis,
      ...filteredTeamKPIs.map(k => ({ ...k, scope_type: 'individual' })),
    ];
    const selectedKpiData = allKpis.filter(kpi => selectedKpis.has(kpi.id));
    
    if (selectedKpiData.length === 0) {
      toast.error("No KPIs selected for export");
      return;
    }
    
    const headers = ["Title", "Description", "Type", "Status", "Quarter", "Year", "Current Value", "Target Value", "Unit", "Progress %"];
    const rows = selectedKpiData.map(kpi => {
      const progress = kpi.target_value ? Math.round(((kpi.current_value || 0) / kpi.target_value) * 100) : 0;
      return [
        `"${(kpi.title || '').replace(/"/g, '""')}"`,
        `"${(kpi.description || '').replace(/"/g, '""')}"`,
        kpi.scope_type || 'individual',
        kpi.status,
        `Q${kpi.quarter}`,
        kpi.year,
        kpi.current_value || 0,
        kpi.target_value || 0,
        kpi.unit || '',
        progress
      ];
    });
    
    const csv = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kpis-export-${year}-${quarter === 0 ? 'annual' : `Q${quarter}`}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${selectedKpiData.length} KPIs`);
  };

  // Process historical data for trend charts
  const trendData = useMemo(() => {
    if (historicalKPIs.length === 0) return [];
    
    // Quarter to months mapping
    const quarterMonths: Record<number, number[]> = {
      1: [0, 1, 2],   // Jan, Feb, Mar
      2: [3, 4, 5],   // Apr, May, Jun
      3: [6, 7, 8],   // Jul, Aug, Sep
      4: [9, 10, 11], // Oct, Nov, Dec
    };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Determine periods based on filter selection
    type Period = { type: 'quarter'; q: number; y: number } | 
                  { type: 'month'; m: number; y: number };
    const periods: Period[] = [];

    if (quarter === 0) {
      // "All Quarters" selected - show Q1 to Q4 of the selected year
      for (let q = 1; q <= 4; q++) {
        periods.push({ type: 'quarter', q, y: year });
      }
    } else {
      // Specific quarter selected - show the 3 months of that quarter
      const months = quarterMonths[quarter];
      months.forEach(m => {
        periods.push({ type: 'month', m, y: year });
      });
    }

    // Build period data
    const periodData: Record<string, {
      period: string;
      totalKPIs: number;
      avgProgress: number;
      onTrack: number;
      atRisk: number;
      behind: number;
      completed: number;
    }> = {};

    periods.forEach(p => {
      let key: string;
      let kpisInPeriod: typeof historicalKPIs;
      
      if (p.type === 'quarter') {
        key = `Q${p.q} ${p.y}`;
        kpisInPeriod = historicalKPIs.filter(k => k.quarter === p.q && k.year === p.y);
      } else {
        key = `${monthNames[p.m]} ${p.y}`;
        // For monthly view, filter KPIs by the quarter they belong to
        const quarterForMonth = Math.floor(p.m / 3) + 1;
        kpisInPeriod = historicalKPIs.filter(k => k.quarter === quarterForMonth && k.year === p.y);
      }
      
      const kpisWithTarget = kpisInPeriod.filter(k => k.target_value);
      const avgProgress = kpisWithTarget.length > 0
        ? Math.round(
            kpisWithTarget.reduce((acc, kpi) => {
              return acc + ((kpi.current_value || 0) / (kpi.target_value || 1)) * 100;
            }, 0) / kpisWithTarget.length
          )
        : 0;

      periodData[key] = {
        period: key,
        totalKPIs: kpisInPeriod.length,
        avgProgress,
        onTrack: kpisInPeriod.filter(k => k.status === "on_track").length,
        atRisk: kpisInPeriod.filter(k => k.status === "at_risk").length,
        behind: kpisInPeriod.filter(k => k.status === "behind").length,
        completed: kpisInPeriod.filter(k => k.status === "completed").length,
      };
    });

    return periods.map(p => {
      const key = p.type === 'quarter' ? `Q${p.q} ${p.y}` : `${monthNames[p.m]} ${p.y}`;
      return periodData[key];
    });
  }, [historicalKPIs, quarter, year]);

  const chartConfig = {
    avgProgress: {
      label: "Avg Progress",
      color: "hsl(var(--primary))",
    },
    onTrack: {
      label: "On Track",
      color: "hsl(142 76% 36%)",
    },
    atRisk: {
      label: "At Risk",
      color: "hsl(45 93% 47%)",
    },
    behind: {
      label: "Behind",
      color: "hsl(0 84% 60%)",
    },
    completed: {
      label: "Completed",
      color: "hsl(217 91% 60%)",
    },
  };

  // Filter group KPIs based on active filters (including employee selection)
  const filteredGroupKpis = useMemo(() => {
    // Build sets of departments/projects/offices for selected employees
    const selectedDepts = new Set<string>();
    const selectedProjects = new Set<string>();
    const selectedOffices = new Set<string>();
    
    if (selectedEmployees.length > 0) {
      selectedEmployees.forEach(empId => {
        const emp = teamMembers.find(m => m.id === empId);
        if (emp?.department) selectedDepts.add(emp.department);
        if (emp?.office_id) selectedOffices.add(emp.office_id);
        employeeProjects.forEach(ep => {
          if (ep.employee_id === empId) selectedProjects.add(ep.project_id);
        });
      });
    }
    
    return groupKpis.filter(kpi => {
      // Department filter
      if (departmentFilter !== "all" && kpi.scope_type === 'department') {
        if (kpi.scope_department !== departmentFilter) return false;
      }
      // Project filter
      if (projectFilter !== "all" && kpi.scope_type === 'project') {
        if (kpi.scope_project_id !== projectFilter) return false;
      }
      // Office filter
      if (officeFilter !== "all" && kpi.scope_type === 'office') {
        if (kpi.scope_office_id !== officeFilter) return false;
      }
      
      // Employee selection filter - show groups that include selected employees
      if (selectedEmployees.length > 0) {
        if (kpi.scope_type === 'department' && !selectedDepts.has(kpi.scope_department || '')) return false;
        if (kpi.scope_type === 'project' && !selectedProjects.has(kpi.scope_project_id || '')) return false;
        if (kpi.scope_type === 'office' && !selectedOffices.has(kpi.scope_office_id || '')) return false;
      }
      
      return true;
    });
  }, [groupKpis, departmentFilter, projectFilter, officeFilter, selectedEmployees, teamMembers, employeeProjects]);

  // Access-controlled group KPIs - regular users only see groups they belong to
  const userVisibleGroupKpis = useMemo(() => {
    // Admin/HR/Owner see all filtered group KPIs
    if (isAdmin || isHR || isOwner) {
      return filteredGroupKpis;
    }
    
    // Get current user's department, projects, office
    const userDept = currentEmployee?.department;
    const userOffice = currentEmployee?.office_id;
    const userProjectIds = employeeProjects
      .filter(ep => ep.employee_id === currentEmployee?.id)
      .map(ep => ep.project_id);
    
    // Include subordinates' groups if manager
    const subordinateDepts = new Set<string>();
    const subordinateOffices = new Set<string>();
    const subordinateProjects = new Set<string>();
    
    if (isManager) {
      teamMembers.forEach(m => {
        if (m.manager_id === currentEmployee?.id) {
          if (m.department) subordinateDepts.add(m.department);
          if (m.office_id) subordinateOffices.add(m.office_id);
          employeeProjects.forEach(ep => {
            if (ep.employee_id === m.id) subordinateProjects.add(ep.project_id);
          });
        }
      });
    }
    
    return filteredGroupKpis.filter(kpi => {
      if (kpi.scope_type === 'department') {
        return kpi.scope_department === userDept || subordinateDepts.has(kpi.scope_department || '');
      }
      if (kpi.scope_type === 'project') {
        return userProjectIds.includes(kpi.scope_project_id || '') || subordinateProjects.has(kpi.scope_project_id || '');
      }
      if (kpi.scope_type === 'office') {
        return kpi.scope_office_id === userOffice || subordinateOffices.has(kpi.scope_office_id || '');
      }
      return false;
    });
  }, [filteredGroupKpis, isAdmin, isHR, isOwner, isManager, currentEmployee, teamMembers, employeeProjects]);

  // Calculate aggregated stats (from all filtered KPI types based on user access)
  const stats = useMemo(() => {
    // Only include org KPIs for admin/HR/owner
    const visibleOrgKpis = (isAdmin || isHR || isOwner) ? organizationKpis : [];
    
    const allVisibleKpis = [
      ...visibleOrgKpis,
      ...userVisibleGroupKpis,
      ...filteredTeamKPIs,
    ];
    
    const kpisWithTarget = allVisibleKpis.filter(k => k.target_value);
    
    return {
      totalKPIs: allVisibleKpis.length,
      onTrack: allVisibleKpis.filter(k => k.status === "on_track").length,
      atRisk: allVisibleKpis.filter(k => k.status === "at_risk").length,
      behind: allVisibleKpis.filter(k => k.status === "behind").length,
      completed: allVisibleKpis.filter(k => k.status === "completed").length,
      avgProgress: kpisWithTarget.length > 0
        ? Math.round(
            kpisWithTarget.reduce((acc, kpi) => {
              return acc + ((kpi.current_value || 0) / (kpi.target_value || 1)) * 100;
            }, 0) / kpisWithTarget.length
          )
        : 0,
    };
  }, [organizationKpis, userVisibleGroupKpis, filteredTeamKPIs, isAdmin, isHR, isOwner]);

  // Group KPIs by employee (using filtered members and KPIs)
  const kpisByEmployee = filteredTeamMembers.map(member => {
    const memberKPIs = filteredTeamKPIs.filter(k => k.employee_id === member.id);
    const avgProgress = memberKPIs.length > 0
      ? Math.round(
          memberKPIs.reduce((acc, kpi) => {
            if (!kpi.target_value) return acc;
            return acc + ((kpi.current_value || 0) / kpi.target_value) * 100;
          }, 0) / memberKPIs.filter(k => k.target_value).length || 0
        )
      : 0;
    
    // Find the most recent updated_at from KPIs
    const lastUpdated = memberKPIs.length > 0
      ? memberKPIs.reduce((latest, kpi) => {
          const kpiDate = new Date(kpi.updated_at);
          return kpiDate > latest ? kpiDate : latest;
        }, new Date(0))
      : null;
    
    return {
      ...member,
      kpis: memberKPIs,
      avgProgress,
      lastUpdated,
      onTrack: memberKPIs.filter(k => k.status === "on_track").length,
      atRisk: memberKPIs.filter(k => k.status === "at_risk").length,
      behind: memberKPIs.filter(k => k.status === "behind").length,
      completed: memberKPIs.filter(k => k.status === "completed").length,
    };
  }).sort((a, b) => b.kpis.length - a.kpis.length);

  // Aggregate group KPIs by scope (department/office/project) - using access-controlled list
  const groupKpisByScope = useMemo(() => {
    const scopeMap = new Map<string, {
      scopeType: 'department' | 'office' | 'project';
      scopeName: string;
      scopeId: string;
      kpis: typeof userVisibleGroupKpis;
      avgProgress: number;
      onTrack: number;
      atRisk: number;
      behind: number;
      completed: number;
      projectData?: { logo_url?: string; color?: string; icon?: string };
    }>();

    userVisibleGroupKpis.forEach(kpi => {
      let key: string;
      let name: string;
      let scopeType: 'department' | 'office' | 'project';
      let projectData: { logo_url?: string; color?: string; icon?: string } | undefined;
      
      if (kpi.scope_type === 'department') {
        key = `department-${kpi.scope_department}`;
        name = kpi.scope_department || 'Unknown';
        scopeType = 'department';
      } else if (kpi.scope_type === 'office') {
        key = `office-${kpi.scope_office_id}`;
        name = (kpi as any).office?.name || offices.find(o => o.id === kpi.scope_office_id)?.name || 'Unknown Office';
        scopeType = 'office';
      } else {
        key = `project-${kpi.scope_project_id}`;
        const project = (kpi as any).project || projects.find(p => p.id === kpi.scope_project_id);
        name = project?.name || 'Unknown Project';
        scopeType = 'project';
        projectData = {
          logo_url: project?.logo_url,
          color: project?.color,
          icon: project?.icon,
        };
      }
      
      if (!scopeMap.has(key)) {
        scopeMap.set(key, {
          scopeType,
          scopeName: name,
          scopeId: key,
          kpis: [],
          avgProgress: 0,
          onTrack: 0,
          atRisk: 0,
          behind: 0,
          completed: 0,
          projectData,
        });
      }
      
      const group = scopeMap.get(key)!;
      group.kpis.push(kpi);
      
      // Update status counts
      if (kpi.status === 'on_track') group.onTrack++;
      else if (kpi.status === 'at_risk') group.atRisk++;
      else if (kpi.status === 'behind') group.behind++;
      else if (kpi.status === 'completed' || kpi.status === 'achieved') group.completed++;
    });

    // Calculate average progress for each group
    scopeMap.forEach(group => {
      const kpisWithTarget = group.kpis.filter(k => k.target_value);
      group.avgProgress = kpisWithTarget.length > 0
        ? Math.round(
            kpisWithTarget.reduce((acc, kpi) => {
              return acc + ((kpi.current_value || 0) / (kpi.target_value || 1)) * 100;
            }, 0) / kpisWithTarget.length
          )
        : 0;
    });

    return Array.from(scopeMap.values()).sort((a, b) => b.kpis.length - a.kpis.length);
  }, [userVisibleGroupKpis, offices, projects]);

  // Handle clicking on a group card to filter the dashboard
  const handleGroupClick = (group: typeof groupKpisByScope[0]) => {
    // Clear employee selection
    setSelectedEmployees([]);
    
    if (group.scopeType === 'department') {
      setDepartmentFilter(group.scopeName);
      setProjectFilter('all');
      setOfficeFilter('all');
    } else if (group.scopeType === 'project') {
      const projectId = group.scopeId.replace('project-', '');
      setProjectFilter(projectId);
      setDepartmentFilter('all');
      setOfficeFilter('all');
    } else if (group.scopeType === 'office') {
      const officeId = group.scopeId.replace('office-', '');
      setOfficeFilter(officeId);
      setDepartmentFilter('all');
      setProjectFilter('all');
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isLoading = loadingTeam || loadingKPIs || roleLoading || loadingCurrentEmployee;
  const hasActiveFilters = departmentFilter !== "all" || projectFilter !== "all" || officeFilter !== "all" || selectedEmployees.length > 0;
  
  // Calculate active filter count for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedEmployees.length > 0) count++;
    if (departmentFilter !== "all") count++;
    if (projectFilter !== "all") count++;
    if (officeFilter !== "all") count++;
    if (quarter !== getCurrentQuarter()) count++;
    if (year !== getCurrentYear()) count++;
    return count;
  }, [selectedEmployees, departmentFilter, projectFilter, officeFilter, quarter, year]);

  // Period navigation helpers (removed - now using direct dropdowns)

  const getPeriodLabel = () => {
    if (quarter === 0) {
      return year.toString();
    }
    return `Q${quarter} ${year}`;
  };

  return (
    <>
      <div className="space-y-6 pt-4 md:pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Team KPI Dashboard
            </h1>
            <p className="text-muted-foreground">
              {isAdmin || isHR
                ? "Organization-wide KPI overview"
                : isManager
                ? "Your KPIs and direct reports' overview"
                : "Your personal KPI overview"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {(isOwner || isAdmin || isHR) && (
              <Button
                variant="outline"
                size="sm"
                className="px-2 sm:px-3"
                onClick={() => navigate(buildOrgPath("/kpi/bulk-create"))}
              >
                <Sparkles className="h-4 w-4 sm:mr-1 text-ai" />
                <span className="hidden sm:inline text-ai">AI Bulk Create</span>
              </Button>
            )}
            <KPITemplatesDialog>
              <Button variant="outline" size="sm" className="px-2 sm:px-3">
                <FileText className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Templates</span>
              </Button>
            </KPITemplatesDialog>
            <AddKPIDialog defaultQuarter={quarter} defaultYear={year}>
              <Button size="sm" className="px-2 sm:px-3">
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Add KPI</span>
              </Button>
            </AddKPIDialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <Card className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No KPIs Found</h3>
            <p className="text-muted-foreground">
              {isAdmin || isHR
                ? "No active employees in the organization."
                : "Unable to load your KPI data. Please try again."}
            </p>
          </Card>
        ) : (
          <>
            {/* Mobile Filter Button + Drawer */}
            <div className="md:hidden sticky top-0 z-10 bg-purple-50/80 dark:bg-purple-950/20 backdrop-blur-sm py-2 rounded-lg">
              <div className="flex items-center gap-2 justify-between px-2">
                <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-between bg-background">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span>Filters</span>
                      </div>
                      {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle className="flex items-center justify-between">
                        <span>Filter KPIs</span>
                        {hasActiveFilters && (
                          <Button variant="ghost" size="sm" onClick={() => { clearFilters(); setFilterDrawerOpen(false); }}>
                            <X className="h-4 w-4 mr-1" />
                            Clear All
                          </Button>
                        )}
                      </DrawerTitle>
                    </DrawerHeader>
                    <div className="px-4 pb-4 flex flex-col gap-4">
                      {/* Employee Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Employee</label>
                        <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between">
                              <div className="flex items-center gap-2 truncate">
                                <Users className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{employeeFilterLabel}</span>
                              </div>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput placeholder="Search employees..." value={employeeSearchQuery} onValueChange={setEmployeeSearchQuery} />
                              <CommandList>
                                <CommandEmpty>No employees found.</CommandEmpty>
                                <CommandGroup>
                                  {(isAdmin || isHR) && employeesList.length > 1 && (
                                    <div className="flex items-center justify-between px-2 py-1.5 border-b">
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedEmployees(employeesList.map(e => e.id))}>
                                        Select All
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedEmployees([])}>
                                        Clear All
                                      </Button>
                                    </div>
                                  )}
                                  {filteredEmployeesList.map(employee => (
                                    <CommandItem 
                                      key={employee.id} 
                                      value={employee.id} 
                                      onSelect={() => {
                                        setSelectedEmployees(
                                          selectedEmployees.includes(employee.id) 
                                            ? selectedEmployees.filter(id => id !== employee.id) 
                                            : [...selectedEmployees, employee.id]
                                        );
                                      }}
                                    >
                                      <div className="flex items-center gap-2 flex-1">
                                        <Checkbox checked={selectedEmployees.includes(employee.id)} className="pointer-events-none" />
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={employee.avatarUrl || undefined} />
                                          <AvatarFallback className="text-xs">
                                            {employee.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium truncate max-w-[160px]">{employee.name}</span>
                                          {employee.position && <span className="text-xs text-muted-foreground truncate max-w-[160px]">{employee.position}</span>}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Department Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Department</label>
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                          <SelectTrigger className="w-full">
                            <Building className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="Department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept} ({departmentCounts[dept] || 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Project Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Project</label>
                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                          <SelectTrigger className="w-full">
                            <FolderKanban className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="Project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} ({projectCounts[project.id] || 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Office Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Office</label>
                        <Select value={officeFilter} onValueChange={setOfficeFilter}>
                          <SelectTrigger className="w-full">
                            <MapPin className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="Office" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Offices</SelectItem>
                            {offices.map((office) => (
                              <SelectItem key={office.id} value={office.id}>
                                {office.name} ({officeCounts[office.id] || 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Year Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Year</label>
                        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                          <SelectTrigger className="w-full">
                            <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                            <SelectValue>{year}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {[getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1].map((y) => (
                              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quarter Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Quarter</label>
                        <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {quarter === 0 ? "All Quarters" : `Q${quarter}`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">All (Annual)</SelectItem>
                            <SelectItem value="1">Q1</SelectItem>
                            <SelectItem value="2">Q2</SelectItem>
                            <SelectItem value="3">Q3</SelectItem>
                            <SelectItem value="4">Q4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button className="w-full">
                          Apply Filters
                          {hasActiveFilters && (
                            <Badge variant="secondary" className="ml-2">
                              {filteredTeamMembers.length} results
                            </Badge>
                          )}
                        </Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>

                {/* Quick Period Selector - Always visible on mobile */}
                <div className="flex items-center gap-1">
                  <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                    <SelectTrigger className="w-[70px] h-9 bg-background text-xs">
                      <SelectValue>{year}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1].map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                    <SelectTrigger className="w-[60px] h-9 bg-background text-xs">
                      <SelectValue>{quarter === 0 ? "All" : `Q${quarter}`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All</SelectItem>
                      <SelectItem value="1">Q1</SelectItem>
                      <SelectItem value="2">Q2</SelectItem>
                      <SelectItem value="3">Q3</SelectItem>
                      <SelectItem value="4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Desktop Filter Bar */}
            <div className="hidden md:block sticky top-0 z-10 bg-purple-50/80 dark:bg-purple-950/20 backdrop-blur-sm pb-2 pt-2 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap bg-slate-300 dark:bg-slate-700 px-[5px] py-[5px] rounded-lg">
                {/* Employee Multi-Select Dropdown */}
                <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={employeePopoverOpen} className="w-[160px] h-9 justify-between bg-background">
                      <div className="flex items-center gap-2 truncate">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{employeeFilterLabel}</span>
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Search employees..." value={employeeSearchQuery} onValueChange={setEmployeeSearchQuery} />
                      <CommandList>
                        <CommandEmpty>No employees found.</CommandEmpty>
                        <CommandGroup>
                          {(isAdmin || isHR) && employeesList.length > 1 && (
                            <div className="flex items-center justify-between px-2 py-1.5 border-b">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedEmployees(employeesList.map(e => e.id))}>
                                Select All
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedEmployees([])}>
                                Clear All
                              </Button>
                            </div>
                          )}
                          {filteredEmployeesList.map(employee => (
                            <CommandItem 
                              key={employee.id} 
                              value={employee.id} 
                              onSelect={() => {
                                setSelectedEmployees(
                                  selectedEmployees.includes(employee.id) 
                                    ? selectedEmployees.filter(id => id !== employee.id) 
                                    : [...selectedEmployees, employee.id]
                                );
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <Checkbox checked={selectedEmployees.includes(employee.id)} className="pointer-events-none" />
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={employee.avatarUrl || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {employee.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium truncate max-w-[160px]">{employee.name}</span>
                                  {employee.position && <span className="text-xs text-muted-foreground truncate max-w-[160px]">{employee.position}</span>}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Department Dropdown */}
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[170px] h-9 bg-background">
                    <Building className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept} ({departmentCounts[dept] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Project Dropdown */}
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-[150px] h-9 bg-background">
                    <FolderKanban className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({projectCounts[project.id] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Office Dropdown */}
                <Select value={officeFilter} onValueChange={setOfficeFilter}>
                  <SelectTrigger className="w-[140px] h-9 bg-background">
                    <MapPin className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Office" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name} ({officeCounts[office.id] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Year Dropdown */}
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger className="w-[100px] h-9 bg-background">
                    <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                    <SelectValue>{year}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Quarter Dropdown */}
                <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                  <SelectTrigger className="w-[130px] h-9 bg-background">
                    <SelectValue>
                      {quarter === 0 ? "All Quarters" : `Q${quarter}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All (Annual)</SelectItem>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 text-muted-foreground hover:text-foreground px-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    <span>Clear</span>
                  </Button>
                )}

                {hasActiveFilters && (
                  <Badge variant="secondary" className="text-xs">
                    {filteredTeamMembers.length}/{teamMembers.length}
                  </Badge>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-4 sm:mb-6">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{stats.totalKPIs}</p>
                      <p className="text-xs text-muted-foreground">Total KPIs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{stats.onTrack + stats.completed}</p>
                      <p className="text-xs text-muted-foreground">On Track / Done</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{stats.atRisk}</p>
                      <p className="text-xs text-muted-foreground">At Risk</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{stats.behind}</p>
                      <p className="text-xs text-muted-foreground">Behind</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-2 md:col-span-1">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{stats.avgProgress}%</p>
                      <p className="text-xs text-muted-foreground">Avg Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trend Charts - Hidden on mobile */}
            {trendData.length > 0 && (
              <div className="hidden sm:grid gap-6 md:grid-cols-2 mb-6">
                {/* Progress Trend Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <LineChart className="h-4 w-4" />
                      Progress Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          className="text-muted-foreground"
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
                        />
                        <Area
                          type="monotone"
                          dataKey="avgProgress"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#progressGradient)"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Status Distribution Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="onTrack" stackId="status" fill="hsl(142 76% 36%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="completed" stackId="status" fill="hsl(217 91% 60%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="atRisk" stackId="status" fill="hsl(45 93% 47%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="behind" stackId="status" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Organisation KPIs Section */}
            {(isAdmin || isHR) && organizationKpis.length > 0 && (
              <Card className="mb-4 sm:mb-6 border-l-4 border-l-indigo-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-600" />
                    Organisation KPIs
                    <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700">
                      {organizationKpis.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="space-y-3">
                    {organizationKpis.map((kpi) => (
                      <div key={kpi.id} className={cn(
                        "flex items-start gap-3",
                        selectedKpis.has(kpi.id) && "ring-2 ring-primary/30 rounded-lg"
                      )}>
                        {(isOwner || isAdmin) && (
                          <Checkbox
                            checked={selectedKpis.has(kpi.id)}
                            onCheckedChange={() => toggleSelectKpi(kpi.id)}
                            className="mt-4 shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <OrganisationKpiCard 
                            kpi={kpi} 
                            canEdit={isOwner || isAdmin}
                            canDelete={isOwner || isAdmin}
                            onEdit={() => setEditingKpi(kpi as unknown as Kpi)}
                            onDelete={() => setDeletingKpiId(kpi.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Group KPIs Section - visible to all users who have access to group KPIs */}
            {userVisibleGroupKpis.length > 0 && (
              <Card className="mb-4 sm:mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Group KPIs
                    <Badge variant="secondary" className="ml-2">
                      {userVisibleGroupKpis.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="space-y-2 sm:space-y-3">
                    {userVisibleGroupKpis.map((kpi) => (
                      <UnifiedKpiCard
                        key={kpi.id}
                        kpi={kpi}
                        type="group"
                        project={kpi.project || undefined}
                        owners={(kpi as any).kpi_owners || []}
                        isSelected={selectedKpis.has(kpi.id)}
                        onSelect={() => toggleSelectKpi(kpi.id)}
                        showCheckbox={isOwner || isAdmin}
                        canEdit={canEditGroupKpi(kpi)}
                        canDelete={isOwner || isAdmin}
                        onEdit={() => setEditingKpi(kpi)}
                        onDelete={() => setDeletingKpiId(kpi.id)}
                        updatesCount={(kpi as any).updates_count || 0}
                        childCount={(kpi as any).child_count || 0}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual KPIs - Now above Team Progress */}
            {filteredTeamKPIs.length > 0 && (
            <Card className="mb-4 sm:mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Individual KPIs
                  <Badge variant="secondary" className="ml-2">
                    {filteredTeamKPIs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {filteredTeamKPIs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {hasActiveFilters 
                        ? "No KPIs match the selected filters" 
                        : quarter === 0 
                          ? `No KPIs set for ${year}`
                          : `No KPIs set for Q${quarter} ${year}`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {filteredTeamKPIs.map((kpi) => {
                      const member = filteredTeamMembers.find(m => m.id === kpi.employee_id);
                      const canEdit = canEditKpi(kpi as unknown as Kpi);
                      const canDelete = canDeleteKpi(kpi as unknown as Kpi);
                      
                      return (
                        <UnifiedKpiCard
                          key={kpi.id}
                          kpi={kpi as unknown as Kpi}
                          type="individual"
                          employee={member ? {
                            id: member.id,
                            name: (member.profiles as any)?.full_name || 'Unknown',
                            position: member.position,
                            avatarUrl: (member.profiles as any)?.avatar_url,
                          } : undefined}
                          isSelected={selectedKpis.has(kpi.id)}
                          onSelect={() => toggleSelectKpi(kpi.id)}
                          showCheckbox={canDelete}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onEdit={() => setEditingKpi(kpi as unknown as Kpi)}
                          onDelete={() => setDeletingKpiId(kpi.id)}
                          updatesCount={(kpi as any).updates_count || 0}
                          childCount={(kpi as any).child_count || 0}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Overall Progress - Now with Individual/Group tabs */}
            <Card>
              <Tabs defaultValue="all" className="w-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Overall Progress
                    </CardTitle>
                    <TabsList className="grid grid-cols-3 h-10 p-0.5">
                      <TabsTrigger value="all" className="gap-1.5 text-xs px-2 sm:px-3">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">All</span>
                        <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5">
                          {kpisByEmployee.length + groupKpisByScope.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="individual" className="gap-1.5 text-xs px-2 sm:px-3">
                        <Users className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Individual</span>
                        <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5">
                          {kpisByEmployee.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="group" className="gap-1.5 text-xs px-2 sm:px-3">
                        <Building className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Group</span>
                        <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5">
                          {groupKpisByScope.length}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardHeader>
                <CardContent>
                  <TabsContent value="all" className="mt-0">
                    {kpisByEmployee.length === 0 && groupKpisByScope.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No KPIs found</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Individual KPI cards */}
                        {kpisByEmployee.map((member) => (
                          <Card 
                            key={`individual-${member.id}`} 
                            className="p-4 hover:shadow-md transition-shadow border bg-card"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={(member.profiles as any)?.avatar_url} />
                                <AvatarFallback>
                                  {(member.profiles as any)?.full_name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {(member.profiles as any)?.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.department}
                                </p>
                              </div>
                              <OrgLink to={`/team/${member.id}`}>
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </OrgLink>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-muted-foreground">{member.kpis.length} KPIs</span>
                              <div className="flex items-center gap-1.5">
                                <CircularProgress value={member.avgProgress} size={20} strokeWidth={2.5} />
                                <span className="text-xs font-medium">{member.avgProgress}%</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {member.onTrack + member.completed > 0 && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    {member.onTrack + member.completed}
                                  </Badge>
                                )}
                                {member.atRisk > 0 && (
                                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {member.atRisk}
                                  </Badge>
                                )}
                                {member.behind > 0 && (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {member.behind}
                                  </Badge>
                                )}
                                {member.kpis.length === 0 && (
                                  <span className="text-xs text-muted-foreground">No KPIs</span>
                                )}
                              </div>
                              {member.lastUpdated && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {format(member.lastUpdated, "d MMM yyyy . hh:mm a")}
                                </span>
                              )}
                            </div>
                          </Card>
                        ))}
                        {/* Group KPI cards */}
                        {groupKpisByScope.map((group) => {
                          const ScopeIcon = group.scopeType === 'department' 
                            ? Building 
                            : group.scopeType === 'office' 
                              ? MapPin 
                              : FolderKanban;
                          const scopeLabel = group.scopeType === 'department'
                            ? 'Department'
                            : group.scopeType === 'office'
                              ? 'Office'
                              : 'Project';
                          
                          return (
                            <Card 
                              key={`group-${group.scopeId}`} 
                              className="p-4 hover:shadow-md transition-shadow border bg-card cursor-pointer"
                              onClick={() => handleGroupClick(group)}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                {/* Project logo for project-scoped groups */}
                                {group.scopeType === 'project' && group.projectData?.logo_url ? (
                                  <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                                    <img 
                                      src={group.projectData.logo_url} 
                                      alt={group.scopeName}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div 
                                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                                    style={{ 
                                      backgroundColor: group.scopeType === 'project' && group.projectData?.color 
                                        ? `${group.projectData.color}20` 
                                        : 'hsl(var(--primary) / 0.1)' 
                                    }}
                                  >
                                    <ScopeIcon 
                                      className="h-5 w-5" 
                                      style={{ 
                                        color: group.scopeType === 'project' && group.projectData?.color 
                                          ? group.projectData.color 
                                          : 'hsl(var(--primary))' 
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {group.scopeName}
                                  </p>
                                  <Badge variant="outline" className="text-[10px] mt-0.5">
                                    {scopeLabel}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-muted-foreground">{group.kpis.length} KPIs</span>
                                <div className="flex items-center gap-1.5">
                                  <CircularProgress value={group.avgProgress} size={20} strokeWidth={2.5} />
                                  <span className="text-xs font-medium">{group.avgProgress}%</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {group.onTrack + group.completed > 0 && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    {group.onTrack + group.completed}
                                  </Badge>
                                )}
                                {group.atRisk > 0 && (
                                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {group.atRisk}
                                  </Badge>
                                )}
                                {group.behind > 0 && (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {group.behind}
                                  </Badge>
                                )}
                                {group.kpis.length === 0 && (
                                  <span className="text-xs text-muted-foreground">No KPIs</span>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="individual" className="mt-0">
                    {kpisByEmployee.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No team members match the selected filters</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {kpisByEmployee.map((member) => (
                          <Card 
                            key={member.id} 
                            className="p-4 hover:shadow-md transition-shadow border bg-card"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={(member.profiles as any)?.avatar_url} />
                                <AvatarFallback>
                                  {(member.profiles as any)?.full_name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {(member.profiles as any)?.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.department}
                                </p>
                              </div>
                              <OrgLink to={`/team/${member.id}`}>
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </OrgLink>
                            </div>

                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-muted-foreground">{member.kpis.length} KPIs</span>
                              <div className="flex items-center gap-1.5">
                                <CircularProgress value={member.avgProgress} size={20} strokeWidth={2.5} />
                                <span className="text-xs font-medium">{member.avgProgress}%</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {member.onTrack + member.completed > 0 && (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {member.onTrack + member.completed}
                                </Badge>
                              )}
                              {member.atRisk > 0 && (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {member.atRisk}
                                </Badge>
                              )}
                              {member.behind > 0 && (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1">
                                  <XCircle className="h-3 w-3" />
                                  {member.behind}
                                </Badge>
                              )}
                              {member.kpis.length === 0 && (
                                <span className="text-xs text-muted-foreground">No KPIs</span>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="group">
                    {groupKpisByScope.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No group KPIs found</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {groupKpisByScope.map((group) => {
                          const ScopeIcon = group.scopeType === 'department' 
                            ? Building 
                            : group.scopeType === 'office' 
                              ? MapPin 
                              : FolderKanban;
                          const scopeLabel = group.scopeType === 'department'
                            ? 'Department'
                            : group.scopeType === 'office'
                              ? 'Office'
                              : 'Project';
                          
                          return (
                            <Card 
                              key={group.scopeId} 
                              className="p-4 hover:shadow-md transition-shadow border bg-card cursor-pointer"
                              onClick={() => handleGroupClick(group)}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                {/* Project logo for project-scoped groups */}
                                {group.scopeType === 'project' && group.projectData?.logo_url ? (
                                  <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                                    <img 
                                      src={group.projectData.logo_url} 
                                      alt={group.scopeName}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div 
                                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                                    style={{ 
                                      backgroundColor: group.scopeType === 'project' && group.projectData?.color 
                                        ? `${group.projectData.color}20` 
                                        : 'hsl(var(--primary) / 0.1)' 
                                    }}
                                  >
                                    <ScopeIcon 
                                      className="h-5 w-5" 
                                      style={{ 
                                        color: group.scopeType === 'project' && group.projectData?.color 
                                          ? group.projectData.color 
                                          : 'hsl(var(--primary))' 
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {group.scopeName}
                                  </p>
                                  <Badge variant="outline" className="text-[10px] mt-0.5">
                                    {scopeLabel}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-muted-foreground">{group.kpis.length} KPIs</span>
                                <div className="flex items-center gap-1.5">
                                  <CircularProgress value={group.avgProgress} size={20} strokeWidth={2.5} />
                                  <span className="text-xs font-medium">{group.avgProgress}%</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {group.onTrack + group.completed > 0 && (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    {group.onTrack + group.completed}
                                  </Badge>
                                )}
                                {group.atRisk > 0 && (
                                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {group.atRisk}
                                  </Badge>
                                )}
                                {group.behind > 0 && (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {group.behind}
                                  </Badge>
                                )}
                                {group.kpis.length === 0 && (
                                  <span className="text-xs text-muted-foreground">No KPIs</span>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </>
        )}
      </div>
      
      {/* Edit KPI Dialog */}
      <EditKPIDialog
        open={!!editingKpi}
        onOpenChange={(open) => !open && setEditingKpi(null)}
        kpi={editingKpi}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingKpiId} onOpenChange={(open) => !open && setDeletingKpiId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this KPI? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingKpiId && deleteMutation.mutate(deletingKpiId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected KPIs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedKpis.size} KPIs? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedKpis))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedKpis.size} KPIs`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bulk Actions Bar */}
      {selectedKpis.size > 0 && (
        <KpiBulkActionsBar
          selectedItems={getSelectedKpiDetails}
          totalItems={getAllSelectableKpis.length}
          onSelectAll={selectAllKpis}
          onDeselectAll={deselectAllKpis}
          onDeleteSelected={() => setBulkDeleteDialogOpen(true)}
          onExportSelected={exportSelectedKpis}
          canDelete={hasEditableKpisSelected}
        />
      )}
    </>
  );
};

export default TeamKPIDashboard;
