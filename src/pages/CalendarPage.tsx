import { useState, useMemo, useEffect } from "react";
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
  CalendarDays,
  Pencil,
  Trash2,
  Repeat,
  Globe,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useTimezone, getTimezones, formatTimezoneLabel } from "@/hooks/useTimezone";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import AddCalendarEventDialog from "@/components/dialogs/AddCalendarEventDialog";
import { WorldClockCards } from "@/components/WorldClockCards";
import EditCalendarEventDialog from "@/components/dialogs/EditCalendarEventDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ViewMode = "month" | "week" | "day";

interface CalendarItem {
  id: string;
  title: string;
  subtitle?: string;
  date: Date;
  endDate?: Date;
  startTime?: string | null;
  endTime?: string | null;
  type: "leave" | "holiday" | "event" | "birthday" | "anniversary" | "review";
  employeeName?: string;
  appliesToAllOffices?: boolean;
  officeNames?: string[];
  rawEventId?: string; // Original event ID for edit/delete
  officeIds?: string[];
  isRecurring?: boolean;
}

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [activeFilters, setActiveFilters] = useState<Set<CalendarItem["type"]>>(new Set());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    start_time?: string | null;
    end_time?: string | null;
    event_type: string;
    applies_to_all_offices: boolean;
    officeIds?: string[];
    is_recurring?: boolean;
  } | null>(null);
  const { currentOrg } = useOrganization();
  const { isAdmin, isHR } = useUserRole();
  const { user } = useAuth();
  const { timezone, setTimezone } = useTimezone();
  const canManageEvents = isAdmin || isHR;

  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format time in selected timezone
  const formattedTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(currentTime);
    } catch {
      return format(currentTime, 'hh:mm:ss a');
    }
  }, [currentTime, timezone]);

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(currentTime);
    } catch {
      return format(currentTime, 'EEE, d MMM yyyy');
    }
  }, [currentTime, timezone]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Fetch current user's employee with office
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee-office", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id, office_id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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

  // Fetch offices for the org
  const { data: offices = [] } = useQuery({
    queryKey: ["offices", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("offices")
        .select("id, name, country")
        .eq("organization_id", currentOrg.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch calendar events (holidays/events) with office filtering
  // For recurring events, we need to fetch ALL recurring events regardless of date filter
  const { data: calendarEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ["calendar-events", currentOrg?.id, currentEmployee?.office_id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      // Fetch non-recurring events within date range
      const { data: nonRecurringEvents, error: nonRecurringError } = await supabase
        .from("calendar_events")
        .select("id, title, start_date, end_date, start_time, end_time, event_type, applies_to_all_offices, is_recurring")
        .eq("organization_id", currentOrg.id)
        .eq("is_recurring", false)
        .or(`start_date.lte.${format(monthEnd, "yyyy-MM-dd")},end_date.gte.${format(monthStart, "yyyy-MM-dd")}`);
      if (nonRecurringError) throw nonRecurringError;

      // Fetch ALL recurring events (they repeat every year so we need all of them)
      const { data: recurringEvents, error: recurringError } = await supabase
        .from("calendar_events")
        .select("id, title, start_date, end_date, start_time, end_time, event_type, applies_to_all_offices, is_recurring")
        .eq("organization_id", currentOrg.id)
        .eq("is_recurring", true);
      if (recurringError) throw recurringError;

      const allEvents = [...(nonRecurringEvents || []), ...(recurringEvents || [])];

      // Fetch all office associations
      const eventIds = allEvents.map(e => e.id) || [];
      let eventOffices: { calendar_event_id: string; office_id: string }[] = [];
      
      if (eventIds.length > 0) {
        const { data: officeData, error: officeError } = await supabase
          .from("calendar_event_offices")
          .select("calendar_event_id, office_id")
          .in("calendar_event_id", eventIds);
        
        if (officeError) throw officeError;
        eventOffices = officeData || [];
      }

      // Attach office info to events
      const eventsWithOffices = allEvents.map(event => ({
        ...event,
        officeIds: eventOffices.filter(eo => eo.calendar_event_id === event.id).map(eo => eo.office_id),
      }));

      // If user has no office or is admin/HR, show all events
      if (!currentEmployee?.office_id || isAdmin || isHR) {
        return eventsWithOffices;
      }

      // Filter events: show if applies_to_all_offices OR user's office is in the list
      return eventsWithOffices.filter(event => {
        if (event.applies_to_all_offices) return true;
        return event.officeIds.includes(currentEmployee.office_id);
      });
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

    // Add holidays and events (handling recurring events)
    calendarEvents.forEach((event) => {
      const eventOfficeNames = event.officeIds
        ?.map(officeId => offices.find(o => o.id === officeId)?.name)
        .filter(Boolean) as string[] || [];
      
      const originalStartDate = parseISO(event.start_date);
      const originalEndDate = parseISO(event.end_date);
      const eventDuration = originalEndDate.getTime() - originalStartDate.getTime();
      
      if (event.is_recurring) {
        // For recurring events, generate instances for the current view year
        const adjustedStartDate = new Date(currentYear, originalStartDate.getMonth(), originalStartDate.getDate());
        const adjustedEndDate = new Date(adjustedStartDate.getTime() + eventDuration);
        
        // Check if this recurring instance falls in the current month view
        if (adjustedStartDate.getMonth() === currentMonth || adjustedEndDate.getMonth() === currentMonth) {
          items.push({
            id: `event-${event.id}-${currentYear}`,
            title: event.title,
            date: adjustedStartDate,
            endDate: adjustedEndDate,
            startTime: event.start_time,
            endTime: event.end_time,
            type: event.event_type === "holiday" ? "holiday" : "event",
            appliesToAllOffices: event.applies_to_all_offices,
            officeNames: eventOfficeNames,
            rawEventId: event.id,
            officeIds: event.officeIds,
            isRecurring: true,
          });
        }
      } else {
        // Non-recurring event - show as-is
        items.push({
          id: `event-${event.id}`,
          title: event.title,
          date: originalStartDate,
          endDate: originalEndDate,
          startTime: event.start_time,
          endTime: event.end_time,
          type: event.event_type === "holiday" ? "holiday" : "event",
          appliesToAllOffices: event.applies_to_all_offices,
          officeNames: eventOfficeNames,
          rawEventId: event.id,
          officeIds: event.officeIds,
          isRecurring: false,
        });
      }
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
            title: emp.full_name,
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
  }, [leaves, calendarEvents, employees, reviews, currentDate, offices]);

  // Filter items for selected date or upcoming (respecting type filters)
  const filteredItems = useMemo(() => {
    const baseItems = activeFilters.size === 0 ? allItems : allItems.filter((item) => activeFilters.has(item.type));
    
    if (selectedDate) {
      return baseItems.filter((item) => {
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
    return baseItems.filter((item) => {
      const itemEnd = item.endDate || item.date;
      return itemEnd >= today;
    }).slice(0, 20);
  }, [allItems, selectedDate, activeFilters]);

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

  // Filter items by active type filters
  const typeFilteredItems = useMemo(() => {
    if (activeFilters.size === 0) return allItems;
    return allItems.filter((item) => activeFilters.has(item.type));
  }, [allItems, activeFilters]);

  // Get counts by type for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<CalendarItem["type"], number> = {
      leave: 0,
      holiday: 0,
      event: 0,
      birthday: 0,
      anniversary: 0,
      review: 0,
    };
    allItems.forEach((item) => {
      counts[item.type]++;
    });
    return counts;
  }, [allItems]);

  // Get events for a specific day (respecting filters)
  const getDayItems = (date: Date): CalendarItem[] => {
    return typeFilteredItems.filter((item) => {
      if (item.endDate) {
        return isWithinInterval(date, { start: item.date, end: item.endDate }) ||
               isSameDay(date, item.date) ||
               isSameDay(date, item.endDate);
      }
      return isSameDay(item.date, date);
    });
  };

  // Toggle filter
  const toggleFilter = (type: CalendarItem["type"]) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
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

  // Render events list content (reusable for desktop sidebar and mobile bottom)
  const renderEventsList = (isMobile: boolean = false) => (
    <div className={cn(
      "flex flex-col",
      isMobile ? "bg-card border-t border-border" : "flex-1"
    )}>
      <div className={cn("border-b border-border", isMobile ? "p-3" : "p-6")}>
        <h2 className={cn("font-semibold text-foreground", isMobile ? "text-base" : "text-lg")}>
          {selectedDate ? format(selectedDate, "d MMMM yyyy") : "Upcoming"}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {selectedDate 
            ? `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`
            : "Don't miss scheduled events"
          }
        </p>
        {selectedDate && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-1 -ml-2 text-primary text-xs"
            onClick={() => setSelectedDate(null)}
          >
            ← Show all upcoming
          </Button>
        )}
      </div>
      
      <ScrollArea className={isMobile ? "max-h-[250px]" : "flex-1"}>
        <div className={cn("space-y-2", isMobile ? "p-2" : "p-3")}>
          {filteredItems.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No events {selectedDate ? "on this day" : "upcoming"}</p>
            </div>
          ) : (
            filteredItems.slice(0, isMobile ? 5 : undefined).map((item) => {
              const isManageableEvent = canManageEvents && (item.type === "holiday" || item.type === "event");
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "w-full text-left rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200 shadow-sm group relative",
                    isMobile ? "p-3" : "p-4 hover:shadow-md",
                    selectedDate && isSameDay(item.date, selectedDate) && "ring-2 ring-primary"
                  )}
                >
                  {/* Edit/Delete buttons for HR/Admin on events/holidays */}
                  {isManageableEvent && !isMobile && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          const eventData = calendarEvents.find(ce => ce.id === item.rawEventId);
                          if (eventData) {
                            setSelectedEvent({
                              id: eventData.id,
                              title: eventData.title,
                              start_date: eventData.start_date,
                              end_date: eventData.end_date,
                              start_time: eventData.start_time,
                              end_time: eventData.end_time,
                              event_type: eventData.event_type,
                              applies_to_all_offices: eventData.applies_to_all_offices,
                              officeIds: eventData.officeIds,
                              is_recurring: eventData.is_recurring,
                            });
                            setIsEditEventOpen(true);
                          }
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          const eventData = calendarEvents.find(ce => ce.id === item.rawEventId);
                          if (eventData) {
                            setSelectedEvent({
                              id: eventData.id,
                              title: eventData.title,
                              start_date: eventData.start_date,
                              end_date: eventData.end_date,
                              start_time: eventData.start_time,
                              end_time: eventData.end_time,
                              event_type: eventData.event_type,
                              applies_to_all_offices: eventData.applies_to_all_offices,
                              officeIds: eventData.officeIds,
                              is_recurring: eventData.is_recurring,
                            });
                            setIsDeleteDialogOpen(true);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  
                  <button
                    className="w-full text-left"
                    onClick={() => handleDayClick(item.date)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn("p-1.5 rounded-lg shrink-0", getTypeBadgeVariant(item.type))}>
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-foreground truncate", isMobile ? "text-xs" : "text-sm")}>
                          {item.type === "anniversary" || item.type === "birthday" 
                            ? item.title 
                            : item.employeeName 
                              ? `${item.title} – ${item.employeeName}` 
                              : item.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(item.date, "d MMM")}
                          {item.startTime && (
                            <> · {format(new Date(`2000-01-01T${item.startTime}`), "h:mm a")}</>
                          )}
                          {item.endDate && !isSameDay(item.date, item.endDate) && (
                            <> - {format(item.endDate, "d MMM")}</>
                          )}
                          {item.subtitle && <> · {item.subtitle}</>}
                        </p>
                        {/* Office badges - only on desktop */}
                        {!isMobile && (item.type === "holiday" || item.type === "event") && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.isRecurring && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                <Repeat className="h-2.5 w-2.5" />
                                Annual
                              </Badge>
                            )}
                            {item.appliesToAllOffices ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                All offices
                              </Badge>
                            ) : item.officeNames && item.officeNames.length > 0 ? (
                              item.officeNames.map((name, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {name}
                                </Badge>
                              ))
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          )}
          {isMobile && filteredItems.length > 5 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              +{filteredItems.length - 5} more events
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] overflow-hidden">
        {/* Left Sidebar - Upcoming Events (desktop only) */}
        <div className="hidden lg:flex w-[320px] xl:w-[360px] border-r border-border bg-card/50 flex-col shrink-0">
          {renderEventsList(false)}
        </div>

        {/* Right Side - Calendar */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Calendar Header */}
          <div className="p-3 lg:p-6 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              {/* Month Navigation - always visible */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[80px] text-center">
                  {viewMode === "day" 
                    ? format(currentDate, "d MMM yy")
                    : format(currentDate, "MMM yyyy")
                  }
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1 lg:gap-2">
                {/* View Mode Tabs - hidden on mobile */}
                <div className="hidden sm:flex bg-muted rounded-lg p-1">
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

                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToday}>
                  Today
                </Button>

                {canManageEvents && (
                  <Button size="sm" className="h-8 text-xs" onClick={() => setIsAddEventOpen(true)}>
                    <Plus className="h-4 w-4 lg:mr-1" />
                    <span className="hidden lg:inline">Add Event</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Tabs - horizontal scroll on mobile */}
          <div className="px-3 lg:px-6 py-2 bg-muted/30 border-b border-border/50 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {[
                { type: "leave" as const, label: "Leave" },
                { type: "holiday" as const, label: "Holiday" },
                { type: "event" as const, label: "Event" },
                { type: "birthday" as const, label: "Bday" },
                { type: "anniversary" as const, label: "Anniv" },
                { type: "review" as const, label: "Review" },
              ].map((item) => {
                const isActive = activeFilters.has(item.type);
                const count = typeCounts[item.type];
                return (
                  <button
                    key={item.type}
                    onClick={() => toggleFilter(item.type)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background hover:bg-accent border border-border/50"
                    )}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      isActive ? "bg-primary-foreground/80" : getTypeColor(item.type)
                    )} />
                    <span>{item.label}</span>
                    <span className="text-[10px] opacity-80">{count}</span>
                  </button>
                );
              })}
              {activeFilters.size > 0 && (
                <button
                  onClick={() => setActiveFilters(new Set())}
                  className="px-1.5 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* World Clock Cards - hidden on mobile */}
          <div className="hidden lg:block mt-4">
            <WorldClockCards 
              officeCountries={offices.map(o => o.country).filter(Boolean) as string[]} 
            />
          </div>
          
          {/* Calendar Grid */}
          <div className="flex-1 p-2 lg:p-6 overflow-auto">
            {viewMode === "month" && (
              <div className="grid grid-cols-7 rounded-xl overflow-hidden border border-border">
                {/* Day headers */}
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                  <div
                    key={day}
                    className={cn(
                      "bg-muted/50 p-1.5 lg:p-3 text-center text-[10px] lg:text-xs font-medium text-muted-foreground border-b border-border",
                      index < 6 && "border-r border-border"
                    )}
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  const dayItems = getDayItems(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const colIndex = index % 7;
                  const rowIndex = Math.floor(index / 7);
                  const totalRows = Math.ceil(calendarDays.length / 7);
                  const isLastRow = rowIndex === totalRows - 1;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "bg-card p-1 lg:p-2 text-left transition-all duration-200 cursor-pointer group min-h-[60px] lg:min-h-[100px]",
                        !isCurrentMonth && "opacity-40",
                        isSelected && "ring-2 ring-primary ring-inset bg-primary/5",
                        "hover:bg-accent/50",
                        colIndex < 6 && "border-r border-border",
                        !isLastRow && "border-b border-border"
                      )}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-0.5 lg:mb-2">
                          <span
                            className={cn(
                              "text-xs lg:text-sm font-medium w-5 h-5 lg:w-7 lg:h-7 flex items-center justify-center rounded-full transition-colors",
                              isToday && "bg-primary text-primary-foreground",
                              isSelected && !isToday && "bg-primary/20 text-primary"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {dayItems.length > 3 && (
                            <span className="hidden lg:inline text-[10px] text-muted-foreground">
                              +{dayItems.length - 3}
                            </span>
                          )}
                        </div>

                        {/* Events in cell - hidden on mobile, show dots instead */}
                        <div className="hidden lg:flex flex-col gap-0.5 overflow-hidden">
                          {dayItems.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded truncate",
                                getTypeBadgeVariant(item.type)
                              )}
                              title={item.employeeName ? `${item.title} – ${item.employeeName}` : item.title}
                            >
                              <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{getTypeIcon(item.type)}</span>
                              <span className="truncate font-medium">
                                {item.employeeName ? item.employeeName.split(' ')[0] : item.title.split(' ')[0]}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Dots for mobile */}
                        {dayItems.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-auto pt-0.5 lg:hidden">
                            {dayItems.slice(0, 4).map((item) => (
                              <div
                                key={item.id}
                                className={cn("h-1.5 w-1.5 rounded-full", getTypeColor(item.type))}
                              />
                            ))}
                            {dayItems.length > 4 && (
                              <span className="text-[8px] text-muted-foreground">+{dayItems.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {viewMode === "week" && (
              <div className="bg-border rounded-xl overflow-hidden">
                {/* Week header */}
                <div className="grid grid-cols-8 gap-px">
                  <div className="bg-muted/50 p-3" /> {/* Empty corner */}
                  {calendarDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "bg-muted/50 p-3 text-center transition-colors hover:bg-accent/50",
                          isSelected && "bg-primary/10"
                        )}
                      >
                        <div className="text-xs font-medium text-muted-foreground">
                          {format(day, "EEE")}
                        </div>
                        <div
                          className={cn(
                            "text-lg font-semibold mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full",
                            isToday && "bg-primary text-primary-foreground",
                            isSelected && !isToday && "bg-primary/20 text-primary"
                          )}
                        >
                          {format(day, "d")}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* All-day events row */}
                <div className="grid grid-cols-8 gap-px border-t border-border">
                  <div className="bg-card p-2 text-xs text-muted-foreground">All day</div>
                  {calendarDays.map((day) => {
                    const dayItems = getDayItems(day);
                    return (
                      <div key={day.toISOString()} className="bg-card p-2 min-h-[60px]">
                        <div className="flex flex-col gap-1">
                          {dayItems.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded truncate font-medium",
                                getTypeBadgeVariant(item.type)
                              )}
                              title={item.employeeName ? `${item.title} – ${item.employeeName}` : item.title}
                            >
                              {item.title.split(' ')[0]}
                            </div>
                          ))}
                          {dayItems.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{dayItems.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time slots */}
                <div className="max-h-[400px] overflow-auto">
                  {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
                    <div key={hour} className="grid grid-cols-8 gap-px border-t border-border/50">
                      <div className="bg-card p-2 text-xs text-muted-foreground text-right pr-3">
                        {hour.toString().padStart(2, "0")}:00
                      </div>
                      {calendarDays.map((day) => (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className="bg-card min-h-[40px] hover:bg-accent/30 transition-colors cursor-pointer"
                          onClick={() => handleDayClick(day)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === "day" && (
              <div className="bg-border rounded-xl overflow-hidden">
                {/* Day header */}
                <div className="bg-muted/50 p-4 text-center">
                  <div className="text-sm font-medium text-muted-foreground">
                    {format(currentDate, "EEEE")}
                  </div>
                  <div
                    className={cn(
                      "text-3xl font-bold mt-1 w-14 h-14 mx-auto flex items-center justify-center rounded-full",
                      isSameDay(currentDate, new Date()) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(currentDate, "d")}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(currentDate, "MMMM yyyy")}
                  </div>
                </div>

                {/* Day events summary */}
                {getDayItems(currentDate).length > 0 && (
                  <div className="bg-card p-4 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Events</div>
                    <div className="flex flex-col gap-2">
                      {getDayItems(currentDate).map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "p-3 rounded-lg flex items-center gap-3",
                            getTypeBadgeVariant(item.type)
                          )}
                        >
                          <div className="shrink-0">{getTypeIcon(item.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.employeeName ? `${item.title} – ${item.employeeName}` : item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs opacity-75">{item.subtitle}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time slots */}
                <div className="max-h-[400px] overflow-auto">
                  {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => (
                    <div key={hour} className="flex border-t border-border/50">
                      <div className="bg-card p-3 w-20 text-xs text-muted-foreground text-right shrink-0">
                        {hour.toString().padStart(2, "0")}:00
                      </div>
                      <div className="bg-card flex-1 min-h-[50px] hover:bg-accent/30 transition-colors cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
        
        {/* Mobile Upcoming Events - shown at bottom on mobile */}
        <div className="lg:hidden shrink-0">
          {renderEventsList(true)}
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

      <EditCalendarEventDialog
        open={isEditEventOpen}
        onOpenChange={setIsEditEventOpen}
        event={selectedEvent}
        onSuccess={() => {
          refetchEvents();
          setIsEditEventOpen(false);
          setSelectedEvent(null);
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEvent?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!selectedEvent) return;
                try {
                  // Delete office associations first
                  await supabase
                    .from("calendar_event_offices")
                    .delete()
                    .eq("calendar_event_id", selectedEvent.id);

                  // Delete the event
                  const { error } = await supabase
                    .from("calendar_events")
                    .delete()
                    .eq("id", selectedEvent.id);

                  if (error) throw error;
                  toast.success("Event deleted successfully");
                  refetchEvents();
                } catch (error: any) {
                  toast.error(error.message || "Failed to delete event");
                } finally {
                  setIsDeleteDialogOpen(false);
                  setSelectedEvent(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default CalendarPage;
