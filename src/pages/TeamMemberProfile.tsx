import { Layout } from "@/components/Layout";
import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KudosCard } from "@/components/KudosCard";
import { GiveKudosDialog } from "@/components/dialogs/GiveKudosDialog";
import { PositionTimeline } from "@/components/PositionTimeline";
import { AddPositionHistoryDialog } from "@/components/dialogs/AddPositionHistoryDialog";
import { LearningDevelopment } from "@/components/LearningDevelopment";
import { AddLearningDialog } from "@/components/dialogs/AddLearningDialog";
import { LeaveManagement } from "@/components/LeaveManagement";

import { AttendanceTracker } from "@/components/AttendanceTracker";
import { EditManagerDialog } from "@/components/dialogs/EditManagerDialog";
import { EditOfficeDialog } from "@/components/dialogs/EditOfficeDialog";
import { EditAddressDialog } from "@/components/dialogs/EditAddressDialog";
import { EditableField } from "@/components/EditableField";
import { EditableDateField } from "@/components/EditableDateField";
import { Mail, Phone, MapPin, Calendar, User, Sparkles, ArrowLeft, Users, Building, CreditCard, FileText, AlertCircle, Building2, Heart, TrendingUp, GraduationCap, Clock, History } from "lucide-react";
import { AddLeaveBalanceDialog } from "@/components/dialogs/AddLeaveBalanceDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TeamMemberProfile = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { isHR, isAdmin } = useUserRole();
  
  const [employee, setEmployee] = useState<any>(null);
  const [kudos, setKudos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionHistory, setPositionHistory] = useState<any[]>([]);
  const [manager, setManager] = useState<any>(null);
  const [directReports, setDirectReports] = useState<any[]>([]);
  const [officeEmployeeCount, setOfficeEmployeeCount] = useState<number>(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isManagerOfEmployee, setIsManagerOfEmployee] = useState(false);

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
  
  // Can give kudos - anyone except to themselves
  const canGiveKudos = !isOwnProfile;
  
  // Can view position timeline - everyone (but salary visibility differs)
  const canViewPositionTimeline = true;
  
  // Can view salary in position timeline - Admin/HR, own profile, or manager
  const canViewSalary = isAdminOrHR || isOwnProfile || isManagerOfEmployee;
  
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
      loadPositionHistory();
      loadDirectReports();
      checkIsOwnProfile();
      checkIsManagerOfEmployee();
    }
  }, [id]);

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
        employee:employees!kudos_employee_id_fkey(
          id,
          profiles!inner(full_name, avatar_url)
        ),
        given_by:employees!kudos_given_by_id_fkey(
          profiles!inner(full_name)
        )
      `).eq("employee_id", id).order("created_at", {
      ascending: false
    });
    if (data) setKudos(data);
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
        <Link to="/team" className="-mb-6 block">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Button>
        </Link>

        <Card className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar className="h-24 w-24 border-4 border-primary/10">
              <AvatarImage src={employee.profiles.avatar_url || undefined} alt={employee.profiles.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-3xl font-bold">
                {employee.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">{employee.profiles.full_name}</h1>
              <p className="text-lg font-medium text-primary">{employee.position}</p>
              <Badge className="mt-2" variant="secondary">{employee.department}</Badge>
              
              <div className="mt-4 flex flex-wrap items-center gap-6">
                {/* Manager */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Manager:</span>
                  {manager ? <div className="flex items-center gap-2">
                      <Link to={`/team/${manager.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Avatar className="h-7 w-7 border-2 border-background">
                          <AvatarImage src={manager.profiles.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-muted">
                            {manager.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground hover:text-primary">{manager.profiles.full_name}</span>
                      </Link>
                      {canEditManager && <EditManagerDialog employeeId={id!} currentManagerId={employee.manager_id} onSuccess={() => {
                    loadEmployee();
                    loadDirectReports();
                  }} />}
                    </div> : <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground italic">Not assigned</span>
                      {canEditManager && <EditManagerDialog employeeId={id!} currentManagerId={employee.manager_id} onSuccess={() => {
                    loadEmployee();
                    loadDirectReports();
                  }} />}
                    </div>}
                </div>
                
                {/* Direct Reports */}
                {directReports.length > 0 && <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Manages:</span>
                    <div className="flex items-center">
                      {directReports.slice(0, 5).map((report, index) => <Link key={report.id} to={`/team/${report.id}`} className="hover:z-10 transition-transform hover:scale-110" style={{
                    marginLeft: index === 0 ? 0 : '-20%'
                  }} title={report.profiles.full_name}>
                          <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
                            <AvatarImage src={report.profiles.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-muted">
                              {report.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                        </Link>)}
                      {directReports.length > 5 && <span className="ml-2 text-sm text-muted-foreground">+{directReports.length - 5}</span>}
                    </div>
                  </div>}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            {/* Personal Details */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <User className="h-5 w-5 text-primary" />
                  Personal Details
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Company Email - visible to all */}
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company Email</p>
                    <p className="text-sm font-medium text-foreground">{employee.profiles.email}</p>
                  </div>
                </div>
                
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
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Full Address</p>
                        {canEditPersonalDetails && (
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
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Office</p>
                      {canEditJoinDateAndOffice && <EditOfficeDialog employeeId={id!} currentOfficeId={employee.office_id} onSuccess={loadEmployee} />}
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

            {/* Leave Management */}
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

            {/* Kudos Received */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Heart className="h-5 w-5 text-primary" />
                  Kudos Received
                  {kudos.length > 0 && <Badge variant="secondary" className="ml-1">{kudos.length}</Badge>}
                </h2>
                {canGiveKudos && (
                  <GiveKudosDialog preselectedEmployeeId={id} onSuccess={loadKudos} variant="outline" />
                )}
              </div>
              <div className="p-4">
                {kudos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {kudos.map(k => <KudosCard key={k.id} kudos={{
                      id: k.id,
                      employeeId: k.employee.id,
                      employeeName: k.employee.profiles.full_name,
                      givenBy: k.given_by.profiles.full_name,
                      givenByAvatar: k.given_by.profiles.avatar_url,
                      comment: k.comment,
                      date: k.created_at
                    }} />)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No kudos received yet</p>
                )}
              </div>
            </Card>

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

            {/* Attendance Tracking */}
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
          </div>
        </div>
      </div>
    </Layout>;
};
export default TeamMemberProfile;
