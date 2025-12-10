import { Layout } from "@/components/Layout";
import { useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Mail, Phone, MapPin, Calendar, User, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const TeamMemberProfile = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [kudos, setKudos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canViewSensitiveData, setCanViewSensitiveData] = useState(false);
  const [positionHistory, setPositionHistory] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadEmployee();
      loadKudos();
      checkPermissions();
      loadPositionHistory();
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
        location,
        superpowers,
        profiles!inner(
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("id", id)
      .single();

    if (data) setEmployee(data);
    setLoading(false);
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

        <Card className="overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary via-primary-dark to-primary" />
          <div className="relative px-6 pb-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
              <Avatar className="absolute -top-16 h-32 w-32 border-4 border-card">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-4xl font-bold">
                  {employee.profiles.full_name.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="mt-20 flex-1 sm:mt-0 sm:ml-36">
                <h1 className="text-3xl font-bold text-foreground">{employee.profiles.full_name}</h1>
                <p className="text-lg font-medium text-primary">{employee.position}</p>
                <Badge className="mt-2" variant="secondary">{employee.department}</Badge>
              </div>
              <GiveKudosDialog preselectedEmployeeId={id} onSuccess={loadKudos} />
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-1">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <User className="h-5 w-5 text-primary" />
              Contact Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{employee.profiles.email}</p>
                </div>
              </div>
              {employee.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{employee.phone}</p>
                  </div>
                </div>
              )}
              {employee.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">{employee.location}</p>
                  </div>
                </div>
              )}
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
            </div>
          </Card>

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
