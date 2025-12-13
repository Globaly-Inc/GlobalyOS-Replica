import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { KudosCard } from "@/components/KudosCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Heart, MessageSquare, Megaphone, Calendar, Palmtree, Cake, Award, Sun, Sunrise, Moon, CalendarDays, SquarePen, CalendarPlus, Cloud, CloudRain, CloudSnow, CloudSun, Wind } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostUpdateDialog } from "@/components/dialogs/PostUpdateDialog";
import { AddEmployeeDialog } from "@/components/dialogs/AddEmployeeDialog";
import { AddLeaveRequestDialog } from "@/components/dialogs/AddLeaveRequestDialog";
import { AdminSetup } from "@/components/AdminSetup";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { PendingLeaveApprovals } from "@/components/PendingLeaveApprovals";
import { Link } from "react-router-dom";
import { format, addDays, isSameDay, parseISO, differenceInYears, subDays, startOfWeek, startOfMonth, isAfter } from "date-fns";
type DateFilter = "all" | "today" | "week" | "month";
interface FeedItem {
  id: string;
  type: string;
  content: string;
  created_at: string;
  image_url: string | null;
  employee_id: string;
  employee: {
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  mentions?: {
    id: string;
    employee_id: string;
    employee: {
      id: string;
      profiles: {
        full_name: string;
        avatar_url: string | null;
      };
    };
  }[];
}
interface KudosItem {
  id: string;
  comment: string;
  created_at: string;
  batch_id: string | null;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  given_by: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}
interface LeaveTypeBalance {
  id: string;
  balance: number;
  leave_type: {
    id: string;
    name: string;
    category: string;
  };
}
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
  event_type: string;
  daysUntil: number;
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
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveTypeBalance[]>([]);
  const [peopleOnLeave, setPeopleOnLeave] = useState<PersonOnLeave[]>([]);
  const [upcomingTeamLeave, setUpcomingTeamLeave] = useState<UpcomingTeamLeave[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingEvent[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<UpcomingEvent[]>([]);
  const [upcomingCalendarEvents, setUpcomingCalendarEvents] = useState<UpcomingCalendarEvent[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [weather, setWeather] = useState<{
    temperature: number;
    condition: string;
    location: string;
    humidity: number;
    windSpeed: number;
  } | null>(null);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const seenItemIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const {
    isHR,
    isAdmin
  } = useUserRole();
  const {
    currentOrg
  } = useOrganization();
  useEffect(() => {
    if (currentOrg) {
      checkEmployeeProfile();
      loadFeed();
      loadLeaveData();
      loadUpcomingEvents();
      loadUpcomingCalendarEvents();
      loadWeather();

      // Set up real-time subscriptions for auto-refresh
      const updatesChannel = supabase.channel('home-updates').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'updates',
        filter: `organization_id=eq.${currentOrg.id}`
      }, () => {
        loadFeed();
      }).subscribe();
      const kudosChannel = supabase.channel('home-kudos').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kudos',
        filter: `organization_id=eq.${currentOrg.id}`
      }, () => {
        loadFeed();
      }).subscribe();
      const leaveChannel = supabase.channel('home-leave').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
        filter: `organization_id=eq.${currentOrg.id}`
      }, () => {
        loadLeaveData();
      }).subscribe();

