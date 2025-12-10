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
import { AddLeaveRequestDialog } from "@/components/dialogs/AddLeaveRequestDialog";
import { AttendanceTracker } from "@/components/AttendanceTracker";
import { EditManagerDialog } from "@/components/dialogs/EditManagerDialog";
import { EditOfficeDialog } from "@/components/dialogs/EditOfficeDialog";
import { EditAddressDialog } from "@/components/dialogs/EditAddressDialog";
import { EditableField } from "@/components/EditableField";
import { EditableDateField } from "@/components/EditableDateField";
import { Mail, Phone, MapPin, Calendar, User, Sparkles, ArrowLeft, Users, Building, CreditCard, FileText, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
const TeamMemberProfile = () => {
  const {
    id
  } = useParams();
  const {
    toast
  } = useToast();
  const [employee, setEmployee] = useState<any>(null);
  const [kudos, setKudos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canViewSensitiveData, setCanViewSensitiveData] = useState(false);
  const [positionHistory, setPositionHistory] = useState<any[]>([]);
  const [manager, setManager] = useState<any>(null);
  const [directReports, setDirectReports] = useState<any[]>([]);
  const [officeEmployeeCount, setOfficeEmployeeCount] = useState<number>(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
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
      checkPermissions();
      loadPositionHistory();
      loadDirectReports();
      checkIsOwnProfile();
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
  const checkPermissions = async () => {
    if (!id) return;
    const {
      data,
      error
    } = await supabase.rpc('can_view_employee_sensitive_data', {
      _employee_id: id
    });
    if (!error && data) {
      setCanViewSensitiveData(true);
    }
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
                      {canViewSensitiveData && <EditManagerDialog employeeId={id!} currentManagerId={employee.manager_id} onSuccess={() => {
                    loadEmployee();
                    loadDirectReports();
                  }} />}
                    </div> : <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground italic">Not assigned</span>
                      {canViewSensitiveData && <EditManagerDialog employeeId={id!} currentManagerId={employee.manager_id} onSuccess={() => {
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
            <GiveKudosDialog preselectedEmployeeId={id} onSuccess={loadKudos} />
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            {/* Personal Details */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <User className="h-5 w-5 text-primary" />
                Personal Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company Email</p>
                    <p className="text-sm font-medium text-foreground">{employee.profiles.email}</p>
                  </div>
                </div>
                <EditableField icon={<Mail className="h-5 w-5" />} label="Personal Email" value={employee.personal_email} onSave={value => updateEmployeeField("personal_email", value)} canEdit={canViewSensitiveData} placeholder="Not specified" />
                <EditableField icon={<Phone className="h-5 w-5" />} label="Phone" value={employee.phone} onSave={value => updateEmployeeField("phone", value)} canEdit={canViewSensitiveData} />
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Full Address</p>
                      {canViewSensitiveData && (
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
                    {employee.street || employee.city || employee.state || employee.postcode || employee.country ? (
                      <p className="text-sm font-medium text-foreground">
                        {[employee.street, employee.city, employee.state, employee.postcode, employee.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not specified</p>
                    )}
                  </div>
                </div>
                <EditableDateField icon={<Calendar className="h-5 w-5" />} label="Date of Birth" value={employee.date_of_birth} onSave={value => updateEmployeeField("date_of_birth", value)} canEdit={canViewSensitiveData} showAge />
                <EditableDateField icon={<Calendar className="h-5 w-5" />} label="Join Date" value={employee.join_date} onSave={value => updateEmployeeField("join_date", value)} canEdit={canViewSensitiveData} allowFutureDates />
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Office</p>
                      {canViewSensitiveData && <EditOfficeDialog employeeId={id!} currentOfficeId={employee.office_id} onSuccess={loadEmployee} />}
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


            {/* Tax & Banking */}
            {canViewSensitiveData && <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Tax & Banking
                </h2>
                <div className="space-y-4">
                  <EditableField icon={<FileText className="h-5 w-5" />} label="ID Number" value={employee.id_number} onSave={value => updateEmployeeField("id_number", value)} canEdit={canViewSensitiveData} />
                  <EditableField icon={<FileText className="h-5 w-5" />} label="Tax Number" value={employee.tax_number} onSave={value => updateEmployeeField("tax_number", value)} canEdit={canViewSensitiveData} />
                  <EditableField icon={<Building className="h-5 w-5" />} label="Bank Details" value={employee.bank_details} onSave={value => updateEmployeeField("bank_details", value)} type="textarea" canEdit={canViewSensitiveData} placeholder="Enter bank account details" />
                </div>
              </Card>}

            {/* Emergency Contact */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <AlertCircle className="h-5 w-5 text-primary" />
                Emergency Contact
              </h2>
              <div className="space-y-4">
                <EditableField label="Contact Name" value={employee.emergency_contact_name} onSave={value => updateEmployeeField("emergency_contact_name", value)} canEdit={canViewSensitiveData} />
                <EditableField label="Contact Phone" value={employee.emergency_contact_phone} onSave={value => updateEmployeeField("emergency_contact_phone", value)} canEdit={canViewSensitiveData} />
                <EditableField label="Relationship" value={employee.emergency_contact_relationship} onSave={value => updateEmployeeField("emergency_contact_relationship", value)} canEdit={canViewSensitiveData} />
              </div>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {employee.superpowers && employee.superpowers.length > 0 && <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Superpowers
                </h2>
                <div className="flex flex-wrap gap-2">
                  {employee.superpowers.map((power: string, index: number) => <Badge key={index} variant="outline" className="bg-accent-light text-accent border-accent/20">
                      {power}
                    </Badge>)}
                </div>
              </Card>}

            {canViewSensitiveData && <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">
                    Position Timeline
                  </h2>
                  <AddPositionHistoryDialog employeeId={id!} onSuccess={() => {
                loadPositionHistory();
                loadEmployee();
              }} />
                </div>
                <PositionTimeline 
                  entries={positionHistory} 
                  currentPosition={employee.position} 
                  currentDepartment={employee.department} 
                  currentSalary={employee.salary}
                  employeeId={id}
                  canEdit={canViewSensitiveData}
                  onRefresh={() => {
                    loadPositionHistory();
                    loadEmployee();
                  }}
                />
              </div>}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">
                  Learning & Development
                </h2>
                <AddLearningDialog employeeId={id!} />
              </div>
              <LearningDevelopment employeeId={id!} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">
                  Leave Management
                </h2>
                <AddLeaveRequestDialog employeeId={id!} />
              </div>
              <LeaveManagement employeeId={id!} />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">
                Attendance Tracking
              </h2>
              <AttendanceTracker employeeId={id!} showCheckIn={true} />
            </div>

            <div>
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                Kudos Received ({kudos.length})
              </h2>
              {kudos.length > 0 ? <div className="space-y-4">
                  {kudos.map(k => <KudosCard key={k.id} kudos={{
                id: k.id,
                employeeId: k.employee.id,
                employeeName: k.employee.profiles.full_name,
                givenBy: k.given_by.profiles.full_name,
                comment: k.comment,
                date: k.created_at
              }} />)}
                </div> : <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No kudos yet!</p>
                </Card>}
            </div>
          </div>
        </div>
      </div>
    </Layout>;
};
export default TeamMemberProfile;