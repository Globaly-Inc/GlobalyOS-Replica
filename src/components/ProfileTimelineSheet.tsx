import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Award, TrendingUp, Calendar, Heart, Megaphone, Trophy, GraduationCap, UserCheck, UserPlus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  type: 'kudos' | 'position' | 'leave' | 'update' | 'learning' | 'achievement' | 'profile';
  title: string;
  description: string;
  date: string;
  icon: React.ReactNode;
  color: string;
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

  const loadTimeline = async () => {
    setLoading(true);
    const allEvents: TimelineEvent[] = [];

    try {
      // Fetch employee profile data for join date and activation
      const { data: employee } = await supabase
        .from("employees")
        .select("join_date, status, created_at, updated_at")
        .eq("id", employeeId)
        .single();

      if (employee) {
        // Add profile activation event (when status is active, use updated_at as activation time)
        if (employee.status === 'active') {
          allEvents.push({
            id: `profile-activated`,
            type: 'profile',
            title: 'Profile Activated',
            description: `${employeeName} activated their account and joined the team`,
            date: employee.updated_at,
            icon: <UserCheck className="h-4 w-4" />,
            color: 'bg-emerald-500',
          });
        }

        // Add join date as the first event
        allEvents.push({
          id: `profile-joined`,
          type: 'profile',
          title: 'Joined Organization',
          description: `${employeeName} joined as a team member`,
          date: employee.join_date,
          icon: <UserPlus className="h-4 w-4" />,
          color: 'bg-cyan-500',
        });
      }

      // Fetch kudos received
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
          });
        });
      }

      // Fetch position history
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
          });
        });
      }

      // Fetch approved leave requests
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
          });
        });
      }

      // Fetch learning & development
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
          });
        });
      }

      // Fetch achievements
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
    if (open) {
      loadTimeline();
    }
  }, [open, employeeId]);

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
        
        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No timeline events yet
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-6">
                {events.map((event, index) => (
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
                        <Badge variant="outline" className="text-xs shrink-0">
                          {event.type}
                        </Badge>
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
