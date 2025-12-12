import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Plane, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import AddCalendarEventDialog from "@/components/dialogs/AddCalendarEventDialog";

interface LeaveEvent {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  half_day_type: string;
  days_count: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_type: "holiday" | "event";
}

interface DayEvents {
  leaves: LeaveEvent[];
  events: CalendarEvent[];
}

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const { currentOrg } = useOrganization();
  const { isAdmin, isHR } = useUserRole();
  const { user } = useAuth();
  const canManageEvents = isAdmin || isHR;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Fetch current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's approved leaves
  const { data: leaves = [] } = useQuery({
    queryKey: ["calendar-leaves", currentEmployee?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date, leave_type, status, half_day_type, days_count")
        .eq("employee_id", currentEmployee.id)
        .eq("status", "approved")
        .or(`start_date.lte.${format(monthEnd, "yyyy-MM-dd")},end_date.gte.${format(monthStart, "yyyy-MM-dd")}`);
      if (error) throw error;
      return data as LeaveEvent[];
    },
    enabled: !!currentEmployee?.id,
  });

  // Fetch calendar events (holidays/events)
  const { data: calendarEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ["calendar-events", currentOrg?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, start_date, end_date, event_type")
        .eq("organization_id", currentOrg.id)
        .or(`start_date.lte.${format(monthEnd, "yyyy-MM-dd")},end_date.gte.${format(monthStart, "yyyy-MM-dd")}`);
      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: !!currentOrg?.id,
  });

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getDayEvents = (date: Date): DayEvents => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    const dayLeaves = leaves.filter((leave) => {
      const start = parseISO(leave.start_date);
      const end = parseISO(leave.end_date);
      return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end);
    });

    const dayEvents = calendarEvents.filter((event) => {
      const start = parseISO(event.start_date);
      const end = parseISO(event.end_date);
      return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end);
    });

    return { leaves: dayLeaves, events: dayEvents };
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <Layout>
      <div className="container mx-auto py-4 md:py-6 px-4 max-w-6xl">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarIcon className="h-5 w-5" />
                Calendar
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[140px] text-center">
                    {format(currentDate, "MMMM yyyy")}
                  </span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {canManageEvents && (
                  <Button size="sm" onClick={() => setIsAddEventOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-primary/80" />
                <span className="text-muted-foreground">Your Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-destructive/80" />
                <span className="text-muted-foreground">Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-amber-500/80" />
                <span className="text-muted-foreground">Event</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}

              {/* Padding days */}
              {paddingDays.map((_, index) => (
                <div key={`pad-${index}`} className="bg-card p-1 min-h-[60px] sm:min-h-[80px]" />
              ))}

              {/* Calendar days */}
              {days.map((day) => {
                const dayEvents = getDayEvents(day);
                const hasEvents = dayEvents.leaves.length > 0 || dayEvents.events.length > 0;
                const isToday = isSameDay(day, new Date());

                return (
                  <Popover key={day.toISOString()}>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "bg-card p-1 min-h-[60px] sm:min-h-[80px] text-left hover:bg-accent/50 transition-colors cursor-pointer w-full",
                          !isSameMonth(day, currentDate) && "opacity-50"
                        )}
                      >
                        <div className="flex flex-col h-full">
                          <span
                            className={cn(
                              "text-xs sm:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                              isToday && "bg-primary text-primary-foreground"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {hasEvents && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {dayEvents.leaves.length > 0 && (
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary/80" title="Leave" />
                              )}
                              {dayEvents.events.filter(e => e.event_type === "holiday").length > 0 && (
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-destructive/80" title="Holiday" />
                              )}
                              {dayEvents.events.filter(e => e.event_type === "event").length > 0 && (
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500/80" title="Event" />
                              )}
                            </div>
                          )}
                          {/* Show event titles on larger screens */}
                          <div className="hidden sm:flex flex-col gap-0.5 mt-1 overflow-hidden">
                            {dayEvents.leaves.slice(0, 2).map((leave) => (
                              <div
                                key={leave.id}
                                className="text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary truncate"
                              >
                                {leave.leave_type}
                              </div>
                            ))}
                            {dayEvents.events.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={cn(
                                  "text-[10px] px-1 py-0.5 rounded truncate",
                                  event.event_type === "holiday"
                                    ? "bg-destructive/20 text-destructive"
                                    : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                )}
                              >
                                {event.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      </button>
                    </PopoverTrigger>
                    {hasEvents && (
                      <PopoverContent className="w-72 p-3" align="start">
                        <div className="space-y-3">
                          <div className="font-medium text-sm">
                            {format(day, "EEEE, d MMMM yyyy")}
                          </div>
                          
                          {dayEvents.leaves.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <Plane className="h-3 w-3" />
                                Your Leave
                              </div>
                              {dayEvents.leaves.map((leave) => (
                                <div
                                  key={leave.id}
                                  className="bg-primary/10 rounded-md p-2 text-sm"
                                >
                                  <div className="font-medium">{leave.leave_type}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {leave.half_day_type !== "full" ? `Half day (${leave.half_day_type})` : "Full day"}
                                    {" · "}
                                    {format(parseISO(leave.start_date), "d MMM")} - {format(parseISO(leave.end_date), "d MMM")}
                                  </div>
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    {leave.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {dayEvents.events.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <PartyPopper className="h-3 w-3" />
                                Holidays & Events
                              </div>
                              {dayEvents.events.map((event) => (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "rounded-md p-2 text-sm",
                                    event.event_type === "holiday"
                                      ? "bg-destructive/10"
                                      : "bg-amber-500/10"
                                  )}
                                >
                                  <div className="font-medium">{event.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(parseISO(event.start_date), "d MMM")}
                                    {event.start_date !== event.end_date && (
                                      <> - {format(parseISO(event.end_date), "d MMM")}</>
                                    )}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "mt-1 text-xs",
                                      event.event_type === "holiday"
                                        ? "border-destructive/50 text-destructive"
                                        : "border-amber-500/50 text-amber-600"
                                    )}
                                  >
                                    {event.event_type}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <AddCalendarEventDialog
        open={isAddEventOpen}
        onOpenChange={setIsAddEventOpen}
        onSuccess={() => {
          refetchEvents();
          setIsAddEventOpen(false);
        }}
      />
    </Layout>
  );
};

export default CalendarPage;
