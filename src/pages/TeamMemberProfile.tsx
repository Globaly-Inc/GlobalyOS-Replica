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
import { EditableField } from "@/components/EditableField";
import { Mail, Phone, MapPin, Calendar, User, Sparkles, ArrowLeft, Users, Building, CreditCard, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TeamMemberProfile = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [employee, setEmployee] = useState<any>(null);
  const [kudos, setKudos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canViewSensitiveData, setCanViewSensitiveData] = useState(false);
  const [positionHistory, setPositionHistory] = useState<any[]>([]);
  const [manager, setManager] = useState<any>(null);
  const [directReports, setDirectReports] = useState<any[]>([]);

  const updateEmployeeField = async (field: string, value: string) => {
    if (!id) return;
    const { error } = await supabase
      .from("employees")
      .update({ [field]: value || null })
      .eq("id", id);
    
    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
    
    toast({ title: "Updated successfully" });
    loadEmployee();
  };

  useEffect(() => {
    if (id) {
      loadEmployee();
      loadKudos();
      checkPermissions();
      loadPositionHistory();
      loadDirectReports();
    }
  }, [id]);

  const checkPermissions = async () => {
    if (!id) return;
    
    const { data, error } = await supabase.rpc('can_view_employee_sensitive_data', {
      _employee_id: id
    });

    if (!error && data) {
      setCanViewSensitiveData(true);
    }
  };

  const loadPositionHistory = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("position_history")
      .select(`
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
      `)
      .eq("employee_id", id)
      .order("effective_date", { ascending: false });

    if (data) setPositionHistory(data);
  };

  const loadEmployee = async () => {
    const { data } = await supabase
      .from("employees")
      .select(`
        id,
        position,
        department,
        salary,
        join_date,
        phone,
        superpowers,
        manager_id,
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
        )
      `)
      .eq("id", id)
      .single();

    if (data) {
      setEmployee(data);
      // Load manager if exists
      if (data.manager_id) {
        const { data: managerData } = await supabase
          .from("employees")
          .select(`
            id,
            position,
            profiles!inner(full_name, avatar_url)
          `)
          .eq("id", data.manager_id)
          .single();
        if (managerData) setManager(managerData);
      }
    }
    setLoading(false);
  };

  const loadDirectReports = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from("employees")
      .select(`
        id,
        position,
        profiles!inner(full_name, avatar_url)
      `)
      .eq("manager_id", id);
    
    if (data) setDirectReports(data);
  };

  const loadKudos = async () => {
    const { data } = await supabase
      .from("kudos")
      .select(`
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
      `)
      .eq("employee_id", id)
      .order("created_at", { ascending: false });

    if (data) setKudos(data);
  };

  if (loading) {
    return (
      <Layout>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </Layout>
    );
  }

  if (!employee) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Employee not found</p>
          <Link to="/team">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Team
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
            </div>
            <GiveKudosDialog preselectedEmployeeId={id} onSuccess={loadKudos} />
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            {/* Contact Information */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <User className="h-5 w-5 text-primary" />
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company Email</p>
                    <p className="text-sm font-medium text-foreground">{employee.profiles.email}</p>
                  </div>
                </div>
                <EditableField
                  icon={<Mail className="h-5 w-5" />}
                  label="Personal Email"
                  value={employee.personal_email}
                  onSave={(value) => updateEmployeeField("personal_email", value)}
                  canEdit={canViewSensitiveData}
                  placeholder="Not specified"
                />
                <EditableField
                  icon={<Phone className="h-5 w-5" />}
                  label="Phone"
                  value={employee.phone}
                  onSave={(value) => updateEmployeeField("phone", value)}
                  canEdit={canViewSensitiveData}
                />
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Join Date</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(employee.join_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Manager</p>
                      {canViewSensitiveData && (
                        <EditManagerDialog
                          employeeId={id!}
                          currentManagerId={employee.manager_id}
                          onSuccess={() => {
                            loadEmployee();
                            loadDirectReports();
                          }}
                        />
                      )}
                    </div>
                    {manager ? (
                      <>
                        <Link to={`/team/${manager.id}`} className="text-sm font-medium text-primary hover:underline">
                          {manager.profiles.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{manager.position}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No manager assigned</p>
                    )}
                  </div>
                </div>
                {directReports.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Manages ({directReports.length})</p>
                      <div className="space-y-1 mt-1">
                        {directReports.map((report) => (
                          <div key={report.id}>
                            <Link to={`/team/${report.id}`} className="text-sm font-medium text-primary hover:underline">
                              {report.profiles.full_name}
                            </Link>
                            <span className="text-xs text-muted-foreground ml-1">• {report.position}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Address */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                Address
              </h2>
              <div className="space-y-4">
                <EditableField
                  label="Street"
                  value={employee.street}
                  onSave={(value) => updateEmployeeField("street", value)}
                  canEdit={canViewSensitiveData}
                />
                <EditableField
                  label="City"
                  value={employee.city}
                  onSave={(value) => updateEmployeeField("city", value)}
                  canEdit={canViewSensitiveData}
                />
                <EditableField
                  label="State"
                  value={employee.state}
                  onSave={(value) => updateEmployeeField("state", value)}
                  canEdit={canViewSensitiveData}
                />
                <EditableField
                  label="Postcode"
                  value={employee.postcode}
                  onSave={(value) => updateEmployeeField("postcode", value)}
                  canEdit={canViewSensitiveData}
                />
                <EditableField
                  label="Country"
                  value={employee.country}
                  onSave={(value) => updateEmployeeField("country", value)}
                  canEdit={canViewSensitiveData}
                />
              </div>
            </Card>

            {/* Tax & Banking */}
            {canViewSensitiveData && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Tax & Banking
                </h2>
                <div className="space-y-4">
                  <EditableField
                    icon={<FileText className="h-5 w-5" />}
                    label="ID Number"
                    value={employee.id_number}
                    onSave={(value) => updateEmployeeField("id_number", value)}
                    canEdit={canViewSensitiveData}
                  />
                  <EditableField
                    icon={<FileText className="h-5 w-5" />}
                    label="Tax Number"
                    value={employee.tax_number}
                    onSave={(value) => updateEmployeeField("tax_number", value)}
                    canEdit={canViewSensitiveData}
                  />
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Remuneration</p>
                      <p className="text-sm font-medium text-foreground">
                        {employee.remuneration 
                          ? `${employee.remuneration_currency || 'USD'} ${Number(employee.remuneration).toLocaleString()}`
                          : <span className="text-muted-foreground italic">Not specified</span>
                        }
                      </p>
                    </div>
                  </div>
                  <EditableField
                    icon={<Building className="h-5 w-5" />}
                    label="Bank Details"
                    value={employee.bank_details}
                    onSave={(value) => updateEmployeeField("bank_details", value)}
                    type="textarea"
                    canEdit={canViewSensitiveData}
                    placeholder="Enter bank account details"
                  />
                </div>
              </Card>
            )}

            {/* Emergency Contact */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <AlertCircle className="h-5 w-5 text-primary" />
                Emergency Contact
              </h2>
              <div className="space-y-4">
                <EditableField
                  label="Contact Name"
                  value={employee.emergency_contact_name}
                  onSave={(value) => updateEmployeeField("emergency_contact_name", value)}
                  canEdit={canViewSensitiveData}
                />
                <EditableField
                  label="Contact Phone"
                  value={employee.emergency_contact_phone}
                  onSave={(value) => updateEmployeeField("emergency_contact_phone", value)}
                  canEdit={canViewSensitiveData}
                />
                <EditableField
                  label="Relationship"
                  value={employee.emergency_contact_relationship}
                  onSave={(value) => updateEmployeeField("emergency_contact_relationship", value)}
                  canEdit={canViewSensitiveData}
                />
              </div>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {employee.superpowers && employee.superpowers.length > 0 && (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Superpowers
                </h2>
                <div className="flex flex-wrap gap-2">
                  {employee.superpowers.map((power: string, index: number) => (
                    <Badge key={index} variant="outline" className="bg-accent-light text-accent border-accent/20">
                      {power}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {canViewSensitiveData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">
                    Career Timeline
                  </h2>
                  <AddPositionHistoryDialog 
                    employeeId={id!} 
                    onSuccess={() => {
                      loadPositionHistory();
                      loadEmployee();
                    }} 
                  />
                </div>
                <PositionTimeline 
                  entries={positionHistory}
                  currentPosition={employee.position}
                  currentDepartment={employee.department}
                  currentSalary={employee.salary}
                />
              </div>
            )}

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
              {kudos.length > 0 ? (
                <div className="space-y-4">
                  {kudos.map((k) => (
                    <KudosCard
                      key={k.id}
                      kudos={{
                        id: k.id,
                        employeeId: k.employee.id,
                        employeeName: k.employee.profiles.full_name,
                        givenBy: k.given_by.profiles.full_name,
                        comment: k.comment,
                        date: k.created_at,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No kudos yet!</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TeamMemberProfile;
