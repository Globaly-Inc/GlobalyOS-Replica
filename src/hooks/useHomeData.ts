import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isSameDay, parseISO, differenceInYears } from "date-fns";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";

export interface PersonOnLeave {
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

export interface UpcomingTeamLeave {
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

export interface UpcomingEvent {
  id: string;
  date: Date;
  daysUntil: number;
  yearsCount?: number;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface UpcomingCalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  daysUntil: number;
  applies_to_all_offices: boolean;
  office_names: string[];
}

export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
  forecast: { date: string; tempMax: number; tempMin: number; condition: string }[];
}

export const useHomeData = () => {
  const { currentOrg } = useOrganization();
  const { isHR } = useUserRole();
  
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserBirthday, setCurrentUserBirthday] = useState<string | null>(null);
  const [peopleOnLeave, setPeopleOnLeave] = useState<PersonOnLeave[]>([]);
  const [upcomingTeamLeave, setUpcomingTeamLeave] = useState<UpcomingTeamLeave[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingEvent[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<UpcomingEvent[]>([]);
  const [upcomingCalendarEvents, setUpcomingCalendarEvents] = useState<UpcomingCalendarEvent[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const checkEmployeeProfile = useCallback(async () => {
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
  }, [currentOrg?.id]);

  const loadUpcomingEvents = useCallback(async () => {
    if (!currentOrg?.id) return;
    const today = new Date();
    const nextDays = 30;

    const { data: employees, error } = await supabase
      .rpc('get_birthday_calendar_data', { org_id: currentOrg.id });
    
    if (error || !employees) {
      console.error('Error loading birthday calendar data:', error);
      return;
    }

    const birthdays: UpcomingEvent[] = [];
    const anniversaries: UpcomingEvent[] = [];

    employees.forEach((emp: any) => {
      if (emp.birthday_month_day) {
        const [month, day] = emp.birthday_month_day.split('-').map(Number);
        const thisYearBirthday = new Date(today.getFullYear(), month - 1, day);
        if (thisYearBirthday < today && !isSameDay(thisYearBirthday, today)) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= nextDays) {
          birthdays.push({
            id: emp.employee_id,
            date: thisYearBirthday,
            daysUntil,
            profiles: { full_name: emp.full_name, avatar_url: emp.avatar_url }
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
              id: emp.employee_id,
              date: thisYearAnniversary,
              daysUntil,
              yearsCount: upcomingYears,
              profiles: { full_name: emp.full_name, avatar_url: emp.avatar_url }
            });
          }
        }
      }
    });

    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);
    setUpcomingBirthdays(birthdays.slice(0, 5));
    setUpcomingAnniversaries(anniversaries.slice(0, 5));
  }, [currentOrg?.id]);

  const loadUpcomingCalendarEvents = useCallback(async () => {
    if (!currentOrg?.id) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const nextMonth = format(addDays(new Date(), 30), "yyyy-MM-dd");
    
    let employeeOfficeId: string | null = null;
    if (!isHR && currentEmployeeId) {
      const { data: empData } = await supabase
        .from("employees")
        .select("office_id")
        .eq("id", currentEmployeeId)
        .single();
      employeeOfficeId = empData?.office_id || null;
    }
    
    const { data: events } = await supabase
      .from("calendar_events")
      .select(`
        id, title, start_date, end_date, start_time, end_time, event_type,
        applies_to_all_offices,
        calendar_event_offices(
          office_id,
          offices(id, name)
        )
      `)
      .eq("organization_id", currentOrg.id)
      .gte("start_date", today)
      .lte("start_date", nextMonth)
      .order("start_date", { ascending: true });
    
    if (!events) return;
    
    let filteredEvents = events;
    
    if (!isHR && employeeOfficeId) {
      filteredEvents = events.filter(event => {
        if (event.applies_to_all_offices) return true;
        const eventOfficeIds = event.calendar_event_offices?.map(o => o.office_id) || [];
        return eventOfficeIds.includes(employeeOfficeId);
      });
    }
    
    const eventsWithDays = filteredEvents.slice(0, 5).map(event => {
      const eventDate = parseISO(event.start_date);
      const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      const officeNames = event.calendar_event_offices
        ?.map(ceo => (ceo.offices as { id: string; name: string } | null)?.name)
        .filter((name): name is string => !!name) || [];
      
      return { 
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        event_type: event.event_type,
        daysUntil,
        applies_to_all_offices: event.applies_to_all_offices ?? true,
        office_names: officeNames,
      };
    });
    
    setUpcomingCalendarEvents(eventsWithDays);
  }, [currentOrg?.id, isHR, currentEmployeeId]);

  const loadLeaveData = useCallback(async () => {
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
  }, [currentOrg?.id]);

  const loadWeather = useCallback(async () => {
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
  }, []);

  // Main data loading
  useEffect(() => {
    if (currentOrg?.id) {
      Promise.all([
        checkEmployeeProfile(),
        loadLeaveData(),
        loadUpcomingEvents(),
      ]);
    }
  }, [currentOrg?.id, checkEmployeeProfile, loadLeaveData, loadUpcomingEvents]);

  // Calendar events depend on role and employee
  useEffect(() => {
    if (currentOrg?.id) {
      loadUpcomingCalendarEvents();
    }
  }, [currentOrg?.id, isHR, currentEmployeeId, loadUpcomingCalendarEvents]);

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
  }, [currentOrg?.id, loadLeaveData]);

  // Defer weather loading
  useEffect(() => {
    if (currentOrg?.id) {
      const timer = setTimeout(() => {
        loadWeather();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentOrg?.id, loadWeather]);

  return {
    hasEmployeeProfile,
    currentEmployeeId,
    currentUserName,
    currentUserBirthday,
    peopleOnLeave,
    upcomingTeamLeave,
    upcomingBirthdays,
    upcomingAnniversaries,
    upcomingCalendarEvents,
    weather,
    loadLeaveData,
    checkEmployeeProfile,
  };
};
