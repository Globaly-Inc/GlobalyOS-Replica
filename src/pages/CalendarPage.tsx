import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isWithinInterval, 
  parseISO,
  addDays,
  startOfWeek,
  endOfWeek,
  getDay
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Plane, 
  PartyPopper, 
  Cake, 
  Briefcase,
  ClipboardList,
  CalendarDays
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import AddCalendarEventDialog from "@/components/dialogs/AddCalendarEventDialog";

type ViewMode = "month" | "week" | "day";

interface CalendarItem {
  id: string;
  title: string;
  subtitle?: string;
  date: Date;
  endDate?: Date;
  type: "leave" | "holiday" | "event" | "birthday" | "anniversary" | "review";
  employeeName?: string;
}

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const { currentOrg } = useOrganization();
  const { isAdmin, isHR } = useUserRole();
  const { user } = useAuth();
  const canManageEvents = isAdmin || isHR;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Fetch all employees for birthdays and anniversaries
  const { data: employees = [] } = useQuery({
    queryKey: ["calendar-employees", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      // Fetch from employees table to get date_of_birth
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, join_date, date_of_birth, user_id")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");
      if (empError) throw empError;
      
      // Fetch profiles for names
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name");
      if (profileError) throw profileError;
      
      // Combine data
      return empData.map(emp => ({
        ...emp,
        full_name: profileData?.find(p => p.id === emp.user_id)?.full_name || "Employee"
      }));
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch all approved leaves in the org
  const { data: leaves = [] } = useQuery({
    queryKey: ["calendar-all-leaves", currentOrg?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          id, 
          start_date, 
          end_date, 
          leave_type, 
          status, 
          half_day_type, 
          days_count,
          employee_id
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "approved")
        .or(`start_date.lte.${format(monthEnd, "yyyy-MM-dd")},end_date.gte.${format(monthStart, "yyyy-MM-dd")}`);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
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
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch performance reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["calendar-reviews", currentOrg?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("performance_reviews")
        .select("id, employee_id, review_period_start, review_period_end, status")
        .eq("organization_id", currentOrg.id)
        .or(`review_period_start.lte.${format(monthEnd, "yyyy-MM-dd")},review_period_end.gte.${format(monthStart, "yyyy-MM-dd")}`);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  // Build unified calendar items list
  const allItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Add leaves
    leaves.forEach((leave) => {
      const emp = employees.find(e => e.id === leave.employee_id);
      items.push({
        id: `leave-${leave.id}`,
        title: leave.leave_type,
        subtitle: leave.half_day_type !== "full" ? `Half day (${leave.half_day_type})` : undefined,
        date: parseISO(leave.start_date),
        endDate: parseISO(leave.end_date),
        type: "leave",
        employeeName: emp?.full_name || "Employee",
      });
    });

    // Add holidays and events
    calendarEvents.forEach((event) => {
      items.push({
        id: `event-${event.id}`,
        title: event.title,
        date: parseISO(event.start_date),
        endDate: parseISO(event.end_date),
        type: event.event_type === "holiday" ? "holiday" : "event",
      });
    });

    // Add birthdays (show for current month, adjust year)
    employees.forEach((emp) => {
      if (emp.date_of_birth) {
        const dob = parseISO(emp.date_of_birth);
        const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
        // Check if birthday is in current month view
        if (birthdayThisYear.getMonth() === currentMonth) {
          items.push({
            id: `birthday-${emp.id}`,
            title: `${emp.full_name}'s Birthday`,
            date: birthdayThisYear,
            type: "birthday",
            employeeName: emp.full_name,
          });
        }
      }
    });

    // Add work anniversaries
    employees.forEach((emp) => {
      if (emp.join_date) {
        const joinDate = parseISO(emp.join_date);
        const anniversaryThisYear = new Date(currentYear, joinDate.getMonth(), joinDate.getDate());
        // Only show if they've been here at least a year
        if (anniversaryThisYear.getMonth() === currentMonth && joinDate.getFullYear() < currentYear) {
          const years = currentYear - joinDate.getFullYear();
          items.push({
            id: `anniversary-${emp.id}`,
            title: `${emp.full_name}'s Work Anniversary`,
            subtitle: `${years} year${years > 1 ? 's' : ''} at company`,
            date: anniversaryThisYear,
            type: "anniversary",
            employeeName: emp.full_name,
          });
        }
      }
    });

    // Add reviews
    reviews.forEach((review) => {
      const emp = employees.find(e => e.id === review.employee_id);
      items.push({
        id: `review-${review.id}`,
        title: "Performance Review",
        subtitle: review.status,
        date: parseISO(review.review_period_end),
        type: "review",
        employeeName: emp?.full_name || "Employee",
      });
    });

    // Sort by date
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [leaves, calendarEvents, employees, reviews, currentDate]);

  // Filter items for selected date or upcoming
  const filteredItems = useMemo(() => {
    if (selectedDate) {
      return allItems.filter((item) => {
        if (item.endDate) {
          return isWithinInterval(selectedDate, { start: item.date, end: item.endDate }) ||
                 isSameDay(selectedDate, item.date) ||
                 isSameDay(selectedDate, item.endDate);
        }
        return isSameDay(item.date, selectedDate);
      });
    }
    // Show upcoming items (from today onwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allItems.filter((item) => {
      const itemEnd = item.endDate || item.date;
      return itemEnd >= today;
    }).slice(0, 20);
  }, [allItems, selectedDate]);

  // Get calendar days based on view mode
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(monthStart, { weekStartsOn: 1 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode, monthStart, monthEnd]);

  // Get events for a specific day
  const getDayItems = (date: Date): CalendarItem[] => {
    return allItems.filter((item) => {
      if (item.endDate) {
        return isWithinInterval(date, { start: item.date, end: item.endDate }) ||
               isSameDay(date, item.date) ||
               isSameDay(date, item.endDate);
      }
      return isSameDay(item.date, date);
    });
  };

  const handlePrevMonth = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const handleNextMonth = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(isSameDay(date, selectedDate || new Date(0)) ? null : date);
  };

  const getTypeColor = (type: CalendarItem["type"]) => {
    switch (type) {
      case "leave": return "bg-blue-500";
      case "holiday": return "bg-red-500";
      case "event": return "bg-amber-500";
      case "birthday": return "bg-pink-500";
      case "anniversary": return "bg-purple-500";
      case "review": return "bg-emerald-500";
      default: return "bg-muted";
    }
  };

  const getTypeBadgeVariant = (type: CalendarItem["type"]) => {
    switch (type) {
      case "leave": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "holiday": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "event": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      case "birthday": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
      case "anniversary": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "review": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: CalendarItem["type"]) => {
    switch (type) {
      case "leave": return <Plane className="h-4 w-4" />;
      case "holiday": return <PartyPopper className="h-4 w-4" />;
      case "event": return <CalendarDays className="h-4 w-4" />;
      case "birthday": return <Cake className="h-4 w-4" />;
      case "anniversary": return <Briefcase className="h-4 w-4" />;
      case "review": return <ClipboardList className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: CalendarItem["type"]) => {
    switch (type) {
      case "leave": return "Leave";
      case "holiday": return "Holiday";
      case "event": return "Event";
      case "birthday": return "Birthday";
      case "anniversary": return "Anniversary";
      case "review": return "Review";
      default: return type;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] overflow-hidden">
        {/* Left Sidebar - Upcoming Events */}
        <div className="w-full lg:w-[320px] xl:w-[360px] border-b lg:border-b-0 lg:border-r border-border bg-card/50 flex flex-col shrink-0">
          <div className="p-4 lg:p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedDate ? format(selectedDate, "d MMMM yyyy") : "Upcoming"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedDate 
                ? `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''} on this day`
                : "Don't miss scheduled events"
              }
            </p>
            {selectedDate && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 -ml-2 text-primary"
                onClick={() => setSelectedDate(null)}
              >
                ← Show all upcoming
              </Button>
            )}
          </div>
          
          <ScrollArea className="flex-1 h-[200px] lg:h-auto">
            <div className="p-4 lg:p-6 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No events {selectedDate ? "on this day" : "upcoming"}</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleDayClick(item.date)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200 shadow-sm hover:shadow-md",
                      selectedDate && isSameDay(item.date, selectedDate) && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", getTypeBadgeVariant(item.type))}>
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            getTypeBadgeVariant(item.type)
                          )}>
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                        <p className="font-medium text-sm text-foreground truncate">
                          {item.employeeName ? `${item.title} – ${item.employeeName}` : item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(item.date, "d MMM")}
                          {item.endDate && !isSameDay(item.date, item.endDate) && (
                            <> – {format(item.endDate, "d MMM")}</>
                          )}
                          {item.subtitle && <> · {item.subtitle}</>}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Calendar */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Calendar Header */}
          <div className="p-4 lg:p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* View Mode Tabs */}
                <div className="flex bg-muted rounded-lg p-1">
                  {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                        viewMode === mode
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Month Navigation */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[140px] text-center">
                    {viewMode === "day" 
                      ? format(currentDate, "d MMMM yyyy")
                      : format(currentDate, "MMMM yyyy")
                    }
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>

                {canManageEvents && (
                  <Button size="sm" onClick={() => setIsAddEventOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              {[
                { type: "leave" as const, label: "Leave" },
                { type: "holiday" as const, label: "Holiday" },
                { type: "event" as const, label: "Event" },
                { type: "birthday" as const, label: "Birthday" },
                { type: "anniversary" as const, label: "Anniversary" },
                { type: "review" as const, label: "Review" },
              ].map((item) => (
                <div key={item.type} className="flex items-center gap-1.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full", getTypeColor(item.type))} />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className={cn(
              "grid gap-px bg-border rounded-xl overflow-hidden",
              viewMode === "day" ? "grid-cols-1" : "grid-cols-7"
            )}>
              {/* Day headers */}
              {viewMode !== "day" && ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="bg-muted/50 p-3 text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day) => {
                const dayItems = getDayItems(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "bg-card p-2 text-left transition-all duration-200 cursor-pointer group",
                      viewMode === "month" ? "min-h-[100px]" : "min-h-[200px]",
                      !isCurrentMonth && viewMode === "month" && "opacity-40",
                      isSelected && "ring-2 ring-primary ring-inset bg-primary/5",
                      "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                            isToday && "bg-primary text-primary-foreground",
                            isSelected && !isToday && "bg-primary/20 text-primary"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {dayItems.length > 3 && viewMode === "month" && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayItems.length - 3} more
                          </span>
                        )}
                      </div>

                      {/* Events in cell */}
                      <div className="flex flex-col gap-1 overflow-hidden">
                        {dayItems.slice(0, viewMode === "month" ? 3 : 10).map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "text-[11px] px-2 py-1 rounded-md truncate font-medium",
                              getTypeBadgeVariant(item.type)
                            )}
                            title={item.employeeName ? `${item.title} – ${item.employeeName}` : item.title}
                          >
                            {item.employeeName 
                              ? `${item.title.split(' ')[0]} – ${item.employeeName.split(' ')[0]}`
                              : item.title
                            }
                          </div>
                        ))}
                      </div>

                      {/* Dots for mobile/overflow */}
                      {viewMode === "month" && dayItems.length > 0 && dayItems.length <= 3 && (
                        <div className="flex gap-0.5 mt-auto pt-1 sm:hidden">
                          {dayItems.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              className={cn("h-1.5 w-1.5 rounded-full", getTypeColor(item.type))}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
