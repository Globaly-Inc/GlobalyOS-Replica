import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { KudosCard } from "@/components/KudosCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Heart, MessageSquare, Plus, Megaphone, Calendar, Palmtree, Cake, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostUpdateDialog } from "@/components/dialogs/PostUpdateDialog";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";
import { AddLeaveRequestDialog } from "@/components/dialogs/AddLeaveRequestDialog";
import { AdminSetup } from "@/components/AdminSetup";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { Link } from "react-router-dom";
import { format, addDays, isSameDay, parseISO, differenceInYears } from "date-fns";

interface FeedItem {
  id: string;
  type: string;
  content: string;
  created_at: string;
  employee: {
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface KudosItem {
  id: string;
  comment: string;
  created_at: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  given_by: {
    profiles: {
      full_name: string;
    };
  };
}

interface LeaveBalance {
  vacation_days: number;
  sick_days: number;
  pto_days: number;
}

interface PersonOnLeave {
  id: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  leave_type: string;
}

interface UpcomingEvent {
  id: string;
  date: Date;
  daysUntil: number;
  yearsCount?: number;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

// Map database type to UI type (database uses "update", UI uses "announcement")
const mapDbTypeToUiType = (dbType: string): "win" | "announcement" | "achievement" => {
  if (dbType === "update") return "announcement";
  return dbType as "win" | "announcement" | "achievement";
};

const Home = () => {
  const [updates, setUpdates] = useState<FeedItem[]>([]);
  const [kudos, setKudos] = useState<KudosItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [peopleOnLeave, setPeopleOnLeave] = useState<PersonOnLeave[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingEvent[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<UpcomingEvent[]>([]);
  const { isHR, isAdmin } = useUserRole();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (currentOrg) {
      checkEmployeeProfile();
      loadFeed();
      loadLeaveData();
      loadUpcomingEvents();
    }
  }, [currentOrg?.id]);

  const checkEmployeeProfile = async () => {
    if (!currentOrg) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id)
      .maybeSingle();

    setHasEmployeeProfile(!!data);
    setCurrentEmployeeId(data?.id || null);
  };

  const loadUpcomingEvents = async () => {
    if (!currentOrg) return;
    
    const today = new Date();
    const nextDays = 30; // Look ahead 30 days
    
    // Load all employees with their dates
    const { data: employees } = await supabase
      .from("employees")
      .select(`
        id,
        date_of_birth,
        join_date,
        profiles!inner(
          full_name,
          avatar_url
        )
      `)
      .eq("organization_id", currentOrg.id)
      .eq("status", "active");

    if (!employees) return;

    const birthdays: UpcomingEvent[] = [];
    const anniversaries: UpcomingEvent[] = [];

    employees.forEach((emp: any) => {
      // Check birthday
      if (emp.date_of_birth) {
        const dob = parseISO(emp.date_of_birth);
        const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        
        // If birthday has passed this year, check next year
        if (thisYearBirthday < today && !isSameDay(thisYearBirthday, today)) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0 && daysUntil <= nextDays) {
          birthdays.push({
            id: emp.id,
            date: thisYearBirthday,
            daysUntil,
            profiles: emp.profiles,
          });
        }
      }

      // Check work anniversary
      if (emp.join_date) {
        const joinDate = parseISO(emp.join_date);
        const yearsWorked = differenceInYears(today, joinDate);
        
        // Only show if they've worked at least 1 year
        if (yearsWorked >= 1) {
          const thisYearAnniversary = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());
          
          // If anniversary has passed this year, check next year
          if (thisYearAnniversary < today && !isSameDay(thisYearAnniversary, today)) {
            thisYearAnniversary.setFullYear(today.getFullYear() + 1);
          }
          
          const daysUntil = Math.ceil((thisYearAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const upcomingYears = thisYearAnniversary.getFullYear() - joinDate.getFullYear();
          
          if (daysUntil >= 0 && daysUntil <= nextDays) {
            anniversaries.push({
              id: emp.id,
              date: thisYearAnniversary,
              daysUntil,
              yearsCount: upcomingYears,
              profiles: emp.profiles,
            });
          }
        }
      }
    });

    // Sort by days until event
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);

    setUpcomingBirthdays(birthdays.slice(0, 5));
    setUpcomingAnniversaries(anniversaries.slice(0, 5));
  };

  const loadLeaveData = async () => {
    if (!currentOrg) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const currentYear = new Date().getFullYear();

    // Load people on leave today
    const { data: leaveRequests } = await supabase
      .from("leave_requests")
      .select(`
        id,
        leave_type,
        employee:employees!leave_requests_employee_id_fkey(
          id,
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `)
      .eq("organization_id", currentOrg.id)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today);

    if (leaveRequests) {
      setPeopleOnLeave(leaveRequests as PersonOnLeave[]);
    }

    // Load current user's leave balance
    const { data: employeeData } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id)
      .maybeSingle();