      // Cleanup subscriptions on unmount
      return () => {
        supabase.removeChannel(updatesChannel);
        supabase.removeChannel(kudosChannel);
        supabase.removeChannel(leaveChannel);
      };
    }
  }, [currentOrg?.id]);
  const loadWeather = async () => {
    try {
      // Get user's location
      if (!navigator.geolocation) {
        console.log("Geolocation not supported");
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Fetch weather from Open-Meteo (free, no API key needed)
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
          );
          
          if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            const current = weatherData.current;
            
            // Get location name using reverse geocoding
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            let locationName = "Your Location";
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              locationName = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Your Location";
            }
            
            // Map weather code to condition
            const getCondition = (code: number): string => {
              if (code === 0) return "Clear";
              if (code <= 3) return "Partly Cloudy";
              if (code <= 49) return "Foggy";
              if (code <= 69) return "Rainy";
              if (code <= 79) return "Snowy";
              if (code <= 99) return "Stormy";
              return "Cloudy";
            };
            
            setWeather({
              temperature: Math.round(current.temperature_2m),
              condition: getCondition(current.weather_code),
              location: locationName,
              humidity: current.relative_humidity_2m,
              windSpeed: Math.round(current.wind_speed_10m)
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
    if (!currentOrg) return;
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's profile name
    const {
      data: profileData
    } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    if (profileData) {
      const firstName = profileData.full_name.split(" ")[0];
      setCurrentUserName(firstName);
    }
    const {
      data
    } = await supabase.from("employees").select("id").eq("user_id", user.id).eq("organization_id", currentOrg.id).maybeSingle();
    setHasEmployeeProfile(!!data);
    setCurrentEmployeeId(data?.id || null);
  };
  const loadUpcomingEvents = async () => {
    if (!currentOrg) return;
    const today = new Date();
    const nextDays = 30; // Look ahead 30 days

    // Load all employees with their dates
    const {
      data: employees
    } = await supabase.from("employees").select(`
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
            profiles: emp.profiles
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
              profiles: emp.profiles
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
  
  const loadUpcomingCalendarEvents = async () => {
    if (!currentOrg) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const nextMonth = format(addDays(new Date(), 30), "yyyy-MM-dd");
    
    const { data: events } = await supabase
      .from("calendar_events")
      .select("id, title, start_date, end_date, event_type")
      .eq("organization_id", currentOrg.id)
      .gte("start_date", today)
      .lte("start_date", nextMonth)
      .order("start_date", { ascending: true })
      .limit(5);
    
    if (events) {
      const eventsWithDays = events.map(event => {
        const eventDate = parseISO(event.start_date);
        const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return { ...event, daysUntil };
      });
      setUpcomingCalendarEvents(eventsWithDays);
    }
  };
  const loadLeaveData = async () => {
    if (!currentOrg) return;
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const currentYear = new Date().getFullYear();

    // Load people on leave today
    const {
      data: leaveRequests
    } = await supabase.from("leave_requests").select(`
        id,
        leave_type,
        employee:employees!leave_requests_employee_id_fkey(
          id,
          position,
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `).eq("organization_id", currentOrg.id).eq("status", "approved").lte("start_date", today).gte("end_date", today);
    if (leaveRequests) {
      setPeopleOnLeave(leaveRequests as PersonOnLeave[]);
    }

    // Load upcoming team leave for managers (direct reports' approved leave in the future)
    const {
      data: employeeCheck
    } = await supabase.from("employees").select("id").eq("user_id", user.id).eq("organization_id", currentOrg.id).maybeSingle();
    if (employeeCheck) {
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const nextMonth = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const {
        data: teamLeave
      } = await supabase.from("leave_requests").select(`
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

    // Load current user's leave balance from new flexible table
    const {
      data: employeeData
    } = await supabase.from("employees").select("id").eq("user_id", user.id).eq("organization_id", currentOrg.id).maybeSingle();
    if (employeeData) {
      const {
        data: balanceData
      } = await supabase.from("leave_type_balances").select(`
          id,
          balance,
          leave_type:leave_types!inner(
            id,
            name,
            category
          )
        `).eq("employee_id", employeeData.id).eq("year", currentYear);
      if (balanceData) {
        setLeaveBalances(balanceData as LeaveTypeBalance[]);
      }
    }
  };
  const loadFeed = async () => {
    if (!currentOrg) return;
    setLoading(true);

    // Load updates
    const {
      data: updatesData
    } = await supabase.from("updates").select(`
        id,
        type,
        content,
        created_at,
        image_url,
        employee_id,
        employee:employees!inner(
          profiles!inner(
            full_name,
            avatar_url
          )
        ),
        mentions:update_mentions(
          id,
          employee_id,
          employee:employees!update_mentions_employee_id_fkey(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        )
      `).eq("organization_id", currentOrg.id).order("created_at", {
      ascending: false
    });

    // Load kudos
    const {
      data: kudosData
    } = await supabase.from("kudos").select(`
        id,
        comment,
        created_at,
        batch_id,
        employee:employees!kudos_employee_id_fkey(
          id,
          profiles!inner(
            full_name,
            avatar_url
          )
        ),
        given_by:employees!kudos_given_by_id_fkey(
          id,
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `).eq("organization_id", currentOrg.id).order("created_at", {
      ascending: false
    });
    if (updatesData) {
      // Track new items for animation
      const newUpdates: string[] = [];
      updatesData.forEach((item: any) => {
        if (!seenItemIdsRef.current.has(item.id) && !isInitialLoadRef.current) {
          newUpdates.push(item.id);
        }
        seenItemIdsRef.current.add(item.id);
      });
      if (newUpdates.length > 0) {
        setNewItemIds(prev => new Set([...prev, ...newUpdates]));
        // Clear animation after it plays
        setTimeout(() => {
          setNewItemIds(prev => {
            const next = new Set(prev);
            newUpdates.forEach(id => next.delete(id));
            return next;
          });
        }, 600);
      }
      setUpdates(updatesData as FeedItem[]);
    }
    if (kudosData) {
      // Track new kudos for animation
      const newKudosIds: string[] = [];
      kudosData.forEach((item: any) => {
        const itemId = item.batch_id || item.id;
        if (!seenItemIdsRef.current.has(itemId) && !isInitialLoadRef.current) {
          newKudosIds.push(itemId);
        }
        seenItemIdsRef.current.add(itemId);
      });
      if (newKudosIds.length > 0) {
        setNewItemIds(prev => new Set([...prev, ...newKudosIds]));
        // Clear animation after it plays
        setTimeout(() => {
          setNewItemIds(prev => {
            const next = new Set(prev);
            newKudosIds.forEach(id => next.delete(id));
            return next;
          });
        }, 600);
      }
      setKudos(kudosData as KudosItem[]);
    }
    isInitialLoadRef.current = false;
    setLoading(false);
  };

  // Filter items by date
  const filterByDate = <T extends {
    created_at: string;
  },>(items: T[]): T[] => {
    if (dateFilter === "all") return items;
    const now = new Date();
    let cutoffDate: Date;
    switch (dateFilter) {
      case "today":
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        cutoffDate = startOfWeek(now, {
          weekStartsOn: 1
        });
        break;
      case "month":
        cutoffDate = startOfMonth(now);
        break;
      default:
        return items;
    }
    return items.filter(item => isAfter(new Date(item.created_at), cutoffDate));
  };
  const filteredUpdates = filterByDate(updates);
  const filteredKudos = filterByDate(kudos);
  const winsAndAchievements = filteredUpdates.filter(u => u.type === "win" || u.type === "achievement");
  const regularUpdates = filteredUpdates.filter(u => u.type === "update");

  // Group kudos by batch_id to show multiple recipients in one card
  type GroupedKudosItem = KudosItem & {
    otherRecipients?: {
      id: string;
      name: string;
      avatar?: string;
    }[];
  };
  const groupedKudos: GroupedKudosItem[] = (() => {
    const grouped: Map<string, KudosItem[]> = new Map();
    const standalone: GroupedKudosItem[] = [];
    filteredKudos.forEach(k => {
      if (k.batch_id) {
        const existing = grouped.get(k.batch_id) || [];
        existing.push(k);
        grouped.set(k.batch_id, existing);
      } else {
        standalone.push({
          ...k,
          otherRecipients: undefined
        });
      }
    });

    // Convert grouped kudos to single representative items with otherRecipients
    const result: GroupedKudosItem[] = [];
    grouped.forEach(items => {
      if (items.length > 0) {
        const first = items[0];
        const others = items.slice(1).map(k => ({
          id: k.employee.id,
          name: k.employee.profiles.full_name,
          avatar: k.employee.profiles.avatar_url || undefined
        }));
        result.push({
          ...first,
          otherRecipients: others
        });
      }
    });
    return [...result, ...standalone];
  })();
  const renderFeedContent = (items: (FeedItem | (KudosItem & {
    otherRecipients?: {
      id: string;
      name: string;
      avatar?: string;
    }[];
  }))[]) => <>
      {items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(item => {
      const itemKey = "comment" in item ? ((item as any).batch_id || item.id) : item.id;
      const isNew = newItemIds.has(itemKey);
      
      if ("comment" in item) {
        const kudosItem = item as KudosItem & {
          otherRecipients?: {
            id: string;
            name: string;
            avatar?: string;
          }[];
        };
        return <div key={kudosItem.batch_id || item.id} className={isNew ? "animate-fade-in" : ""}>
          <KudosCard kudos={{
            id: kudosItem.id,
            employeeId: kudosItem.employee.id,
            employeeName: kudosItem.employee.profiles.full_name,
            givenBy: kudosItem.given_by.profiles.full_name,
            givenById: kudosItem.given_by.id,
            givenByAvatar: kudosItem.given_by.profiles.avatar_url || undefined,
            comment: kudosItem.comment,
            date: kudosItem.created_at,
            avatar: kudosItem.employee.profiles.avatar_url || undefined,
            batchId: kudosItem.batch_id || undefined,
            otherRecipients: kudosItem.otherRecipients?.map(r => r.name),
            otherRecipientIds: kudosItem.otherRecipients?.map(r => r.id)
          }} onDelete={loadFeed} />
        </div>;
      } else {
        const updateItem = item as FeedItem;
        return <div key={item.id} className={isNew ? "animate-fade-in" : ""}>
          <UpdateCard update={{
            id: updateItem.id,
            employeeId: updateItem.employee_id,
            employeeName: updateItem.employee.profiles.full_name,
            content: updateItem.content,
            date: updateItem.created_at,
            type: mapDbTypeToUiType(updateItem.type),
            avatar: updateItem.employee.profiles.avatar_url || undefined,
            imageUrl: updateItem.image_url || undefined,
            mentions: updateItem.mentions?.map(m => ({
              id: m.id,
              employeeId: m.employee_id,
              employeeName: m.employee?.profiles?.full_name || "Unknown",
              avatar: m.employee?.profiles?.avatar_url || undefined
            }))
          }} onDelete={loadFeed} />
        </div>;
      }
    })}
    </>;
  return <Layout>
      <div className="space-y-6">
        <AdminSetup />
        
        {/* Page Title */}
        {(() => {
        const hour = new Date().getHours();
        let greeting = "Good evening";
        let gradientClass = "from-slate-700 via-gray-600 to-slate-800"; // Evening
        let TimeIcon = Moon;
        if (hour < 12) {
          greeting = "Good morning";
          gradientClass = "from-gray-500 via-slate-500 to-gray-600"; // Morning
          TimeIcon = Sunrise;
        } else if (hour < 17) {
          greeting = "Good afternoon";
          gradientClass = "from-slate-600 via-gray-500 to-slate-600"; // Afternoon
          TimeIcon = Sun;
        }
        return <div className={`relative overflow-hidden rounded-xl p-6 shadow-md bg-gradient-to-r ${gradientClass} animate-fade-in`} style={{
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 8s ease infinite, fade-in 0.3s ease-out'
        }}>
              <style>{`
                @keyframes gradient-shift {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
              `}</style>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left side - Greeting */}
                <div className="flex items-center gap-3">
                  <TimeIcon className="h-8 w-8 text-white/90 drop-shadow-sm" />
                  <div>
                    <h1 className="text-2xl font-semibold text-white drop-shadow-sm">
                      {greeting}{currentUserName ? `, ${currentUserName}` : ""}
                    </h1>
                    <p className="text-sm text-white/80 mt-1">
                      {format(new Date(), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                
                {/* Right side - Weather */}
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
                    </div>
                  </div>}
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
            loadFeed();
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

        {/* Mobile-only: Pending Leave & On Leave Today at top */}
        <div className="lg:hidden space-y-4 mb-6">
          <PendingLeaveApprovals onApprovalChange={loadLeaveData} />
          
          {/* People on Leave Today - Mobile */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Palmtree className="h-4 w-4 text-primary" />
                On Leave Today
              </h3>
              {peopleOnLeave.length > 0 && <span className="text-xs text-muted-foreground">{peopleOnLeave.length} people</span>}
            </div>
            {peopleOnLeave.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {peopleOnLeave.map(leave => (
                  <Link key={leave.id} to={`/team/${leave.employee.id}`}>
                    <Avatar className="h-8 w-8 border-2 border-background shadow-sm cursor-pointer transition-transform hover:scale-110">
                      <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No one is on leave today</p>
            )}
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Feed (2/3) */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="all" className="space-y-6">
              <div className="flex flex-row items-center justify-between gap-1 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <TabsList className="h-auto p-1 sm:p-1.5 flex-wrap">
                    <TabsTrigger value="all" className="px-2 sm:px-3 py-1.5 sm:py-2 gap-1 sm:gap-1.5">
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">All</span>
                      <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 text-xs bg-muted rounded-full">
                        {filteredUpdates.length + groupedKudos.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="wins" className="px-2 sm:px-3 py-1.5 sm:py-2 gap-1 sm:gap-1.5">
                      <Trophy className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Wins</span>
                      <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 text-xs bg-muted rounded-full">
                        {winsAndAchievements.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="kudos" className="px-2 sm:px-3 py-1.5 sm:py-2 gap-1 sm:gap-1.5">
                      <Heart className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Kudos</span>
                      <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 text-xs bg-muted rounded-full">
                        {groupedKudos.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="px-2 sm:px-3 py-1.5 sm:py-2 gap-1 sm:gap-1.5">
                      <Megaphone className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Announcements</span>
                      <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 text-xs bg-muted rounded-full">
                        {regularUpdates.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Date Filter - hidden on mobile */}
                  <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                    <SelectTrigger className="hidden sm:flex w-[130px] h-auto py-2 bg-background">
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {hasEmployeeProfile && <Button className="h-auto py-1.5 sm:py-2 px-3 sm:px-4" onClick={() => setPostDialogOpen(true)}>
                    <SquarePen className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="sm:hidden">Post</span>
                    <span className="hidden sm:inline">New Post</span>
                  </Button>}
              </div>

              <TabsContent value="all" className="space-y-4">
                {loading ? <Card className="p-12 text-center">
                    <p className="text-muted-foreground">Loading feed...</p>
                  </Card> : <>
                    {renderFeedContent([...filteredUpdates, ...groupedKudos])}
                    {filteredUpdates.length === 0 && groupedKudos.length === 0 && <Card className="p-12 text-center">
                        <p className="text-muted-foreground">No updates yet. Be the first to share!</p>
                      </Card>}
                  </>}
              </TabsContent>

              <TabsContent value="wins" className="space-y-4">
                {winsAndAchievements.map(update => <UpdateCard key={update.id} update={{
                id: update.id,
                employeeId: update.employee_id,
                employeeName: update.employee.profiles.full_name,
                content: update.content,
                date: update.created_at,
                type: update.type as "win" | "achievement",
                avatar: update.employee.profiles.avatar_url || undefined,
                imageUrl: update.image_url || undefined
              }} onDelete={loadFeed} />)}
                {winsAndAchievements.length === 0 && <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No wins yet!</p>
                  </Card>}
              </TabsContent>

              <TabsContent value="kudos" className="space-y-4">
                {groupedKudos.map(kudosItem => <KudosCard key={kudosItem.batch_id || kudosItem.id} kudos={{
                id: kudosItem.id,
                employeeId: kudosItem.employee.id,
                employeeName: kudosItem.employee.profiles.full_name,
                givenBy: kudosItem.given_by.profiles.full_name,
                givenById: kudosItem.given_by.id,
                givenByAvatar: kudosItem.given_by.profiles.avatar_url || undefined,
                comment: kudosItem.comment,
                date: kudosItem.created_at,
                avatar: kudosItem.employee.profiles.avatar_url || undefined,
                batchId: kudosItem.batch_id || undefined,
                otherRecipients: kudosItem.otherRecipients?.map(r => r.name),
                otherRecipientIds: kudosItem.otherRecipients?.map(r => r.id)
              }} onDelete={loadFeed} />)}
                {groupedKudos.length === 0 && <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No kudos yet!</p>
                  </Card>}
              </TabsContent>

              <TabsContent value="announcements" className="space-y-4">
                {regularUpdates.map(update => <UpdateCard key={update.id} update={{
                id: update.id,
                employeeId: update.employee_id,
                employeeName: update.employee.profiles.full_name,
                content: update.content,
                date: update.created_at,
                type: "announcement",
                avatar: update.employee.profiles.avatar_url || undefined,
                imageUrl: update.image_url || undefined
              }} onDelete={loadFeed} />)}
                {regularUpdates.length === 0 && <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No announcements yet!</p>
                  </Card>}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Leave Sidebar (1/3) - hidden on mobile */}
          <div className="hidden lg:block space-y-6">
            {/* QR Code Generator for HR/Admin */}
            {(isHR || isAdmin) && <QRCodeGenerator />}

            {/* Pending Leave Approvals for Managers/HR */}
            <PendingLeaveApprovals onApprovalChange={loadLeaveData} />

            {/* Current User Leave Balance */}
            {hasEmployeeProfile && <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    My Leave Balance
                  </h3>
                  <Button size="sm" onClick={() => setLeaveDialogOpen(true)}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Request
                  </Button>
                </div>
                {leaveBalances.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...leaveBalances]
                      .sort((a, b) => {
                        // Sort by category: paid first, then unpaid
                        if (a.leave_type.category === 'paid' && b.leave_type.category !== 'paid') return -1;
                        if (a.leave_type.category !== 'paid' && b.leave_type.category === 'paid') return 1;
                        return a.leave_type.name.localeCompare(b.leave_type.name);
                      })
                      .map(item => <div key={item.id} className="text-center p-3 rounded-lg bg-primary/5">
                        <div className="text-2xl font-bold text-primary">
                          {item.balance}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{item.leave_type.name}</div>
                      </div>)}
                  </div> : <p className="text-sm text-muted-foreground">No leave balance set for this year</p>}
              </Card>}

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
                        <Link to={`/team/${leave.employee.id}`}>
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm cursor-pointer transition-transform hover:scale-110">
                            <AvatarImage src={leave.employee.profiles.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {leave.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
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
                              </span>
                            </div>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>)}
                </div> : <p className="text-sm text-muted-foreground">No one is on leave today</p>}
              
              {/* Upcoming Team Leave - for managers */}
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
                    return <Link key={leave.id} to={`/team/${leave.employee.id}`} className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors">
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
                          </Link>;
                  })}
                    </div>
                  </div>
                </>}
            </Card>
            
            {/* Upcoming Events */}
            {upcomingCalendarEvents.length > 0 && (
              <Card className="p-6">
                <Link to="/calendar" className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors">
                  <CalendarPlus className="h-5 w-5 text-primary" />
                  Upcoming Events
                </Link>
                <div className="space-y-3">
                  {upcomingCalendarEvents.map(event => {
                    const isMultiDay = event.start_date !== event.end_date;
                    const dateDisplay = isMultiDay 
                      ? `${format(parseISO(event.start_date), "d MMM")} - ${format(parseISO(event.end_date), "d MMM")}`
                      : format(parseISO(event.start_date), "d MMM");
                    const daysLabel = event.daysUntil === 0 ? "Today" : event.daysUntil === 1 ? "Tomorrow" : `In ${event.daysUntil} days`;
                    
                    return (
                      <div key={event.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            event.event_type === 'holiday' ? 'bg-red-500' : 
                            event.event_type === 'event' ? 'bg-blue-500' : 'bg-primary'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{dateDisplay}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{daysLabel}</span>
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
                  {upcomingBirthdays.map(birthday => <Link key={birthday.id} to={`/team/${birthday.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
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
                    </Link>)}
                </div> : <p className="text-sm text-muted-foreground">No upcoming birthdays</p>}
            </Card>

            {/* Work Anniversaries */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Award className="h-5 w-5 text-primary" />
                Work Anniversaries
              </h3>
              {upcomingAnniversaries.length > 0 ? <div className="space-y-3">
                  {upcomingAnniversaries.map(anniversary => <Link key={anniversary.id} to={`/team/${anniversary.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
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
                    </Link>)}
                </div> : <p className="text-sm text-muted-foreground">No upcoming anniversaries</p>}
            </Card>
          </div>
        </div>
      </div>

      <PostUpdateDialog open={postDialogOpen} onOpenChange={setPostDialogOpen} onSuccess={loadFeed} canPostAnnouncement={isAdmin || isHR} />

      {currentEmployeeId && <AddLeaveRequestDialog employeeId={currentEmployeeId} open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} onSuccess={loadLeaveData} trigger={null} />}
    </Layout>;
};
export default Home;