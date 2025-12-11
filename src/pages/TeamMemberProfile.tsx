import { Layout } from "@/components/Layout";
import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KudosCard } from "@/components/KudosCard";
import { UpdateCard } from "@/components/UpdateCard";
import { Update } from "@/types/employee";
import { GiveKudosDialog } from "@/components/dialogs/GiveKudosDialog";
import { PositionTimeline } from "@/components/PositionTimeline";
import { AddPositionHistoryDialog } from "@/components/dialogs/AddPositionHistoryDialog";
import { LearningDevelopment } from "@/components/LearningDevelopment";
import { AddLearningDialog } from "@/components/dialogs/AddLearningDialog";
import { LeaveManagement } from "@/components/LeaveManagement";
import { EmployeeDocuments } from "@/components/EmployeeDocuments";

import { AttendanceTracker } from "@/components/AttendanceTracker";
import { EditManagerDialog } from "@/components/dialogs/EditManagerDialog";
import { EditOfficeDialog } from "@/components/dialogs/EditOfficeDialog";
import { EditAddressDialog } from "@/components/dialogs/EditAddressDialog";
import { EditNameDialog } from "@/components/dialogs/EditNameDialog";
import { EditEmailDialog } from "@/components/dialogs/EditEmailDialog";
import { EditEmployeeInfoDialog } from "@/components/dialogs/EditEmployeeInfoDialog";
import { EditUserRoleDialog } from "@/components/dialogs/EditUserRoleDialog";
import { EditProjectsDialog } from "@/components/dialogs/EditProjectsDialog";
import { EditAvatarDialog } from "@/components/dialogs/EditAvatarDialog";
import { EditableField } from "@/components/EditableField";
import { EditableDateField } from "@/components/EditableDateField";
import { Mail, Phone, MapPin, Calendar, User, Sparkles, ArrowLeft, Users, Building, CreditCard, FileText, AlertCircle, Building2, Heart, TrendingUp, GraduationCap, Clock, History, FolderKanban, Palmtree, FolderOpen, Search, Trophy } from "lucide-react";
import { ProfileAISummary } from "@/components/ProfileAISummary";
import { ProfileTimelineSheet } from "@/components/ProfileTimelineSheet";
import { AddLeaveBalanceDialog } from "@/components/dialogs/AddLeaveBalanceDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { icons } from "lucide-react";
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

const DynamicIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const IconComponent = (icons as any)[name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] || icons.Folder;
  return <IconComponent className={className} style={style} />;
};