    if (employeeData) {
      const { data: balanceData } = await supabase
        .from("leave_balances")
        .select("vacation_days, sick_days, pto_days")
        .eq("employee_id", employeeData.id)
        .eq("year", currentYear)
        .maybeSingle();

      if (balanceData) {
        setLeaveBalance(balanceData);
      }
    }
  };

  const loadFeed = async () => {
    if (!currentOrg) return;
    setLoading(true);
    
    // Load updates
    const { data: updatesData } = await supabase
      .from("updates")
      .select(`
        id,
        type,
        content,
        created_at,
        employee:employees!inner(
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `)
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false });

    // Load kudos
    const { data: kudosData } = await supabase
      .from("kudos")
      .select(`
        id,
        comment,
        created_at,
        employee:employees!kudos_employee_id_fkey(
          id,
          profiles!inner(
            full_name,
            avatar_url
          )
        ),
        given_by:employees!kudos_given_by_id_fkey(
          profiles!inner(
            full_name
          )
        )
      `)
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false });

    if (updatesData) setUpdates(updatesData as FeedItem[]);
    if (kudosData) setKudos(kudosData as KudosItem[]);
    setLoading(false);
  };

  const winsAndAchievements = updates.filter(u => 
    u.type === "win" || u.type === "achievement"
  );

  const regularUpdates = updates.filter(u => u.type === "update");

  const renderFeedContent = (items: (FeedItem | KudosItem)[]) => (
    <>
      {items
        .sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .map((item) => {
          if ("comment" in item) {
            const kudosItem = item as KudosItem;
            return (
              <KudosCard
                key={item.id}
                kudos={{
                  id: kudosItem.id,
                  employeeId: kudosItem.employee.id,
                  employeeName: kudosItem.employee.profiles.full_name,
                  givenBy: kudosItem.given_by.profiles.full_name,
                  comment: kudosItem.comment,
                  date: kudosItem.created_at,
                  avatar: kudosItem.employee.profiles.avatar_url || undefined,
                }}
              />
            );
          } else {
            const updateItem = item as FeedItem;
            return (
              <UpdateCard
                key={item.id}
                update={{
                  id: updateItem.id,
                  employeeId: "",
                  employeeName: updateItem.employee.profiles.full_name,
                  content: updateItem.content,
                  date: updateItem.created_at,
                  type: mapDbTypeToUiType(updateItem.type),
                  avatar: updateItem.employee.profiles.avatar_url || undefined,
                }}
              />
            );
          }
        })}
    </>
  );

  return (
    <Layout>
      <div className="space-y-8">
        <AdminSetup />
        

        {/* Action Buttons */}
        {!hasEmployeeProfile && isHR && (
          <Card className="p-6 border-accent/50 bg-accent-light/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Create Your Employee Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your profile to start posting updates and giving kudos
                </p>
              </div>
              <AddEmployeeDialog onSuccess={() => {
                checkEmployeeProfile();
                loadFeed();
              }} />
            </div>
          </Card>
        )}

        {!hasEmployeeProfile && !isHR && (
          <Card className="p-6 border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Employee Profile Not Found</h3>
                <p className="text-sm text-muted-foreground">
                  Contact your HR department to set up your employee profile so you can start posting updates and giving kudos
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Feed (2/3) */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="all" className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <TabsList className="h-auto p-1.5">
                  <TabsTrigger value="all" className="px-3 py-2">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span>All</span>
                  </TabsTrigger>
                  <TabsTrigger value="wins" className="px-3 py-2">
                    <Trophy className="h-4 w-4 shrink-0" />
                    <span>Wins</span>
                  </TabsTrigger>
                  <TabsTrigger value="kudos" className="px-3 py-2">
                    <Heart className="h-4 w-4 shrink-0" />
                    <span>Kudos</span>
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className="px-3 py-2">
                    <Megaphone className="h-4 w-4 shrink-0" />
                    <span>Announcements</span>
                  </TabsTrigger>
                </TabsList>
                {hasEmployeeProfile && (
                  <Button onClick={() => setPostDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Post Update
                  </Button>
                )}
              </div>

              <TabsContent value="all" className="space-y-4">
                {loading ? (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">Loading feed...</p>
                  </Card>
                ) : (
                  <>
                    {renderFeedContent([...updates, ...kudos])}
                    {updates.length === 0 && kudos.length === 0 && (
                      <Card className="p-12 text-center">
                        <p className="text-muted-foreground">No updates yet. Be the first to share!</p>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="wins" className="space-y-4">
                {winsAndAchievements.map((update) => (
                  <UpdateCard
                    key={update.id}
                    update={{
                      id: update.id,
                      employeeId: "",
                      employeeName: update.employee.profiles.full_name,
                      content: update.content,
                      date: update.created_at,
                      type: update.type as "win" | "achievement",
                      avatar: update.employee.profiles.avatar_url || undefined,
                    }}
                  />
                ))}
                {winsAndAchievements.length === 0 && (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No wins yet!</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="kudos" className="space-y-4">
                {kudos.map((kudosItem) => (
                  <KudosCard
                    key={kudosItem.id}
                    kudos={{
                      id: kudosItem.id,
                      employeeId: kudosItem.employee.id,
                      employeeName: kudosItem.employee.profiles.full_name,
                      givenBy: kudosItem.given_by.profiles.full_name,
                      comment: kudosItem.comment,
                      date: kudosItem.created_at,
                      avatar: kudosItem.employee.profiles.avatar_url || undefined,
                    }}
                  />
                ))}
                {kudos.length === 0 && (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No kudos yet!</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="announcements" className="space-y-4">
                {regularUpdates.map((update) => (
                  <UpdateCard
                    key={update.id}
                    update={{
                      id: update.id,
                      employeeId: "",
                      employeeName: update.employee.profiles.full_name,
                      content: update.content,
                      date: update.created_at,
                      type: "announcement",
                      avatar: update.employee.profiles.avatar_url || undefined,
                    }}
                  />
                ))}
                {regularUpdates.length === 0 && (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No announcements yet!</p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Leave Sidebar (1/3) */}
          <div className="space-y-6">
            {/* People on Leave Today */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Palmtree className="h-5 w-5 text-primary" />
                On Leave Today
              </h3>
              {peopleOnLeave.length > 0 ? (
                <div className="space-y-3">
                  {peopleOnLeave.map((leave) => (
                    <Link
                      key={leave.id}
                      to={`/team/${leave.employee.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {leave.employee.profiles.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {leave.leave_type.replace("_", " ")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No one is on leave today</p>
              )}
            </Card>

            {/* Current User Leave Balance */}
            {hasEmployeeProfile && (
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  Your Leave Balance
                </h3>
                {leaveBalance ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Vacation</span>
                      <span className="text-sm font-medium text-foreground">{leaveBalance.vacation_days} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sick Leave</span>
                      <span className="text-sm font-medium text-foreground">{leaveBalance.sick_days} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">PTO</span>
                      <span className="text-sm font-medium text-foreground">{leaveBalance.pto_days} days</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No leave balance set for this year</p>
                )}
                <Button 
                  className="mt-4 w-full" 
                  onClick={() => setLeaveDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Request Leave
                </Button>
              </Card>
            )}

            {/* Upcoming Birthdays */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Cake className="h-5 w-5 text-primary" />
                Upcoming Birthdays
              </h3>
              {upcomingBirthdays.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBirthdays.map((birthday) => (
                    <Link
                      key={birthday.id}
                      to={`/team/${birthday.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={birthday.profiles.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {birthday.profiles.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {birthday.profiles.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {birthday.daysUntil === 0 ? "Today! 🎉" : birthday.daysUntil === 1 ? "Tomorrow" : `In ${birthday.daysUntil} days`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming birthdays</p>
              )}
            </Card>

            {/* Work Anniversaries */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Award className="h-5 w-5 text-primary" />
                Work Anniversaries
              </h3>
              {upcomingAnniversaries.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAnniversaries.map((anniversary) => (
                    <Link
                      key={anniversary.id}
                      to={`/team/${anniversary.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={anniversary.profiles.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {anniversary.profiles.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {anniversary.profiles.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {anniversary.yearsCount} {anniversary.yearsCount === 1 ? "year" : "years"} · {anniversary.daysUntil === 0 ? "Today! 🎉" : anniversary.daysUntil === 1 ? "Tomorrow" : `In ${anniversary.daysUntil} days`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming anniversaries</p>
              )}
            </Card>
          </div>
        </div>
      </div>

      <PostUpdateDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        onSuccess={loadFeed}
        canPostAnnouncement={isAdmin || isHR}
      />

      {currentEmployeeId && (
        <AddLeaveRequestDialog
          employeeId={currentEmployeeId}
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          onSuccess={loadLeaveData}
          trigger={null}
        />
      )}
    </Layout>
  );
};

export default Home;
