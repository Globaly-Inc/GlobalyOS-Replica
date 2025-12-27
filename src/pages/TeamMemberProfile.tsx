import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { RichTextContent } from "@/components/ui/rich-text-editor";
import { formatDateTime } from "@/lib/utils";
import { useParams } from "react-router-dom";
import { OrgLink } from "@/components/OrgLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import WinCard from "@/components/WinCard";
import { FeedReactions } from "@/components/FeedReactions";
import { Update } from "@/types/employee";
import { PositionTimeline } from "@/components/PositionTimeline";
import { AddPositionHistoryDialog } from "@/components/dialogs/AddPositionHistoryDialog";
import { LearningDevelopment } from "@/components/LearningDevelopment";
import { AddLearningDialog } from "@/components/dialogs/AddLearningDialog";
import { LeaveManagement } from "@/components/LeaveManagement";
import { EmployeeDocuments } from "@/components/EmployeeDocuments";
import { AttendanceTracker } from "@/components/AttendanceTracker";
import { EditScheduleDialog } from "@/components/dialogs/EditScheduleDialog";
import { EditManagerDialog } from "@/components/dialogs/EditManagerDialog";
import { EditOfficeDialog } from "@/components/dialogs/EditOfficeDialog";
import { EditAddressDialog } from "@/components/dialogs/EditAddressDialog";
import { EditNameDialog } from "@/components/dialogs/EditNameDialog";
import { EditEmailDialog } from "@/components/dialogs/EditEmailDialog";
import { EditEmployeeInfoDialog } from "@/components/dialogs/EditEmployeeInfoDialog";
import { EditUserRoleDialog } from "@/components/dialogs/EditUserRoleDialog";
import { EditProjectsDialog } from "@/components/dialogs/EditProjectsDialog";
import { EditAvatarDialog } from "@/components/dialogs/EditAvatarDialog";
import { EditStatusDialog } from "@/components/dialogs/EditStatusDialog";
import { EditableField } from "@/components/EditableField";
import { EditableDateField } from "@/components/EditableDateField";
import { Mail, Phone, MapPin, Calendar, User, Sparkles, ArrowLeft, Users, Building, CreditCard, FileText, AlertCircle, Building2, Heart, TrendingUp, GraduationCap, Clock, History, FolderKanban, Palmtree, FolderOpen, Search, Trophy, Pencil, Settings2, Plus, ClipboardList, Target, Star, Home, Activity } from "lucide-react";
import { WORK_LOCATION_CONFIG, WorkLocation, WorkLocationDisplay } from "@/types/wfh";
import { useEmployeeWorkLocation, useHasApprovedWfhToday } from "@/services/useWfh";
import { AddWfhRequestDialog } from "@/components/dialogs/AddWfhRequestDialog";
import { format } from "date-fns";
import AIKPIInsights from "@/components/AIKPIInsights";
import ManageKPIsDialog from "@/components/dialogs/ManageKPIsDialog";
import { DeleteTeamMemberDialog } from "@/components/dialogs/DeleteTeamMemberDialog";
import { ProfileTimelineSheet } from "@/components/ProfileTimelineSheet";
import { AddLeaveBalanceDialog } from "@/components/dialogs/AddLeaveBalanceDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { icons } from "lucide-react";
import { ProfileActivityFeed } from "@/components/feed/ProfileActivityFeed";
import { PositionAIDescription } from "@/components/PositionAIDescription";
import { Database } from "@/integrations/supabase/types";
type AppRole = Database["public"]["Enums"]["app_role"];
interface EmployeeProject {
  id: string;
  project: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}
