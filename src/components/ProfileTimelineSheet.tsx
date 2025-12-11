import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, Calendar, Heart, Trophy, GraduationCap, UserCheck, UserPlus, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

interface TimelineEvent {
  id: string;
  type: 'kudos' | 'position' | 'leave' | 'update' | 'learning' | 'achievement' | 'profile';
  title: string;
  description: string;
  date: string;
  icon: React.ReactNode;
  color: string;
  accessLevel: 'public' | 'manager' | 'hr_admin' | 'self';
  metadata?: Record<string, any>;
}

interface ProfileTimelineSheetProps {
  employeeId: string;
  employeeName: string;
}

export const ProfileTimelineSheet = ({ employeeId, employeeName }: ProfileTimelineSheetProps) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const { isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { user } = useAuth();

  // Check if current user is viewing their own profile or is the manager
  const checkAccessLevel = async () => {
    if (!user) return;

    // Check if viewing own profile
    const { data: ownEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (ownEmployee?.id === employeeId) {
      setIsOwnProfile(true);
      return;
    }

    // Check if current user is the manager of this employee
    const { data: employee } = await supabase
      .from("employees")
      .select("manager_id")
      .eq("id", employeeId)
      .single();

    if (employee?.manager_id && ownEmployee?.id === employee.manager_id) {
      setIsManager(true);
    }
  };

  // Determine what access level the current user has
  const getViewerAccessLevel = (): 'hr_admin' | 'manager' | 'self' | 'public' => {
    if (isAdmin || isHR) return 'hr_admin';
    if (isOwnProfile) return 'self';
    if (isManager) return 'manager';
    return 'public';
  };

  // Filter events based on viewer's access level
  const canViewEvent = (event: TimelineEvent): boolean => {
    const viewerLevel = getViewerAccessLevel();
    
    // HR/Admin can see everything
    if (viewerLevel === 'hr_admin') return true;
    
    // Self can see everything about themselves
    if (viewerLevel === 'self') return true;
    
    // Manager can see manager-level and public events
    if (viewerLevel === 'manager') {
      return event.accessLevel === 'public' || event.accessLevel === 'manager';
    }
    
    // Public can only see public events
    return event.accessLevel === 'public';
  };

  const loadTimeline = async () => {
    setLoading(true);
    const allEvents: TimelineEvent[] = [];

    try {
      await checkAccessLevel();

      // Fetch employee profile data for join date and activation
      const { data: employee } = await supabase
        .from("employees")
        .select("join_date, status, created_at, updated_at")
        .eq("id", employeeId)
        .single();

      if (employee) {
        // Add profile activation event - PUBLIC
        if (employee.status === 'active') {
          allEvents.push({
            id: `profile-activated`,
            type: 'profile',
            title: 'Profile Activated',
            description: `${employeeName} activated their account and joined the team`,
            date: employee.updated_at,
            icon: <UserCheck className="h-4 w-4" />,
            color: 'bg-emerald-500',
            accessLevel: 'public',
          });
        }

        // Add join date - PUBLIC
        allEvents.push({
          id: `profile-joined`,
          type: 'profile',
          title: 'Joined Organization',
          description: `${employeeName} joined as a team member`,
          date: employee.join_date,
          icon: <UserPlus className="h-4 w-4" />,
          color: 'bg-cyan-500',
          accessLevel: 'public',
        });
      }

      // Fetch kudos received - PUBLIC (kudos are visible to everyone)
      const { data: kudos } = await supabase
        .from("kudos")
        .select(`
          id, comment, created_at,
          given_by:employees!kudos_given_by_id_fkey(profiles!inner(full_name))
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (kudos) {
        kudos.forEach((k: any) => {
          allEvents.push({
            id: `kudos-${k.id}`,
            type: 'kudos',
            title: 'Received Kudos',
            description: `${k.given_by?.profiles?.full_name || 'Someone'} gave kudos: "${k.comment}"`,
            date: k.created_at,
            icon: <Heart className="h-4 w-4" />,
            color: 'bg-pink-500',
            accessLevel: 'public',
          });
        });
      }

      // Fetch position history - MANAGER level (contains sensitive career info)
      const { data: positions } = await supabase
        .from("position_history")
        .select("id, position, department, change_type, effective_date, notes")
        .eq("employee_id", employeeId)
        .order("effective_date", { ascending: false });

      if (positions) {
        positions.forEach((p: any) => {
          allEvents.push({
            id: `position-${p.id}`,
            type: 'position',
            title: p.change_type === 'promotion' ? 'Promotion' : p.change_type === 'hire' ? 'Joined Company' : 'Position Change',
            description: `${p.position} in ${p.department}${p.notes ? ` - ${p.notes}` : ''}`,
            date: p.effective_date,
            icon: <TrendingUp className="h-4 w-4" />,
            color: p.change_type === 'promotion' ? 'bg-green-500' : 'bg-blue-500',
            accessLevel: 'manager',
          });
        });
      }

      // Fetch approved leave requests - MANAGER level (sensitive HR data)
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("id, leave_type, start_date, end_date, days_count, status, created_at")
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (leaves) {
        leaves.forEach((l: any) => {
          allEvents.push({
            id: `leave-${l.id}`,
            type: 'leave',
            title: `${l.leave_type} Approved`,
            description: `${l.days_count} day(s) leave from ${new Date(l.start_date).toLocaleDateString()} to ${new Date(l.end_date).toLocaleDateString()}`,
            date: l.created_at,
            icon: <Calendar className="h-4 w-4" />,
            color: 'bg-amber-500',
            accessLevel: 'manager',
          });
        });
      }

      // Fetch learning & development - MANAGER level
      const { data: learning } = await supabase
        .from("learning_development")
        .select("id, title, type, status, completion_date, created_at")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (learning) {
        learning.forEach((l: any) => {
          allEvents.push({
            id: `learning-${l.id}`,
            type: 'learning',
            title: l.status === 'completed' ? 'Completed Training' : 'Started Training',
            description: `${l.title} (${l.type})`,
            date: l.completion_date || l.created_at,
            icon: <GraduationCap className="h-4 w-4" />,
            color: l.status === 'completed' ? 'bg-purple-500' : 'bg-indigo-500',
            accessLevel: 'manager',
          });
        });
      }

      // Fetch achievements - PUBLIC (achievements are visible to everyone)
      const { data: achievements } = await supabase
        .from("achievements")
        .select("id, title, description, achieved_at")
        .eq("employee_id", employeeId)
        .order("achieved_at", { ascending: false });

      if (achievements) {
        achievements.forEach((a: any) => {
          allEvents.push({
            id: `achievement-${a.id}`,
            type: 'achievement',
            title: 'Achievement Unlocked',
            description: `${a.title}: ${a.description}`,
            date: a.achieved_at,
            icon: <Trophy className="h-4 w-4" />,
            color: 'bg-yellow-500',
            accessLevel: 'public',
          });
        });
      }

      // Sort all events by date (most recent first)
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !roleLoading) {
      loadTimeline();
    }
  }, [open, employeeId, roleLoading]);

  const filteredEvents = events.filter(canViewEvent);
  const hiddenCount = events.length - filteredEvents.length;
  const viewerLevel = getViewerAccessLevel();

  const getAccessBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'hr_admin':
        return <Badge variant="destructive" className="text-[10px] px-1">HR/Admin</Badge>;
      case 'manager':
        return <Badge variant="secondary" className="text-[10px] px-1">Manager+</Badge>;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          Timeline
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {employeeName}'s Timeline
          </SheetTitle>
        </SheetHeader>
        
        {/* Access level indicator */}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>
            Viewing as: {viewerLevel === 'hr_admin' ? 'HR/Admin' : viewerLevel === 'self' ? 'Self' : viewerLevel === 'manager' ? 'Manager' : 'Team Member'}
          </span>
          {hiddenCount > 0 && (
            <span className="text-muted-foreground/60">
              ({hiddenCount} restricted)
            </span>
          )}
        </div>
        
        <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
          {loading || roleLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No timeline events available
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-6">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full ${event.color} flex items-center justify-center text-white`}>
                      {event.icon}
                    </div>
                    
                    <div className="bg-card border rounded-lg p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-foreground">{event.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {event.type}
                          </Badge>
                          {(isAdmin || isHR) && getAccessBadge(event.accessLevel)}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDateTime(event.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};