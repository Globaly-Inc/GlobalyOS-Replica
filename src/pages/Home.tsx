import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Heart, MessageSquare, Megaphone, Calendar, Palmtree, Cake, Award, Sun, Sunrise, Moon, CalendarDays, SquarePen, CalendarPlus, Cloud, CloudRain, CloudSnow, CloudSun, Wind, Filter, Crown, Users } from "lucide-react";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InlinePostComposer } from "@/components/feed/InlinePostComposer";
import { UnifiedFeed } from "@/components/feed/UnifiedFeed";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";
import { AddLeaveRequestDialog } from "@/components/dialogs/AddLeaveRequestDialog";
import { AdminSetup } from "@/components/AdminSetup";
import { useHomeFilters } from "@/hooks/useHomeFilters";

import { useUserRole } from "@/hooks/useUserRole";

import { useOrganization } from "@/hooks/useOrganization";
import { PendingLeaveApprovals } from "@/components/PendingLeaveApprovals";
import { PendingWfhApprovals } from "@/components/PendingWfhApprovals";
import { SelfCheckInCard } from "@/components/home/SelfCheckInCard";
import { PendingKpiUpdates } from "@/components/PendingKpiUpdates";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { OrgLink } from "@/components/OrgLink";
import { format, addDays, isSameDay, parseISO, differenceInYears } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { useTimezone, getTimezones, formatTimezoneLabel } from "@/hooks/useTimezone";
import { Globe, Pencil } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Lazy load non-critical sidebar components for faster initial load
const AllPendingLeavesCard = lazy(() => import("@/components/home/AllPendingLeavesCard").then(m => ({ default: m.AllPendingLeavesCard })));
const NotCheckedInCard = lazy(() => import("@/components/home/NotCheckedInCard").then(m => ({ default: m.NotCheckedInCard })));
const UserHelpRequests = lazy(() => import("@/components/home/UserHelpRequests").then(m => ({ default: m.UserHelpRequests })));
const DailyHoroscope = lazy(() => import("@/components/home/DailyHoroscope").then(m => ({ default: m.DailyHoroscope })));
const MyWorkflowTasks = lazy(() => import("@/components/home/MyWorkflowTasks").then(m => ({ default: m.MyWorkflowTasks })));

type DateFilter = "all" | "today" | "week" | "month";