const TeamMemberProfile = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { isHR, isAdmin } = useUserRole();
  
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
  const [currentLeave, setCurrentLeave] = useState<{ leave_type: string } | null>(null);
  const [documentSearch, setDocumentSearch] = useState('');

  // Permission flags based on roles and relationships
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
  
  // Can add learning records - everyone can add
  const canAddLearning = true;

  const updateEmployeeField = async (field: string, value: string) => {
    if (!id) return;
    const { error } = await supabase.from("employees").update({
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
    }
  }, [id]);

  const loadCurrentLeave = async () => {
    if (!id) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("leave_requests")
      .select("leave_type")
      .eq("employee_id", id)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .maybeSingle();
    
    setCurrentLeave(data);
  };

  const loadUserRole = async () => {
    if (!id) return;
    const { data: employeeData } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", id)
      .single();
    
    if (!employeeData?.user_id) return;
    
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", employeeData.user_id)
      .maybeSingle();
    
    setUserRole(roleData?.role || null);
  };

  const loadEmployeeProjects = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("employee_projects")
      .select(`
        id,
        project:projects(id, name, icon, color)
      `)
      .eq("employee_id", id);
    
    if (data) {
      setEmployeeProjects(data.filter(ep => ep.project) as EmployeeProject[]);
    }
  };

  const checkIsOwnProfile = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: employeeData } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", id)
      .single();
    
    setIsOwnProfile(employeeData?.user_id === user.id);
  };

  const checkIsManagerOfEmployee = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Get current user's employee record
    const { data: currentUserEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    if (!currentUserEmployee) return;
    
    // Check if profile's manager_id matches current user's employee id
    const { data: profileEmployee } = await supabase
      .from("employees")
      .select("manager_id")
      .eq("id", id)
      .single();
    
    setIsManagerOfEmployee(profileEmployee?.manager_id === currentUserEmployee.id);
  };

  const loadPositionHistory = async () => {
    if (!id) return;
    const { data } = await supabase.from("position_history").select(`
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
    const { data } = await supabase.from("employees").select(`
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
        const { data: managerData } = await supabase.from("employees").select(`
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
        const { count } = await supabase.from("employees").select("id", {
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
    const { data } = await supabase.from("employees").select(`
        id,
        position,
        profiles!inner(full_name, avatar_url)
      `).eq("manager_id", id);
    if (data) setDirectReports(data);
  };

  const loadKudos = async () => {
    const { data } = await supabase.from("kudos").select(`
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
          const { data: batchKudos } = await supabase
            .from("kudos")
            .select("employee_id, employee:employees!kudos_employee_id_fkey(profiles!inner(full_name))")
            .eq("batch_id", k.batch_id)
            .neq("employee_id", id);
          
          return {
            ...k,
            otherRecipients: batchKudos?.map((bk: any) => bk.employee.profiles.full_name) || [],
            otherRecipientIds: batchKudos?.map((bk: any) => bk.employee_id) || []
          };
        }
        return { ...k, otherRecipients: [], otherRecipientIds: [] };
      }));
      setKudos(kudosWithOthers);
    }
  };

  const loadWins = async () => {
    const { data } = await supabase.from("updates").select(`
        id,
        type,
        content,
        created_at,
        employee_id,
        employee:employees!inner(
          id,
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `)
      .eq("employee_id", id)
      .eq("type", "win")
      .order("created_at", { ascending: false });
    
    if (data) {
      setWins(data.map((w: any) => ({
        id: w.id,
        employeeId: w.employee_id,
        employeeName: w.employee.profiles.full_name,
        content: w.content,
        date: w.created_at,
        avatar: w.employee.profiles.avatar_url,
        type: w.type as "win"
      })));
    }
  };

  if (loading) {
    return <Layout>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </Layout>;
  }

  if (!employee) {
    return <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Employee not found</p>
          <Link to="/team">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Team
            </Button>
          </Link>
        </div>
      </Layout>;
  }

  // Format partial address (city and country only) for limited view
  const partialAddress = [employee.city, employee.country].filter(Boolean).join(", ");
  
  // Format full address
  const fullAddress = [employee.street, employee.city, employee.state, employee.postcode, employee.country]
    .filter(Boolean)
    .join(", ");

  return <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between -mb-6">
          <Link to="/team">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Team
            </Button>
          </Link>
          <ProfileTimelineSheet 
            employeeId={id!} 
            employeeName={employee.profiles.full_name} 
          />
        </div>

        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left side - Employee Info */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch flex-1">
              <div className="group relative flex items-center">
                <Avatar className="h-28 w-28 border-4 border-primary/10">
                  <AvatarImage src={employee.profiles.avatar_url || undefined} alt={employee.profiles.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-3xl font-bold">
                    {employee.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                {(isAdminOrHR || isOwnProfile) && (
                  <span className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditAvatarDialog
                      userId={employee.user_id}
                      currentAvatarUrl={employee.profiles.avatar_url}
                      userName={employee.profiles.full_name}
                      onSuccess={loadEmployee}
                    />
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1.5 flex flex-col justify-center">
                {/* Name with Status Badges */}
                <div className="group flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">{employee.profiles.full_name}</h1>
                  {isAdminOrHR && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditNameDialog
                        userId={employee.user_id}
                        currentName={employee.profiles.full_name}
                        onSuccess={loadEmployee}
                      />
                    </span>
                  )}
                  <Badge 
                    variant={employee.status === 'active' ? 'default' : employee.status === 'invited' ? 'secondary' : 'outline'}
                    className={`text-xs ${employee.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' : employee.status === 'invited' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-muted text-muted-foreground'}`}
                  >
                    {employee.status === 'active' ? 'Active' : employee.status === 'invited' ? 'Invited' : 'Inactive'}
                  </Badge>
                  {currentLeave && (
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20 flex items-center gap-1">
                      <Palmtree className="h-3 w-3" />
                      On {currentLeave.leave_type}
                    </Badge>
                  )}
                </div>
                
                {/* Position, Department and Projects */}
                <div className="group flex items-center gap-2 flex-wrap">
                  <p className="text-base font-medium text-primary">{employee.position}</p>
                  <Badge variant="secondary" className="text-xs">{employee.department}</Badge>
                  {isAdminOrHR && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditEmployeeInfoDialog
                        employeeId={id!}
                        currentPosition={employee.position}
                        currentDepartment={employee.department}
                        onSuccess={loadEmployee}
                      />
                    </span>
                  )}
                  <span className="text-muted-foreground">·</span>
                  {employeeProjects.length > 0 ? (
                    employeeProjects.map((ep) => (
                      <Badge key={ep.id} variant="outline" className="flex items-center gap-1 text-xs px-2 py-0.5">
                        <DynamicIcon name={ep.project.icon} className="h-3 w-3" style={{ color: ep.project.color }} />
                        {ep.project.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No projects</span>
                  )}
                  {isAdminOrHR && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditProjectsDialog
                        employeeId={id!}
                        onSuccess={loadEmployeeProjects}
                      />
                    </span>
                  )}
                </div>
                
                {/* Email and User Role */}
                <div className="group flex items-center gap-2 flex-wrap">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{employee.profiles.email}</span>
                  {isAdminOrHR && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditEmailDialog
                        userId={employee.user_id}
                        currentEmail={employee.profiles.email}
                        onSuccess={loadEmployee}
                      />
                    </span>
                  )}
                  <span className="text-muted-foreground">·</span>
                  <Badge variant={userRole === 'admin' ? 'default' : userRole === 'hr' ? 'secondary' : 'outline'} className="text-xs">
                    {userRole === 'admin' ? 'Admin' : userRole === 'hr' ? 'HR' : 'Team Member'}
                  </Badge>
                  {isAdminOrHR && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditUserRoleDialog
                        userId={employee.user_id}
                        currentRole={userRole}
                        onSuccess={loadUserRole}
                      />
                    </span>
                  )}
                </div>
                
                {/* Manager and Manages */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  {/* Manager */}
                  <div className="group flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Manager:</span>
                    {manager ? (
                      <div className="flex items-center gap-1.5">
                        <Link to={`/team/${manager.id}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                          <Avatar className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={manager.profiles.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-muted">
                              {manager.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground hover:text-primary">{manager.profiles.full_name}</span>
                        </Link>
                        {canEditManager && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditManagerDialog employeeId={id!} currentManagerId={employee.manager_id} onSuccess={() => {
                              loadEmployee();
                              loadDirectReports();
                            }} />
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground italic">Not assigned</span>
                        {canEditManager && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditManagerDialog employeeId={id!} currentManagerId={employee.manager_id} onSuccess={() => {
                              loadEmployee();
                              loadDirectReports();
                            }} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Direct Reports */}
                  {directReports.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Manages:</span>
                      <div className="flex items-center">
                        {directReports.slice(0, 5).map((report, index) => (
                          <Link key={report.id} to={`/team/${report.id}`} className="hover:z-10 transition-transform hover:scale-110" style={{
                            marginLeft: index === 0 ? 0 : '-20%'
                          }} title={report.profiles.full_name}>
                            <Avatar className="h-6 w-6 border-2 border-background shadow-sm">
                              <AvatarImage src={report.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-muted">
                                {report.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        ))}
                        {directReports.length > 5 && <span className="ml-1.5 text-xs text-muted-foreground">+{directReports.length - 5}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - AI Summary */}
            <div className="lg:w-96 lg:border-l lg:pl-4">
              <ProfileAISummary 
                employeeId={id!}
                employee={{
                  name: employee.profiles.full_name,
                  position: employee.position,
                  department: employee.department,
                  joinDate: employee.join_date,
                  office: employee.offices?.name,
                  superpowers: employee.superpowers,
                  projects: employeeProjects.map(ep => ep.project.name),
                  kudosCount: kudos.length,
                  recentKudos: kudos.slice(0, 3).map(k => k.comment),
                  directReportsCount: directReports.length,
                  managerName: manager?.profiles?.full_name,
                  organizationId: employee.organization_id,
                }}
                compact
              />
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            {/* Position Timeline - visible to all, but salary and edit restricted */}
            {canViewPositionTimeline && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Position Timeline
                  </h2>
                  {canEditPositionTimeline && (
                    <AddPositionHistoryDialog employeeId={id!} onSuccess={() => {
                      loadPositionHistory();
                      loadEmployee();
                    }} />
                  )}
                </div>
                <div className="p-4">
                  <PositionTimeline 
                    entries={positionHistory} 
                    currentPosition={employee.position} 
                    currentDepartment={employee.department} 
                    currentSalary={canViewSalary ? employee.remuneration : undefined}
                    currentCurrency={employee.remuneration_currency || "USD"}
                    employeeId={id}
                    canEdit={canEditPositionTimeline}
                    showSalary={canViewSalary}
                    onRefresh={() => {
                      loadPositionHistory();
                      loadEmployee();
                    }}
                  />
                </div>
              </Card>
            )}

            {/* Personal Details */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <User className="h-5 w-5 text-primary" />
                  Personal Details
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Personal Email - only for those with full access */}
                {canViewAllDetails && (
                  <EditableField 
                    icon={<Mail className="h-5 w-5" />} 
                    label="Personal Email" 
                    value={employee.personal_email} 
                    onSave={value => updateEmployeeField("personal_email", value)} 
                    canEdit={canEditPersonalDetails} 
                    placeholder="Not specified" 
                  />
                )}
                
                {/* Phone - only for those with full access */}
                {canViewAllDetails && (
                  <EditableField 
                    icon={<Phone className="h-5 w-5" />} 
                    label="Phone" 
                    value={employee.phone} 
                    onSave={value => updateEmployeeField("phone", value)} 
                    canEdit={canEditPersonalDetails} 
                  />
                )}
                
                {/* Address - full for those with access, partial (city/country) for others */}
                {canViewAllDetails ? (
                  <div className="group flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Full Address</p>
                        {canEditPersonalDetails && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <EditAddressDialog
                              address={{
                                street: employee.street,
                                city: employee.city,
                                state: employee.state,
                                postcode: employee.postcode,
                                country: employee.country,
                              }}
                              onSave={async (address) => {
                                const { error } = await supabase
                                  .from("employees")
                                  .update({
                                    street: address.street || null,
                                    city: address.city || null,
                                    state: address.state || null,
                                    postcode: address.postcode || null,
                                    country: address.country || null,
                                  })
                                  .eq("id", id);
                                if (error) {
                                  toast({
                                    title: "Update failed",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                } else {
                                  toast({ title: "Address updated" });
                                  loadEmployee();
                                }
                              }}
                            />
                          </span>
                        )}
                      </div>
                      {fullAddress ? (
                        <p className="text-sm font-medium text-foreground">{fullAddress}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not specified</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Partial address for team members viewing others
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      {partialAddress ? (
                        <p className="text-sm font-medium text-foreground">{partialAddress}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not specified</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Date of Birth - only for those with full access */}
                {canViewAllDetails && (
                  <EditableDateField 
                    icon={<Calendar className="h-5 w-5" />} 
                    label="Date of Birth" 
                    value={employee.date_of_birth} 
                    onSave={value => updateEmployeeField("date_of_birth", value)} 
                    canEdit={canEditPersonalDetails} 
                    showAge 
                  />
                )}
                
                {/* Join Date - visible to all, editable only by Admin/HR */}
                <EditableDateField 
                  icon={<Calendar className="h-5 w-5" />} 
                  label="Join Date" 
                  value={employee.join_date} 
                  onSave={value => updateEmployeeField("join_date", value)} 
                  canEdit={canEditJoinDateAndOffice} 
                  allowFutureDates 
                />
                
                {/* Office - visible to all, editable only by Admin/HR */}
                <div className="group flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Office</p>
                      {canEditJoinDateAndOffice && (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <EditOfficeDialog employeeId={id!} currentOfficeId={employee.office_id} onSuccess={loadEmployee} />
                        </span>
                      )}
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
            {canViewTaxBanking && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Tax & Banking
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  <EditableField 
                    icon={<FileText className="h-5 w-5" />} 
                    label="ID Number" 
                    value={employee.id_number} 
                    onSave={value => updateEmployeeField("id_number", value)} 
                    canEdit={canEditPersonalDetails} 
                  />
                  <EditableField 
                    icon={<FileText className="h-5 w-5" />} 
                    label="Tax Number" 
                    value={employee.tax_number} 
                    onSave={value => updateEmployeeField("tax_number", value)} 
                    canEdit={canEditPersonalDetails} 
                  />
                  <EditableField 
                    icon={<Building className="h-5 w-5" />} 
                    label="Bank Details" 
                    value={employee.bank_details} 
                    onSave={value => updateEmployeeField("bank_details", value)} 
                    type="textarea" 
                    canEdit={canEditPersonalDetails} 
                    placeholder="Enter bank account details" 
                  />
                </div>
              </Card>
            )}

            {/* Emergency Contact - Admin/HR, own profile, or manager */}
            {canViewEmergencyContact && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Emergency Contact
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  <EditableField 
                    label="Contact Name" 
                    value={employee.emergency_contact_name} 
                    onSave={value => updateEmployeeField("emergency_contact_name", value)} 
                    canEdit={canEditPersonalDetails} 
                  />
                  <EditableField 
                    label="Contact Phone" 
                    value={employee.emergency_contact_phone} 
                    onSave={value => updateEmployeeField("emergency_contact_phone", value)} 
                    canEdit={canEditPersonalDetails} 
                  />
                  <EditableField 
                    label="Relationship" 
                    value={employee.emergency_contact_relationship} 
                    onSave={value => updateEmployeeField("emergency_contact_relationship", value)} 
                    canEdit={canEditPersonalDetails} 
                  />
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6 lg:col-span-2">
            {employee.superpowers && employee.superpowers.length > 0 && (
              <Card className="overflow-hidden">
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
              </Card>
            )}

            {/* Leave Management - Admin/HR, own profile, or manager */}
            {canViewLeaveAndAttendance && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    Leave Balances
                  </h2>
                  <div className="flex items-center gap-2">
                    <Link to={`/team/${id}/leave-history`}>
                      <Button size="sm" variant="ghost">
                        <History className="h-4 w-4 mr-1" />
                        Leave History
                      </Button>
                    </Link>
                    {canManageLeave && (
                      <AddLeaveBalanceDialog employeeId={id!} />
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <LeaveManagement employeeId={id!} />
                </div>
              </Card>
            )}

            {/* Recognition & Wins */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Heart className="h-5 w-5 text-primary" />
                  Recognition & Wins
                  {(kudos.length + wins.length) > 0 && <Badge variant="secondary" className="ml-1">{kudos.length + wins.length}</Badge>}
                </h2>
                {canGiveKudos && (
                  <GiveKudosDialog preselectedEmployeeId={id} onSuccess={loadKudos} variant="outline" />
                )}
              </div>
              <div className="p-4 space-y-4">
                {/* Kudos Section */}
                {kudos.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Heart className="h-3 w-3" /> Kudos Received ({kudos.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {kudos.map(k => <KudosCard key={k.id} kudos={{
                        id: k.id,
                        employeeId: k.employee.id,
                        employeeName: k.employee.profiles.full_name,
                        givenBy: k.given_by.profiles.full_name,
                        givenById: k.given_by.id,
                        givenByAvatar: k.given_by.profiles.avatar_url,
                        comment: k.comment,
                        date: k.created_at,
                        batchId: k.batch_id || undefined,
                        otherRecipients: k.otherRecipients,
                        otherRecipientIds: k.otherRecipientIds
                      }} onDelete={loadKudos} />)}
                    </div>
                  </div>
                )}

                {/* Wins Section */}
                {wins.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Trophy className="h-3 w-3" /> Wins Posted ({wins.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {wins.map(w => (
                        <div key={w.id} className="bg-card border rounded-lg p-3 border-l-4 border-l-amber-500">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={w.avatar} />
                              <AvatarFallback className="text-[10px]">{w.employeeName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{w.employeeName}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(w.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: w.content }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {kudos.length === 0 && wins.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No recognition or wins yet</p>
                )}
              </div>
            </Card>


            {/* Learning & Development */}
            <Card className="overflow-hidden">
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

            {/* Documents - Admin/HR, own profile, or manager */}
            {canViewAllDetails && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b gap-4">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground shrink-0">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Documents
                  </h2>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={documentSearch}
                      onChange={(e) => setDocumentSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="p-4">
                  <EmployeeDocuments 
                    employeeId={id!} 
                    isOwnProfile={isOwnProfile} 
                    searchQuery={documentSearch}
                  />
                </div>
              </Card>
            )}

            {/* Attendance Tracking - Admin/HR, own profile, or manager */}
            {canViewLeaveAndAttendance && (
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Clock className="h-5 w-5 text-primary" />
                    Attendance Tracking
                  </h2>
                </div>
                <div className="p-4">
                  <AttendanceTracker employeeId={id!} showCheckIn={isOwnProfile} />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>;
};
export default TeamMemberProfile;