const DynamicIcon = ({
  name,
  className,
  style
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const IconComponent = (icons as any)[name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, g => g[1].toUpperCase())] || icons.Folder;
  return <IconComponent className={className} style={style} />;
};
const TeamMemberProfile = () => {
  const {
    id
  } = useParams();
  const {
    toast
  } = useToast();
  const {
    isHR,
    isAdmin,
    isOwner
  } = useUserRole();
  const [employee, setEmployee] = useState<any>(null);
  const [kudos, setKudos] = useState<any[]>([]);
  const [wins, setWins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionHistory, setPositionHistory] = useState<any[]>([]);
  const [manager, setManager] = useState<any>(null);
  const [directReports, setDirectReports] = useState<any[]>([]);
  const [officeEmployeeCount, setOfficeEmployeeCount] = useState<number>(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isManagerOfEmployee, setIsManagerOfEmployee] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [employeeProjects, setEmployeeProjects] = useState<EmployeeProject[]>([]);
  const [currentLeave, setCurrentLeave] = useState<{
    leave_type: string;
  } | null>(null);
  const [documentSearch, setDocumentSearch] = useState('');
  const [editStatusOpen, setEditStatusOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [employeeSchedule, setEmployeeSchedule] = useState<any>(null);
  const [performanceReviews, setPerformanceReviews] = useState<any[]>([]);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [wfhDialogOpen, setWfhDialogOpen] = useState(false);

  // Fetch work location for WFH request button
  const { data: workLocation } = useEmployeeWorkLocation(id);
  
  // Check if employee has approved WFH for today
  const { data: hasApprovedWfhToday } = useHasApprovedWfhToday(id);
  
  // Determine display location (show WFH if office employee has approved WFH today)
  const displayLocation: WorkLocationDisplay = 
    workLocation === 'office' && hasApprovedWfhToday ? 'wfh' : (workLocation || 'office');
  const isAdminOrHR = isAdmin || isHR;

  // Can view all details
  const canViewAllDetails = isAdminOrHR || isOwnProfile || isManagerOfEmployee;

  // Can edit personal details (except restricted fields)
  const canEditPersonalDetails = isAdminOrHR || isOwnProfile || isManagerOfEmployee;

  // Can edit join date and office - only Admin/HR
  const canEditJoinDateAndOffice = isAdminOrHR;

  // Can edit manager - only Admin/HR
  const canEditManager = isAdminOrHR;

  // Can view Tax & Banking - Admin/HR and own profile only (not managers)
  const canViewTaxBanking = isAdminOrHR || isOwnProfile;

  // Can view Emergency Contact - Admin/HR, own profile, and managers
  const canViewEmergencyContact = isAdminOrHR || isOwnProfile || isManagerOfEmployee;

  // Can manage leave balance - only Admin/HR
  const canManageLeave = isAdminOrHR;

  // Can view Leave Balances and Attendance - Admin/HR, own profile, or manager
  const canViewLeaveAndAttendance = isAdminOrHR || isOwnProfile || isManagerOfEmployee;

  // Can give kudos - anyone except to themselves
  const canGiveKudos = !isOwnProfile;

  // Can view position timeline - everyone (but salary visibility differs)
  const canViewPositionTimeline = true;

  // Can view salary in position timeline - Admin/HR or own profile only
  const canViewSalary = isAdminOrHR || isOwnProfile;

  // Can edit position timeline - Admin/HR only
  const canEditPositionTimeline = isAdminOrHR;

  // Can edit position description - Owner, Admin, HR, or Manager
  const canEditPositionDescription = isOwner || isAdminOrHR || isManagerOfEmployee;

  // Can add learning records - everyone can add
  const canAddLearning = true;
  const updateEmployeeField = async (field: string, value: string) => {
    if (!id) return;
    const {
      error
    } = await supabase.from("employees").update({
      [field]: value || null
    }).eq("id", id);
    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
    toast({
      title: "Updated successfully"
    });
    loadEmployee();
  };
  useEffect(() => {
    if (id) {
      loadEmployee();
      loadKudos();
      loadWins();
      loadPositionHistory();
      loadDirectReports();
      checkIsOwnProfile();
      checkIsManagerOfEmployee();
      loadUserRole();
      loadEmployeeProjects();
      loadCurrentLeave();
      loadEmployeeSchedule();
      loadPerformanceReviews();
    }
  }, [id]);
  
  // Load position ID when employee data is available
  useEffect(() => {
    if (employee?.position && employee?.organization_id) {
      loadPositionId(employee.position, employee.organization_id);
    }
  }, [employee?.position, employee?.organization_id]);
  const loadPerformanceReviews = async () => {
    if (!id) return;
    const {
      data
    } = await supabase.from("performance_reviews").select(`
        id,
        review_period_start,
        review_period_end,
        status,
        overall_rating,
        created_at,
        reviewer:employees!performance_reviews_reviewer_id_fkey(
          id,
          profiles!inner(full_name)
        )
      `).eq("employee_id", id).order("created_at", {
      ascending: false
    }).limit(5);
    if (data) setPerformanceReviews(data);
  };
  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case "pending_acknowledgment":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Awaiting Acknowledgment</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Manager Review</Badge>;
      case "self_assessment_pending":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Self-Assessment</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };
  const loadEmployeeSchedule = async () => {
    if (!id) return;
    const {
      data
    } = await supabase.from("employee_schedules").select("*").eq("employee_id", id).maybeSingle();
    setEmployeeSchedule(data);
  };
  const loadCurrentLeave = async () => {
    if (!id) return;
    const today = new Date().toISOString().split('T')[0];
    const {
      data
    } = await supabase.from("leave_requests").select("leave_type").eq("employee_id", id).eq("status", "approved").lte("start_date", today).gte("end_date", today).maybeSingle();
    setCurrentLeave(data);
  };
  const loadPositionId = async (positionName: string, orgId: string) => {
    if (!positionName || !orgId) return;
    const { data } = await supabase
      .from("positions")
      .select("id")
      .eq("name", positionName)
      .eq("organization_id", orgId)
      .maybeSingle();
    setPositionId(data?.id || null);
  };
  const loadUserRole = async () => {
    if (!id) return;
    const {
      data: employeeData
    } = await supabase.from("employees").select("user_id, organization_id").eq("id", id).single();
    if (!employeeData?.user_id || !employeeData?.organization_id) return;

    // Query user_roles for this organization, preferring higher-privilege roles
    const {
      data: roleData
    } = await supabase.from("user_roles").select("role").eq("user_id", employeeData.user_id).eq("organization_id", employeeData.organization_id).order("role", {
      ascending: true
    }) // owner comes before user alphabetically
    .limit(1).maybeSingle();
    setUserRole(roleData?.role || 'user');
  };
  const loadEmployeeProjects = async () => {
    if (!id) return;
    const {
      data
    } = await supabase.from("employee_projects").select(`
        id,
        project:projects(id, name, icon, color)
      `).eq("employee_id", id);
    if (data) {
      setEmployeeProjects(data.filter(ep => ep.project) as EmployeeProject[]);
    }
  };
  const checkIsOwnProfile = async () => {
    if (!id) return;
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      data: employeeData
    } = await supabase.from("employees").select("user_id").eq("id", id).single();
    setIsOwnProfile(employeeData?.user_id === user.id);
  };
  const checkIsManagerOfEmployee = async () => {
    if (!id) return;
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get current user's employee record
    const {
      data: currentUserEmployee
    } = await supabase.from("employees").select("id").eq("user_id", user.id).single();
    if (!currentUserEmployee) return;

    // Check if profile's manager_id matches current user's employee id
    const {
      data: profileEmployee
    } = await supabase.from("employees").select("manager_id").eq("id", id).single();
    setIsManagerOfEmployee(profileEmployee?.manager_id === currentUserEmployee.id);
  };
  const loadPositionHistory = async () => {
    if (!id) return;
    const {
      data
    } = await supabase.from("position_history").select(`
        id,
        position,
        department,
        salary,
        manager_id,
        effective_date,
        end_date,
        change_type,
        notes,
        manager:employees!position_history_manager_id_fkey(
          profiles!inner(full_name)
        )
      `).eq("employee_id", id).order("effective_date", {
      ascending: false
    });
    if (data) setPositionHistory(data);
  };
  const loadEmployee = async () => {
    const {
      data
    } = await supabase.from("employees").select(`
        id,
        user_id,
        status,
        position,
        department,
        salary,
        join_date,
        date_of_birth,
        phone,
        superpowers,
        manager_id,
        office_id,
        organization_id,
        personal_email,
        street,
        city,
        state,
        postcode,
        country,
        id_number,
        tax_number,
        remuneration,
        remuneration_currency,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        bank_details,
        position_effective_date,
        gender,
        profiles!inner(
          full_name,
          email,
          avatar_url
        ),
        offices(
          name,
          city,
          country
        )
      `).eq("id", id).single();
    if (data) {
      setEmployee(data);
      // Load manager if exists
      if (data.manager_id) {
        const {
          data: managerData
        } = await supabase.from("employees").select(`
            id,
            position,
            profiles!inner(full_name, avatar_url)
          `).eq("id", data.manager_id).single();
        if (managerData) {
          setManager(managerData);
        } else {
          setManager(null);
        }
      } else {
        setManager(null);
      }
      // Load office employee count
      if (data.office_id) {
        const {
          count
        } = await supabase.from("employees").select("id", {
          count: "exact",
          head: true
        }).eq("office_id", data.office_id).eq("status", "active");
        setOfficeEmployeeCount(count || 0);
      } else {
        setOfficeEmployeeCount(0);
      }
    }
    setLoading(false);
  };
  const loadDirectReports = async () => {
    if (!id) return;
    const {
      data
    } = await supabase.from("employees").select(`
        id,
        position,
        profiles!inner(full_name, avatar_url)
      `).eq("manager_id", id);
    if (data) setDirectReports(data);
  };
  const loadKudos = async () => {
    const {
      data
    } = await supabase.from("kudos").select(`
        id,
        comment,
        created_at,
        batch_id,
        employee:employees!kudos_employee_id_fkey(
          id,
          profiles!inner(full_name, avatar_url)
        ),
        given_by:employees!kudos_given_by_id_fkey(
          profiles!inner(full_name, avatar_url)
        )
      `).eq("employee_id", id).order("created_at", {
      ascending: false
    });
    if (data) {
      // Fetch other recipients for batch kudos
      const kudosWithOthers = await Promise.all(data.map(async (k: any) => {
        if (k.batch_id) {
          const {
            data: batchKudos
          } = await supabase.from("kudos").select("employee_id, employee:employees!kudos_employee_id_fkey(profiles!inner(full_name))").eq("batch_id", k.batch_id).neq("employee_id", id);
          return {
            ...k,
            otherRecipients: batchKudos?.map((bk: any) => bk.employee.profiles.full_name) || [],
            otherRecipientIds: batchKudos?.map((bk: any) => bk.employee_id) || []
          };
        }
        return {
          ...k,
          otherRecipients: [],
          otherRecipientIds: []
        };
      }));
      setKudos(kudosWithOthers);
    }
  };
  const loadWins = async () => {
    // Fetch wins posted by this employee
    const {
      data: postedWins
    } = await supabase.from("updates").select(`
        id,
        type,
        content,
        created_at,
        employee_id,
        image_url,
        employee:employees!inner(
          id,
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `).eq("employee_id", id).eq("type", "win").order("created_at", {
      ascending: false
    });

    // Fetch wins where this employee is tagged
    const {
      data: taggedWins
    } = await supabase.from("update_mentions").select(`
        update:updates!inner(
          id,
          type,
          content,
          created_at,
          employee_id,
          image_url,
          employee:employees!inner(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        )
      `).eq("employee_id", id).eq("update.type", "win");

    // Combine and deduplicate
    const allWins = new Map();
    if (postedWins) {
      postedWins.forEach((w: any) => {
        allWins.set(w.id, {
          id: w.id,
          employeeId: w.employee_id,
          employeeName: w.employee.profiles.full_name,
          content: w.content,
          date: w.created_at,
          avatar: w.employee.profiles.avatar_url,
          image_url: w.image_url,
          type: w.type as "win",
          taggedMembers: []
        });
      });
    }
    if (taggedWins) {
      taggedWins.forEach((t: any) => {
        const w = t.update;
        if (w && !allWins.has(w.id)) {
          allWins.set(w.id, {
            id: w.id,
            employeeId: w.employee_id,
            employeeName: w.employee.profiles.full_name,
            content: w.content,
            date: w.created_at,
            avatar: w.employee.profiles.avatar_url,
            image_url: w.image_url,
            type: w.type as "win",
            taggedMembers: []
          });
        }
      });
    }

    // Fetch tagged members for each win
    const winIds = Array.from(allWins.keys());
    if (winIds.length > 0) {
      const {
        data: mentions
      } = await supabase.from("update_mentions").select(`
          update_id,
          employee:employees!inner(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `).in("update_id", winIds);
      if (mentions) {
        mentions.forEach((m: any) => {
          const win = allWins.get(m.update_id);
          if (win) {
            win.taggedMembers.push({
              id: m.employee.id,
              name: m.employee.profiles.full_name,
              avatar: m.employee.profiles.avatar_url
            });
          }
        });
      }
    }

    // Sort by date descending
    const sortedWins = Array.from(allWins.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setWins(sortedWins);
  };
  if (loading) {
    return <Card className="p-12 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </Card>;
  }
  if (!employee) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground">Employee not found</p>
        <OrgLink to="/team">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Button>
        </OrgLink>
      </div>;
  }

  // Format partial address (city and country only) for limited view
  const partialAddress = [employee.city, employee.country].filter(Boolean).join(", ");

  // Format full address
  const fullAddress = [employee.street, employee.city, employee.state, employee.postcode, employee.country].filter(Boolean).join(", ");
  return <>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between pt-[10px]">
          <OrgLink to="/team">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Team</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </OrgLink>
          <div className="flex items-center gap-2">
            {isAdmin && !isOwnProfile && <div className="hidden sm:block">
                <DeleteTeamMemberDialog employeeId={id!} employeeName={employee.profiles.full_name} userId={employee.user_id} />
              </div>}
            <ProfileTimelineSheet employeeId={id!} employeeName={employee.profiles.full_name} />
          </div>
        </div>

        <Card className="p-4 overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-4 min-w-0">
            {/* Left side - Employee Info */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch flex-1 min-w-0">
              <div className="group relative flex items-center">
                <Avatar className="h-28 w-28 border-4 border-primary/10">
                  <AvatarImage src={employee.profiles.avatar_url || undefined} alt={employee.profiles.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-3xl font-bold">
                    {employee.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                {(isAdminOrHR || isOwnProfile) && <span className="absolute -bottom-1 -right-1 hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditAvatarDialog userId={employee.user_id} currentAvatarUrl={employee.profiles.avatar_url} userName={employee.profiles.full_name} onSuccess={loadEmployee} />
                  </span>}
              </div>
              <div className="flex-1 space-y-1.5 flex flex-col justify-center min-w-0">
                {/* Name with Status Badges */}
                <div className="group flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">{employee.profiles.full_name}</h1>
                  {isAdminOrHR && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditNameDialog userId={employee.user_id} currentName={employee.profiles.full_name} onSuccess={loadEmployee} />
                    </span>}
                  <Badge variant={employee.status === 'active' ? 'default' : employee.status === 'invited' ? 'secondary' : 'outline'} className={`text-xs ${employee.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' : employee.status === 'invited' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-muted text-muted-foreground'}`}>
                    {employee.status === 'active' ? 'Active' : employee.status === 'invited' ? 'Invited' : 'Inactive'}
                  </Badge>
                  {isAdminOrHR && <Button variant="ghost" size="icon" className="h-6 w-6 hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditStatusOpen(true)}>
                      <Pencil className="h-3 w-3" />
                    </Button>}
                  {currentLeave && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20 flex items-center gap-1">
                      <Palmtree className="h-3 w-3" />
                      On {currentLeave.leave_type}
                    </Badge>}
                </div>
                
                {/* Position, Department and Projects */}
                <div className="group flex items-center gap-2 flex-wrap">
                  <p className="text-base font-medium text-primary">{employee.position}</p>
                  <Badge variant="secondary" className="text-xs">{employee.department}</Badge>
                  {isAdminOrHR && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditEmployeeInfoDialog employeeId={id!} currentPosition={employee.position} currentDepartment={employee.department} onSuccess={loadEmployee} />
                    </span>}
                  <span className="text-muted-foreground">·</span>
                  {employeeProjects.length > 0 ? employeeProjects.map(ep => <Badge key={ep.id} variant="outline" className="flex items-center gap-1 text-xs px-2 py-0.5">
                        <DynamicIcon name={ep.project.icon} className="h-3 w-3" style={{
                    color: ep.project.color
                  }} />
                        {ep.project.name}
                      </Badge>) : <span className="text-xs text-muted-foreground italic">No projects</span>}
                  {isAdminOrHR && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditProjectsDialog employeeId={id!} onSuccess={loadEmployeeProjects} />
                    </span>}
                </div>
                
                {/* Email and User Role */}
                <div className="group flex items-center gap-2 flex-wrap">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{employee.profiles.email}</span>
                  {isAdminOrHR && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditEmailDialog userId={employee.user_id} currentEmail={employee.profiles.email} onSuccess={loadEmployee} />
                    </span>}
                  <span className="text-muted-foreground">·</span>
                  <Badge variant={userRole === 'owner' ? 'default' : userRole === 'admin' ? 'default' : userRole === 'hr' ? 'secondary' : 'outline'} className="text-xs">
                    {userRole === 'owner' ? 'Owner' : userRole === 'admin' ? 'Admin' : userRole === 'hr' ? 'HR' : 'User'}
                  </Badge>
                  {isAdminOrHR && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditUserRoleDialog userId={employee.user_id} currentRole={userRole} onSuccess={loadUserRole} />
                    </span>}
                </div>
                
                {/* Manager and Manages */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  {/* Manager */}
                  <div className="group flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Manager:</span>
                    {manager ? <div className="flex items-center gap-1.5">
                        <OrgLink to={`/team/${manager.id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                          <Avatar className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={manager.profiles.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-muted">
                              {manager.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground hover:text-primary">{manager.profiles.full_name}</span>
                        </OrgLink>
                        {canEditManager && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditManagerDialog employeeId={id!} currentManagerId={employee.manager_id} onSuccess={() => {
                        loadEmployee();
                        loadDirectReports();
                      }} />
                          </span>}
                      </div> : <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground italic">Not assigned</span>
                        {canEditManager && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditManagerDialog employeeId={id!} currentManagerId={employee.manager_id} onSuccess={() => {
                        loadEmployee();
                        loadDirectReports();
                      }} />
                          </span>}
                      </div>}
                  </div>
                  
                  {/* Direct Reports */}
                  {directReports.length > 0 && <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Manages:</span>
                      <div className="flex items-center">
                        {directReports.slice(0, 5).map((report, index) => <OrgLink key={report.id} to={`/team/${report.id}`} className={`hover:z-20 transition-transform hover:scale-110 ${index > 0 ? '-ml-1.5' : ''}`} style={{
                      zIndex: index
                    }} title={report.profiles.full_name}>
                            <Avatar className="h-6 w-6 border-2 border-background shadow-sm">
                              <AvatarImage src={report.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-muted">
                                {report.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                          </OrgLink>)}
                        {directReports.length > 5 && <Popover>
                            <PopoverTrigger asChild>
                              <button className="ml-0.5 text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer">
                                +{directReports.length - 5}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2 bg-popover" align="start">
                              <p className="text-xs font-medium text-muted-foreground mb-2">All Direct Reports ({directReports.length})</p>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {directReports.map(report => <OrgLink key={report.id} to={`/team/${report.id}`} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors">
                                    <Avatar className="h-6 w-6 border border-border">
                                      <AvatarImage src={report.profiles.avatar_url || undefined} />
                                      <AvatarFallback className="text-xs bg-muted">
                                        {report.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-foreground">{report.profiles.full_name}</span>
                                  </OrgLink>)}
                              </div>
                            </PopoverContent>
                          </Popover>}
                      </div>
                    </div>}
                </div>
              </div>
            </div>

            {/* Right side - Work Schedule */}
            {canViewLeaveAndAttendance && <div className="lg:w-80 lg:border-l lg:pl-4">
                <div className="hidden sm:block rounded-lg bg-card border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b">
                    <div className="flex items-center gap-2">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        Work Schedule
                      </h2>
                      {currentLeave ? (
                        <Badge 
                          variant="secondary" 
                          className="text-[10px] px-1.5 py-0 h-5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0"
                        >
                          <Palmtree className="h-3 w-3 mr-1" />
                          On Leave
                        </Badge>
                      ) : employeeSchedule?.work_location && (
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] px-1.5 py-0 h-5 ${WORK_LOCATION_CONFIG[displayLocation]?.bgColor} ${WORK_LOCATION_CONFIG[displayLocation]?.color} border-0`}
                        >
                          {displayLocation === 'office' ? (
                            <Building2 className="h-3 w-3 mr-1" />
                          ) : (
                            <Home className="h-3 w-3 mr-1" />
                          )}
                          {WORK_LOCATION_CONFIG[displayLocation]?.label}
                        </Badge>
                      )}
                    </div>
                    {isAdminOrHR && employee?.organization_id && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditScheduleOpen(true)}>
                        {employeeSchedule ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </Button>}
                  </div>
                  <div className="p-3">
                    {employeeSchedule ? <div className="grid grid-cols-7 gap-1">
                        {[{
                    key: 'mon',
                    label: 'M',
                    working: true
                  }, {
                    key: 'tue',
                    label: 'T',
                    working: true
                  }, {
                    key: 'wed',
                    label: 'W',
                    working: true
                  }, {
                    key: 'thu',
                    label: 'T',
                    working: true
                  }, {
                    key: 'fri',
                    label: 'F',
                    working: true
                  }, {
                    key: 'sat',
                    label: 'S',
                    working: false
                  }, {
                    key: 'sun',
                    label: 'S',
                    working: false
                  }].map(day => {
                    const formatTime12 = (time: string) => {
                      const [hours, minutes] = time.split(":");
                      const hour = parseInt(hours);
                      const hour12 = hour % 12 || 12;
                      return `${hour12}:${minutes}`;
                    };
                    return <div key={day.key} className={`rounded p-1.5 text-center ${day.working ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
                              <p className={`text-[10px] font-medium ${day.working ? 'text-primary' : 'text-muted-foreground'}`}>
                                {day.label}
                              </p>
                              {day.working ? <div className="mt-0.5">
                                  <p className="text-[9px] font-semibold text-foreground leading-tight">
                                    {formatTime12(employeeSchedule.work_start_time)}
                                  </p>
                                  <p className="text-[9px] font-semibold text-foreground leading-tight">
                                    {formatTime12(employeeSchedule.work_end_time)}
                                  </p>
                                </div> : <p className="text-[9px] text-muted-foreground mt-1">Off</p>}
                            </div>;
                  })}
                      </div> : <div className="text-center py-2">
                        <p className="text-xs text-muted-foreground">No schedule configured</p>
                        {isAdminOrHR && employee?.organization_id && <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => setEditScheduleOpen(true)}>
                            Set up schedule
                          </Button>}
                      </div>}
                  </div>
                </div>
              </div>}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-4 sm:space-y-6 lg:col-span-1 min-w-0 contents lg:block">

            {/* Position Timeline - visible to all, but salary and edit restricted */}
            {canViewPositionTimeline && <Card className="overflow-hidden order-2 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Position Timeline
                  </h2>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {canEditPositionTimeline && <AddPositionHistoryDialog employeeId={id!} onSuccess={() => {
                  loadPositionHistory();
                  loadEmployee();
                }} />}
                  </div>
                </div>
                <div className="p-4">
                  <PositionTimeline entries={positionHistory} currentPosition={employee.position} currentDepartment={employee.department} currentSalary={canViewSalary ? employee.remuneration : undefined} currentCurrency={employee.remuneration_currency || "USD"} currentEffectiveDate={employee.position_effective_date} employeeId={id} canEdit={canEditPositionTimeline} showSalary={canViewSalary} onRefresh={() => {
                loadPositionHistory();
                loadEmployee();
              }} />
                </div>
              </Card>}

            {/* KPIs Card */}
            {(isAdminOrHR || isOwnProfile || isManagerOfEmployee) && employee?.organization_id && <Card className="overflow-hidden order-2 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Target className="h-5 w-5 text-primary" />
                    KPIs
                  </h2>
                  {isAdminOrHR && <ManageKPIsDialog employeeId={id!} organizationId={employee.organization_id} employeeRole={employee.position} department={employee.department} />}
                </div>
                <div className="p-0">
                  <AIKPIInsights employeeId={id!} embedded />
                </div>
              </Card>}

            {/* Performance Reviews Card */}
            {(isAdminOrHR || isOwnProfile || isManagerOfEmployee) && <Card className="overflow-hidden order-2 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Performance Reviews
                    {performanceReviews.length > 0 && <Badge variant="secondary" className="text-xs">{performanceReviews.length}</Badge>}
                  </h2>
                  <OrgLink to={`/team/${id}/reviews`}>
                    <Button size="sm" variant="outline">
                      View All
                    </Button>
                  </OrgLink>
                </div>
                <CardContent className="p-4">
                  {performanceReviews.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
                      No performance reviews yet.
                    </p> : <div className="space-y-3">
                      {performanceReviews.map(review => <OrgLink key={review.id} to={`/team/${id}/reviews`} className="block p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {format(new Date(review.review_period_start), "MMM yyyy")} – {format(new Date(review.review_period_end), "MMM yyyy")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Reviewer: {review.reviewer?.profiles?.full_name || "Unknown"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {getReviewStatusBadge(review.status)}
                              {review.status === "completed" && review.overall_rating && <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-3.5 w-3.5 ${star <= review.overall_rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}
                                </div>}
                            </div>
                          </div>
                        </OrgLink>)}
                    </div>}
                </CardContent>
              </Card>}

            {/* Personal Details */}
            <Card className="overflow-hidden order-10 lg:order-none">
              <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <User className="h-5 w-5 text-primary" />
                  Personal Details
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Personal Email - only for those with full access */}
                {canViewAllDetails && <EditableField icon={<Mail className="h-5 w-5" />} label="Personal Email" value={employee.personal_email} onSave={value => updateEmployeeField("personal_email", value)} canEdit={canEditPersonalDetails} placeholder="Not specified" />}
                
                {/* Phone - only for those with full access */}
                {canViewAllDetails && <EditableField icon={<Phone className="h-5 w-5" />} label="Phone" value={employee.phone} onSave={value => updateEmployeeField("phone", value)} canEdit={canEditPersonalDetails} />}
                
                {/* Address - full for those with access, partial (city/country) for others */}
                {canViewAllDetails ? <div className="group flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Full Address</p>
                        {canEditPersonalDetails && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditAddressDialog address={{
                        street: employee.street,
                        city: employee.city,
                        state: employee.state,
                        postcode: employee.postcode,
                        country: employee.country
                      }} onSave={async address => {
                        const {
                          error
                        } = await supabase.from("employees").update({
                          street: address.street || null,
                          city: address.city || null,
                          state: address.state || null,
                          postcode: address.postcode || null,
                          country: address.country || null
                        }).eq("id", id);
                        if (error) {
                          toast({
                            title: "Update failed",
                            description: error.message,
                            variant: "destructive"
                          });
                        } else {
                          toast({
                            title: "Address updated"
                          });
                          loadEmployee();
                        }
                      }} />
                          </span>}
                      </div>
                      {fullAddress ? <p className="text-sm font-medium text-foreground">{fullAddress}</p> : <p className="text-sm text-muted-foreground italic">Not specified</p>}
                    </div>
                  </div> :
              // Partial address for team members viewing others
              <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      {partialAddress ? <p className="text-sm font-medium text-foreground">{partialAddress}</p> : <p className="text-sm text-muted-foreground italic">Not specified</p>}
                    </div>
                  </div>}
                
                {/* Date of Birth - only for those with full access */}
                {canViewAllDetails && <EditableDateField icon={<Calendar className="h-5 w-5" />} label="Date of Birth" value={employee.date_of_birth} onSave={value => updateEmployeeField("date_of_birth", value)} canEdit={canEditPersonalDetails} showAge />}
                
                {/* Gender - only for those with full access */}
                {canViewAllDetails && (
                  <div className="group flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Gender</p>
                        {canEditPersonalDetails && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="start">
                              <div className="space-y-1">
                                {[
                                  { value: 'male', label: 'Male' },
                                  { value: 'female', label: 'Female' },
                                  { value: 'other', label: 'Other' },
                                  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                                ].map((option) => (
                                  <Button
                                    key={option.value}
                                    variant={employee.gender === option.value ? "secondary" : "ghost"}
                                    className="w-full justify-start text-sm h-8"
                                    onClick={() => updateEmployeeField("gender", option.value)}
                                  >
                                    {option.label}
                                  </Button>
                                ))}
                                {employee.gender && (
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start text-sm h-8 text-muted-foreground"
                                    onClick={() => updateEmployeeField("gender", "")}
                                  >
                                    Clear
                                  </Button>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {employee.gender === 'prefer_not_to_say' ? 'Prefer not to say' : employee.gender || <span className="text-muted-foreground italic font-normal">Not specified</span>}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Join Date - visible to all, editable only by Admin/HR */}
                <EditableDateField icon={<Calendar className="h-5 w-5" />} label="Join Date" value={employee.join_date} onSave={value => updateEmployeeField("join_date", value)} canEdit={canEditJoinDateAndOffice} allowFutureDates />
                
                {/* Office - visible to all, editable only by Admin/HR */}
                <div className="group flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Office</p>
                      {canEditJoinDateAndOffice && <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <EditOfficeDialog employeeId={id!} currentOfficeId={employee.office_id} onSuccess={loadEmployee} />
                        </span>}
                    </div>
                    {employee.offices ? <>
                        <p className="text-sm font-medium text-foreground">{employee.offices.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {(employee.offices.city || employee.offices.country) && <span>
                              {[employee.offices.city, employee.offices.country].filter(Boolean).join(", ")}
                            </span>}
                          {officeEmployeeCount > 0 && <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {officeEmployeeCount} {officeEmployeeCount === 1 ? 'employee' : 'employees'}
                            </span>}
                        </div>
                      </> : <p className="text-sm text-muted-foreground">No office assigned</p>}
                  </div>
                </div>
              </div>
            </Card>

            {/* Tax & Banking - Only Admin/HR and own profile */}
            {canViewTaxBanking && <Card className="overflow-hidden order-11 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Tax & Banking
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  <EditableField icon={<FileText className="h-5 w-5" />} label="ID Number" value={employee.id_number} onSave={value => updateEmployeeField("id_number", value)} canEdit={canEditPersonalDetails} />
                  <EditableField icon={<FileText className="h-5 w-5" />} label="Tax Number" value={employee.tax_number} onSave={value => updateEmployeeField("tax_number", value)} canEdit={canEditPersonalDetails} />
                  <EditableField icon={<Building className="h-5 w-5" />} label="Bank Details" value={employee.bank_details} onSave={value => updateEmployeeField("bank_details", value)} type="textarea" canEdit={canEditPersonalDetails} placeholder="Enter bank account details" />
                </div>
              </Card>}

            {/* Emergency Contact - Admin/HR, own profile, or manager */}
            {canViewEmergencyContact && <Card className="overflow-hidden order-12 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Emergency Contact
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  <EditableField label="Contact Name" value={employee.emergency_contact_name} onSave={value => updateEmployeeField("emergency_contact_name", value)} canEdit={canEditPersonalDetails} />
                  <EditableField label="Contact Phone" value={employee.emergency_contact_phone} onSave={value => updateEmployeeField("emergency_contact_phone", value)} canEdit={canEditPersonalDetails} />
                  <EditableField label="Relationship" value={employee.emergency_contact_relationship} onSave={value => updateEmployeeField("emergency_contact_relationship", value)} canEdit={canEditPersonalDetails} />
                </div>
              </Card>}
          </div>

          <div className="space-y-4 sm:space-y-6 lg:col-span-2 min-w-0 contents lg:block">
            {/* AI Position Description - above Leave Balance */}
            {employee?.position && employee?.organization_id && (
              <PositionAIDescription
                positionId={positionId || undefined}
                positionName={employee.position}
                department={employee.department}
                organizationId={employee.organization_id}
                canEdit={canEditPositionDescription}
                employeeName={employee.profiles.full_name}
                projectNames={employeeProjects.map(ep => ep.project?.name).filter(Boolean)}
              />
            )}

            {employee.superpowers && employee.superpowers.length > 0 && <Card className="overflow-hidden order-3 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Superpowers
                  </h2>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {employee.superpowers.map((power: string, index: number) => <Badge key={index} variant="outline" className="bg-accent-light text-accent border-accent/20">
                        {power}
                      </Badge>)}
                  </div>
                </div>
              </Card>}

            {/* Leave Management - Admin/HR, own profile, or manager */}
            {canViewLeaveAndAttendance && <Card className="overflow-hidden order-4 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    Leave Balances
                  </h2>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <OrgLink to={`/leave-history?employee=${id}&dateRange=thisYear`}>
                      <Button size="sm" variant="ghost">
                        <History className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Leave History</span>
                      </Button>
                    </OrgLink>
                    {canManageLeave && <AddLeaveBalanceDialog employeeId={id!} />}
                  </div>
                </div>
                <div className="p-4">
                  <LeaveManagement employeeId={id!} />
                </div>
              </Card>}

            {/* Attendance Tracking - Admin/HR, own profile, or manager */}
            {canViewLeaveAndAttendance && <Card className="overflow-hidden order-5 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Clock className="h-5 w-5 text-primary" />
                    Attendance Tracking
                  </h2>
                  <div className="flex items-center gap-2">
                    {isOwnProfile && workLocation === 'office' && (
                      <Button variant="outline" size="sm" onClick={() => setWfhDialogOpen(true)}>
                        <Home className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Request WFH</span>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => window.location.href = `/team/${id}/attendance`}>
                      <History className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">View History</span>
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <AttendanceTracker employeeId={id!} showCheckIn={isOwnProfile} />
                </div>
                <AddWfhRequestDialog open={wfhDialogOpen} onOpenChange={setWfhDialogOpen} />
              </Card>}

            {/* Legacy Kudos and Wins section removed - Activity Feed now covers all posts including kudos and wins */}


            {/* Learning & Development */}
            <Card className="overflow-hidden order-7 lg:order-none">
              <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Learning & Development
                </h2>
                {canAddLearning && <AddLearningDialog employeeId={id!} />}
              </div>
              <div className="p-4">
                <LearningDevelopment employeeId={id!} />
              </div>
            </Card>

            {/* Activity Feed - Posts, Kudos Received, Mentions */}
            <Card className="overflow-hidden order-8 lg:order-none">
              <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Activity className="h-5 w-5 text-primary" />
                  Activity Feed
                </h2>
              </div>
              <div className="p-4">
                <ProfileActivityFeed employeeId={id!} />
              </div>
            </Card>

            {/* Documents - Admin/HR, own profile, or manager */}
            {canViewAllDetails && <Card className="overflow-hidden order-9 lg:order-none">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b gap-4">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground shrink-0">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Documents
                  </h2>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search documents..." value={documentSearch} onChange={e => setDocumentSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                  </div>
                </div>
                <div className="p-4">
                  <EmployeeDocuments employeeId={id!} isOwnProfile={isOwnProfile} searchQuery={documentSearch} />
                </div>
              </Card>}
          </div>
        </div>
      </div>
      
      {isAdminOrHR && <EditStatusDialog open={editStatusOpen} onOpenChange={setEditStatusOpen} employeeId={id!} currentStatus={employee?.status || 'invited'} onSuccess={loadEmployee} />}

      {isAdminOrHR && employee?.organization_id && <EditScheduleDialog open={editScheduleOpen} onOpenChange={setEditScheduleOpen} employeeId={id!} organizationId={employee.organization_id} currentSchedule={employeeSchedule} onSuccess={loadEmployeeSchedule} />}
    </>;
};
export default TeamMemberProfile;