interface PersonOnLeave {
  id: string;
  employee: {
    id: string;
    position: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  leave_type: string;
  half_day_type: string;
}

interface UpcomingTeamLeave {
  id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  leave_type: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
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

interface UpcomingCalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  daysUntil: number;
}

const Home = () => {
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);
  const { timezone, setTimezone } = useTimezone();
  const {
    feedFilter, setFeedFilter,
    dateFilter, setDateFilter,
  } = useHomeFilters();
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserBirthday, setCurrentUserBirthday] = useState<string | null>(null);
  const [peopleOnLeave, setPeopleOnLeave] = useState<PersonOnLeave[]>([]);
  const [upcomingTeamLeave, setUpcomingTeamLeave] = useState<UpcomingTeamLeave[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingEvent[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<UpcomingEvent[]>([]);
  const [upcomingCalendarEvents, setUpcomingCalendarEvents] = useState<UpcomingCalendarEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<{
    temperature: number;
    condition: string;
    location: string;
    humidity: number;
    windSpeed: number;
    forecast: { date: string; tempMax: number; tempMin: number; condition: string }[];
  } | null>(null);

  const { role, isHR, isAdmin, isOwner } = useUserRole();
  const { currentOrg } = useOrganization();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Main data loading - parallel execution
  useEffect(() => {
    if (currentOrg?.id) {
      // Execute all data loading in parallel for faster initial load
      Promise.all([
        checkEmployeeProfile(),
        loadLeaveData(),
        loadUpcomingEvents(),
      ]);
    }
  }, [currentOrg?.id]);

  // Separate effect for calendar events that depends on role and employee
  useEffect(() => {
    if (currentOrg?.id) {
      loadUpcomingCalendarEvents();
    }
  }, [currentOrg?.id, isHR, currentEmployeeId]);

  // Real-time subscription for leave
  useEffect(() => {
    if (currentOrg?.id) {
      const orgId = currentOrg.id;
      const leaveChannel = supabase.channel('home-leave').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
        filter: `organization_id=eq.${orgId}`
      }, () => {
        loadLeaveData();
      }).subscribe();

      return () => {
        supabase.removeChannel(leaveChannel);
      };
    }
  }, [currentOrg?.id]);

  // Defer weather loading - low priority, external API
  useEffect(() => {
    if (currentOrg?.id) {
      const timer = setTimeout(() => {
        loadWeather();
      }, 1500); // Delay by 1.5 seconds to prioritize main content
      return () => clearTimeout(timer);
    }
  }, [currentOrg?.id]);

  const loadWeather = async () => {
    try {
      if (!navigator.geolocation) {
        console.log("Geolocation not supported");
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`
          );
          
          if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            const current = weatherData.current;
            const daily = weatherData.daily;
            
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            let locationName = "Your Location";
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              locationName = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Your Location";
            }
            
            const getCondition = (code: number): string => {
              if (code === 0) return "Clear";
              if (code <= 3) return "Partly Cloudy";
              if (code <= 49) return "Foggy";
              if (code <= 69) return "Rainy";
              if (code <= 79) return "Snowy";
              if (code <= 99) return "Stormy";
              return "Cloudy";
            };
            
            const forecast = daily.time.slice(1, 8).map((date: string, i: number) => ({
              date,
              tempMax: Math.round(daily.temperature_2m_max[i + 1]),
              tempMin: Math.round(daily.temperature_2m_min[i + 1]),
              condition: getCondition(daily.weather_code[i + 1])
            }));
            
            setWeather({
              temperature: Math.round(current.temperature_2m),
              condition: getCondition(current.weather_code),
              location: locationName,
              humidity: current.relative_humidity_2m,
              windSpeed: Math.round(current.wind_speed_10m),
              forecast
            });
          }
        },
        (error) => {
          console.log("Geolocation error:", error.message);
        }
      );
    } catch (error) {
      console.error("Failed to load weather:", error);
    }
  };

  const checkEmployeeProfile = async () => {
    if (!currentOrg?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    if (profileData) {
      const firstName = profileData.full_name.split(" ")[0];
      setCurrentUserName(firstName);
    }
    const { data } = await supabase.from("employees").select("id, date_of_birth").eq("user_id", user.id).eq("organization_id", currentOrg.id).maybeSingle();
    setHasEmployeeProfile(!!data);
    setCurrentEmployeeId(data?.id || null);
    setCurrentUserBirthday(data?.date_of_birth || null);
  };

  const loadUpcomingEvents = async () => {
    if (!currentOrg?.id) return;
    const today = new Date();
    const nextDays = 30;

    const { data: employees } = await supabase.from("employees").select(`
        id,
        date_of_birth,
        join_date,
        profiles!inner(
          full_name,
          avatar_url
        )
      `).eq("organization_id", currentOrg.id).eq("status", "active");
    if (!employees) return;

    const birthdays: UpcomingEvent[] = [];
    const anniversaries: UpcomingEvent[] = [];

    employees.forEach((emp: any) => {
      if (emp.date_of_birth) {
        const dob = parseISO(emp.date_of_birth);
        const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (thisYearBirthday < today && !isSameDay(thisYearBirthday, today)) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= nextDays) {
          birthdays.push({
            id: emp.id,
            date: thisYearBirthday,
            daysUntil,
            profiles: emp.profiles
          });
        }
      }

      if (emp.join_date) {
        const joinDate = parseISO(emp.join_date);
        const yearsWorked = differenceInYears(today, joinDate);
        if (yearsWorked >= 1) {
          const thisYearAnniversary = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());
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
              profiles: emp.profiles
            });
          }
        }
      }
    });

    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);
    setUpcomingBirthdays(birthdays.slice(0, 5));
    setUpcomingAnniversaries(anniversaries.slice(0, 5));
  };
  
  const loadUpcomingCalendarEvents = async () => {
    if (!currentOrg?.id) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const nextMonth = format(addDays(new Date(), 30), "yyyy-MM-dd");
    
    // Get current employee's office for filtering (only needed for non-privileged users)
    let employeeOfficeId: string | null = null;
    if (!isHR && currentEmployeeId) {
      const { data: empData } = await supabase
        .from("employees")
        .select("office_id")
        .eq("id", currentEmployeeId)
        .single();
      employeeOfficeId = empData?.office_id || null;
    }
    
    // Fetch events with office relationships
    const { data: events } = await supabase
      .from("calendar_events")
      .select(`
        id, title, start_date, end_date, start_time, end_time, event_type,
        applies_to_all_offices,
        calendar_event_offices(office_id)
      `)
      .eq("organization_id", currentOrg.id)
      .gte("start_date", today)
      .lte("start_date", nextMonth)
      .order("start_date", { ascending: true });
    
    if (!events) return;
    
    // Filter events based on user role and office
    let filteredEvents = events;
    
    if (!isHR && employeeOfficeId) {
      // For regular members: only show events that apply to all offices 
      // OR are specifically assigned to their office
      filteredEvents = events.filter(event => {
        if (event.applies_to_all_offices) return true;
        const eventOfficeIds = event.calendar_event_offices?.map(o => o.office_id) || [];
        return eventOfficeIds.includes(employeeOfficeId);
      });
    }
    
    // Take top 5 and calculate days until
    const eventsWithDays = filteredEvents.slice(0, 5).map(event => {
      const eventDate = parseISO(event.start_date);
      const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return { 
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        event_type: event.event_type,
        daysUntil 
      };
    });
    
    setUpcomingCalendarEvents(eventsWithDays);
  };

  const loadLeaveData = async () => {
    if (!currentOrg?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const { data: leaveRequests } = await supabase
      .from("leave_requests")
      .select("id, leave_type, employee_id, half_day_type")
      .eq("organization_id", currentOrg.id)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today);

    if (!leaveRequests || leaveRequests.length === 0) {
      setPeopleOnLeave([]);
    } else {
      const employeeIds = Array.from(
        new Set(
          leaveRequests
            .map((r: any) => r.employee_id)
            .filter(Boolean)
        )
      );

      const { data: employees } = await supabase
        .from("employee_directory")
        .select("id, full_name, avatar_url, position")
        .eq("organization_id", currentOrg.id)
        .in("id", employeeIds);

      const employeeById = new Map(
        (employees || []).map((e: any) => [e.id, e])
      );

      const normalized = (leaveRequests as any[])
        .map((r) => {
          const emp = employeeById.get(r.employee_id);
          if (!emp) return null;

          return {
            id: r.id,
            leave_type: r.leave_type,
            half_day_type: r.half_day_type || "full",
            employee: {
              id: emp.id,
              position: emp.position,
              profiles: {
                full_name: emp.full_name,
                avatar_url: emp.avatar_url,
              },
            },
          };
        })
        .filter(Boolean);

      setPeopleOnLeave(normalized as PersonOnLeave[]);
    }

    const { data: employeeCheck } = await supabase.from("employees").select("id").eq("user_id", user.id).eq("organization_id", currentOrg.id).maybeSingle();
    if (employeeCheck) {
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const nextMonth = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const { data: teamLeave } = await supabase.from("leave_requests").select(`
          id,
          start_date,
          end_date,
          days_count,
          leave_type,
          employee:employees!leave_requests_employee_id_fkey(
            id,
            manager_id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `).eq("organization_id", currentOrg.id).eq("status", "approved").gte("start_date", tomorrow).lte("start_date", nextMonth).order("start_date", {
        ascending: true
      });
      if (teamLeave) {
        const directReportsLeave = teamLeave.filter((req: any) => req.employee?.manager_id === employeeCheck.id);
        setUpcomingTeamLeave(directReportsLeave as UpcomingTeamLeave[]);
      }
    }
  };

  return <>
      <div className="space-y-4">
        <AdminSetup />
        
        {/* Page Title */}
        {(() => {
        const hour = new Date().getHours();
        let greeting = "Good evening";
        let gradientClass = "from-primary/80 via-accent to-primary";
        let TimeIcon = Moon;
        if (hour < 12) {
          greeting = "Good morning";
          gradientClass = "from-primary/70 via-primary to-accent";
          TimeIcon = Sunrise;
        } else if (hour < 17) {
          greeting = "Good afternoon";
          gradientClass = "from-accent via-primary/80 to-primary";
          TimeIcon = Sun;
        }
        return <div className={`relative overflow-hidden rounded-xl p-6 shadow-lg bg-gradient-to-r ${gradientClass} animate-fade-in`} style={{
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 6s ease infinite, fade-in 0.3s ease-out'
        }}>
              <style>{`
                @keyframes gradient-shift {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
              `}</style>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-white drop-shadow-sm">
                    {greeting}{currentUserName ? `, ${currentUserName}` : ""}
                  </h1>
                  <p className="text-sm text-white/80 mt-1">
                    {formatInTimeZone(currentTime, timezone, "EEEE, MMMM d, yyyy")} • {formatInTimeZone(currentTime, timezone, "h:mm a")}
                  </p>
                  <Popover open={timezonePopoverOpen} onOpenChange={setTimezonePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 mt-1 transition-colors">
                        <Globe className="h-3 w-3" />
                        {timezone.replace(/_/g, ' ')}
                        <Pencil className="h-2.5 w-2.5 opacity-70" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search timezone..." />
                        <CommandList>
                          <CommandEmpty>No timezone found.</CommandEmpty>
                          <CommandGroup className="max-h-[250px] overflow-auto">
                            {getTimezones().map((tz) => (
                              <CommandItem
                                key={tz}
                                value={formatTimezoneLabel(tz)}
                                onSelect={() => {
                                  setTimezone(tz);
                                  setTimezonePopoverOpen(false);
                                }}
                              >
                                {formatTimezoneLabel(tz)}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <hr className="md:hidden border-white/20" />
                
                {weather && <div className="md:text-right">
                    <div className="flex md:justify-end gap-3 items-center">
                      <div className="flex items-center gap-2">
                        {weather.condition === "Clear" && <Sun className="h-8 w-8 text-yellow-300" />}
                        {weather.condition === "Partly Cloudy" && <CloudSun className="h-8 w-8 text-white/90" />}
                        {weather.condition === "Cloudy" && <Cloud className="h-8 w-8 text-white/80" />}
                        {weather.condition === "Rainy" && <CloudRain className="h-8 w-8 text-blue-300" />}
                        {weather.condition === "Snowy" && <CloudSnow className="h-8 w-8 text-white" />}
                        {weather.condition === "Stormy" && <CloudRain className="h-8 w-8 text-purple-300" />}
                        {weather.condition === "Foggy" && <Cloud className="h-8 w-8 text-white/60" />}
                        <span className="text-2xl font-semibold text-white">{weather.temperature}°C</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-white/90 font-medium">{weather.condition}</p>
                        <p className="text-xs text-white/70">{weather.location}</p>
                        <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                          <span>💧 {weather.humidity}%</span>
                          <span className="flex items-center gap-0.5"><Wind className="h-3 w-3" /> {weather.windSpeed} km/h</span>
                        </div>
                      </div>
                      <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-white/20">
                        {weather.forecast.slice(0, 7).map((day, i) => {
                          const WeatherIcon = day.condition === "Clear" ? Sun 
                            : day.condition === "Partly Cloudy" ? CloudSun
                            : day.condition === "Rainy" ? CloudRain
                            : day.condition === "Snowy" ? CloudSnow
                            : day.condition === "Stormy" ? CloudRain
                            : Cloud;
                          return (
                            <div key={i} className="flex flex-col items-center text-center min-w-[40px]">
                              <span className="text-[10px] text-white/60">{format(parseISO(day.date), "EEE")}</span>
                              <WeatherIcon className="h-4 w-4 text-white/80 my-0.5" />
                              <span className="text-[10px] text-white/90">{day.tempMax}°</span>
                              <span className="text-[10px] text-white/50">{day.tempMin}°</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>}
                <div className="hidden lg:block">
                  <DailyHoroscope dateOfBirth={currentUserBirthday} />
                </div>
              </div>
            </div>;
      })()}

        {/* Action Buttons */}
        {!hasEmployeeProfile && isHR && <Card className="p-6 border-accent/50 bg-accent-light/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Create Your Employee Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your profile to start posting updates and giving kudos
                </p>
              </div>
              <AddEmployeeDialog onSuccess={() => {
            checkEmployeeProfile();
          }} />
            </div>
          </Card>}

        {!hasEmployeeProfile && !isHR && <Card className="p-6 border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Employee Profile Not Found</h3>
                <p className="text-sm text-muted-foreground">
                  Contact your HR department to set up your employee profile so you can start posting updates and giving kudos
                </p>
              </div>
            </div>
          </Card>}

        {/* Mobile-only: Self Check-In, Pending Leave & On Leave Today at top - Compact */}
        <div className="lg:hidden space-y-3 mb-4">
          <SelfCheckInCard />
          <PendingLeaveApprovals onApprovalChange={loadLeaveData} />
          <Suspense fallback={<CardSkeleton />}>
            <AllPendingLeavesCard />
          </Suspense>
          
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Palmtree className="h-3.5 w-3.5 text-primary" />
                On Leave Today
              </h3>
              {peopleOnLeave.length > 0 && <span className="text-[11px] text-muted-foreground">{peopleOnLeave.length} people</span>}
            </div>
            {peopleOnLeave.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {peopleOnLeave.slice(0, 8).map(leave => (
                  <OrgLink key={leave.id} to={`/team/${leave.employee.id}`}>
                    <div className="relative">
                      <Avatar className="h-7 w-7 border-2 border-background shadow-sm cursor-pointer transition-transform hover:scale-110">
                        <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      {leave.half_day_type !== "full" && (
                        <span className="absolute -top-0.5 -right-0.5 text-[5px] font-semibold text-white bg-primary rounded-full px-0.5 shadow-sm border border-background z-10">
                          {leave.half_day_type === "first_half" ? "1" : "2"}
                        </span>
                      )}
                    </div>
                  </OrgLink>
                ))}
                {peopleOnLeave.length > 8 && (
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                    +{peopleOnLeave.length - 8}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No one is on leave today</p>
            )}
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Feed (2/3) */}
          <div className="lg:col-span-2 lg:pr-2">
            {/* Self Check-In Card for users who haven't checked in - TOP PRIORITY */}
            <div className="mb-6 hidden lg:block">
              <SelfCheckInCard />
            </div>
            
            
            
            {hasEmployeeProfile && (
              <div className="mb-6">
                <InlinePostComposer 
                  canPostAnnouncement={isOwner || isAdmin || isHR}
                  canPostExecutive={isOwner || isAdmin}
                />
              </div>
            )}

            {/* Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={feedFilter} onValueChange={setFeedFilter}>
                  <SelectTrigger className="w-[180px] h-9 bg-background">
                    <SelectValue placeholder="Filter posts" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> All Posts
                      </span>
                    </SelectItem>
                    <SelectItem value="win">
                      <span className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500" /> Wins
                      </span>
                    </SelectItem>
                    <SelectItem value="kudos">
                      <span className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-pink-500" /> Kudos
                      </span>
                    </SelectItem>
                    <SelectItem value="social">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-500" /> Social
                      </span>
                    </SelectItem>
                    <SelectItem value="update">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-cyan-500" /> Updates
                      </span>
                    </SelectItem>
                    <SelectItem value="announcement">
                      <span className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-blue-500" /> Announcements
                      </span>
                    </SelectItem>
                    <SelectItem value="executive_message">
                      <span className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-purple-500" /> Executive
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                <SelectTrigger className="w-9 md:w-[130px] h-9 bg-background px-2 md:px-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="hidden md:inline md:ml-2">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feed Content - Unified Posts */}
            <UnifiedFeed 
              feedFilter={feedFilter} 
              dateFilter={dateFilter}
            />
          </div>

          {/* Right Column - Leave Sidebar (1/3) - hidden on mobile */}
          <div className="hidden lg:block space-y-6 lg:pl-2">
            <PendingLeaveApprovals onApprovalChange={loadLeaveData} />
            <PendingWfhApprovals />
            <PendingKpiUpdates />

            {/* Employees Not Checked In */}
            <Suspense fallback={<CardSkeleton />}>
              <NotCheckedInCard />
            </Suspense>

            {/* All Pending Leaves */}
            <Suspense fallback={<CardSkeleton />}>
              <AllPendingLeavesCard />
            </Suspense>

            {/* My Workflow Tasks */}
            {currentEmployeeId && (
              <Suspense fallback={<CardSkeleton />}>
                <MyWorkflowTasks employeeId={currentEmployeeId} />
              </Suspense>
            )}

            {/* People on Leave Today */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Palmtree className="h-5 w-5 text-primary" />
                  On Leave Today
                </h3>
                {peopleOnLeave.length > 0 && <span className="text-sm text-muted-foreground">{peopleOnLeave.length} people</span>}
              </div>
              {peopleOnLeave.length > 0 ? <div className="flex flex-wrap gap-2">
                  {peopleOnLeave.map(leave => <HoverCard key={leave.id}>
                      <HoverCardTrigger asChild>
                        <OrgLink to={`/team/${leave.employee.id}`}>
                          <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm cursor-pointer transition-transform hover:scale-110">
                              <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            {leave.half_day_type !== "full" && (
                              <span className="absolute -top-0.5 -right-0.5 text-[6px] font-semibold text-white bg-primary rounded-full px-0.5 py-px shadow-sm border border-background z-10 tracking-tighter">
                                {leave.half_day_type === "first_half" ? "1ˢᵗ" : "2ⁿᵈ"}
                              </span>
                            )}
                          </div>
                        </OrgLink>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64" side="top">
                        <div className="flex gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {leave.employee.profiles.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {leave.employee.position}
                            </p>
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 capitalize">
                                <Palmtree className="h-3 w-3" />
                                {leave.leave_type.replace("_", " ")}
                                {leave.half_day_type !== "full" && ` (${leave.half_day_type === "first_half" ? "1st Half" : "2nd Half"})`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>)}
                </div> : <p className="text-sm text-muted-foreground">No one is on leave today</p>}
              
              {upcomingTeamLeave.length > 0 && <>
                  <div className="border-t border-border my-4" />
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                      <CalendarDays className="h-4 w-4" />
                      Upcoming Team Leave
                    </h4>
                    <div className="space-y-2">
                      {upcomingTeamLeave.slice(0, 3).map(leave => {
                    const isMultiDay = leave.start_date !== leave.end_date;
                    const daysLabel = leave.days_count === 1 ? "1 day" : `${leave.days_count} days`;
                    const dateRange = isMultiDay ? `${format(parseISO(leave.start_date), "d MMM")} - ${format(parseISO(leave.end_date), "d MMM yyyy")}` : format(parseISO(leave.start_date), "d MMM yyyy");
                    return <OrgLink key={leave.id} to={`/team/${leave.employee.id}`} className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground flex-shrink-0">
                              {leave.employee.profiles.full_name.split(" ")[0]}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {leave.leave_type} · {daysLabel} · {dateRange}
                            </span>
                          </OrgLink>;
                  })}
                    </div>
                  </div>
                </>}
            </Card>
            
            {/* Upcoming Events */}
            {upcomingCalendarEvents.length > 0 && (
              <Card className="p-6">
                <OrgLink to="/calendar" className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Events
                </OrgLink>
                <div className="space-y-3">
                  {upcomingCalendarEvents.map(event => {
                    const isMultiDay = event.start_date !== event.end_date;
                    const startDate = parseISO(event.start_date);
                    const endDate = parseISO(event.end_date);
                    const dateDisplay = isMultiDay 
                      ? `${format(startDate, "d MMM")}${event.start_time ? ` · ${format(new Date(`2000-01-01T${event.start_time}`), "h:mm a")}` : ''} - ${format(endDate, "d MMM")}${event.end_time ? ` · ${format(new Date(`2000-01-01T${event.end_time}`), "h:mm a")}` : ''}`
                      : `${format(startDate, "d MMM")}${event.start_time ? ` · ${format(new Date(`2000-01-01T${event.start_time}`), "h:mm a")}` : ''}`;
                    const daysLabel = event.daysUntil === 0 ? "Today" : event.daysUntil === 1 ? "Tomorrow" : `In ${event.daysUntil} days`;
                    
                    return (
                      <div key={event.id} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                        <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          event.event_type === 'holiday' ? 'bg-red-500' : 
                          event.event_type === 'event' ? 'bg-blue-500' : 'bg-primary'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{dateDisplay} · {daysLabel}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            
            {/* Upcoming Birthdays */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Cake className="h-5 w-5 text-primary" />
                Upcoming Birthdays
              </h3>
              {upcomingBirthdays.length > 0 ? <div className="space-y-3">
                  {upcomingBirthdays.map(birthday => <OrgLink key={birthday.id} to={`/team/${birthday.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
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
                    </OrgLink>)}
                </div> : <p className="text-sm text-muted-foreground">No upcoming birthdays</p>}
            </Card>

            {/* Work Anniversaries */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Award className="h-5 w-5 text-primary" />
                Work Anniversaries
              </h3>
              {upcomingAnniversaries.length > 0 ? <div className="space-y-3">
                  {upcomingAnniversaries.map(anniversary => <OrgLink key={anniversary.id} to={`/team/${anniversary.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
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
                    </OrgLink>)}
                </div> : <p className="text-sm text-muted-foreground">No upcoming anniversaries</p>}
            </Card>

            <Suspense fallback={<CardSkeleton />}>
              <UserHelpRequests />
            </Suspense>
          </div>
        </div>
      </div>

      {currentEmployeeId && <AddLeaveRequestDialog employeeId={currentEmployeeId} open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} onSuccess={loadLeaveData} trigger={null} />}
    </>;
};
export default Home;