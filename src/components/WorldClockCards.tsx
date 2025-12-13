import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Plus, X, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCountryFlag } from "@/lib/countryFlags";
import { getTimezones, formatTimezoneLabel } from "@/hooks/useTimezone";
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
import { cn } from "@/lib/utils";

interface WorldClockCardsProps {
  officeCountries?: string[];
}

const STORAGE_KEY = "world-clock-timezones";
const MAX_CLOCKS = 5;

// Map country names to default timezones
const countryToTimezone: Record<string, string> = {
  "Australia": "Australia/Sydney",
  "Nepal": "Asia/Kathmandu",
  "India": "Asia/Kolkata",
  "United States": "America/New_York",
  "United Kingdom": "Europe/London",
  "Japan": "Asia/Tokyo",
  "Germany": "Europe/Berlin",
  "France": "Europe/Paris",
  "China": "Asia/Shanghai",
  "Singapore": "Asia/Singapore",
  "UAE": "Asia/Dubai",
  "United Arab Emirates": "Asia/Dubai",
  "Canada": "America/Toronto",
  "Brazil": "America/Sao_Paulo",
  "South Korea": "Asia/Seoul",
  "Netherlands": "Europe/Amsterdam",
  "New Zealand": "Pacific/Auckland",
  "Thailand": "Asia/Bangkok",
  "Philippines": "Asia/Manila",
  "Indonesia": "Asia/Jakarta",
  "Malaysia": "Asia/Singapore",
  "Vietnam": "Asia/Bangkok",
  "Mexico": "America/Mexico_City",
  "Spain": "Europe/Madrid",
  "Italy": "Europe/Rome",
  "Switzerland": "Europe/Zurich",
  "Sweden": "Europe/Stockholm",
  "Norway": "Europe/Oslo",
  "Denmark": "Europe/Copenhagen",
  "Finland": "Europe/Helsinki",
  "Poland": "Europe/Warsaw",
  "Russia": "Europe/Moscow",
  "Turkey": "Europe/Istanbul",
  "Egypt": "Africa/Cairo",
  "South Africa": "Africa/Johannesburg",
  "Nigeria": "Africa/Lagos",
  "Kenya": "Africa/Nairobi",
};

// Map timezone to country for flag display
const timezoneToCountry: Record<string, string> = {
  "Asia/Katmandu": "Nepal", // Legacy spelling alias
  "Australia/Sydney": "Australia",
  "Australia/Melbourne": "Australia",
  "Australia/Perth": "Australia",
  "Australia/Brisbane": "Australia",
  "Asia/Kathmandu": "Nepal",
  "Asia/Kolkata": "India",
  "America/New_York": "United States",
  "America/Chicago": "United States",
  "America/Denver": "United States",
  "America/Los_Angeles": "United States",
  "America/Anchorage": "United States",
  "America/Honolulu": "United States",
  "Europe/London": "United Kingdom",
  "Asia/Tokyo": "Japan",
  "Europe/Berlin": "Germany",
  "Europe/Paris": "France",
  "Asia/Shanghai": "China",
  "Asia/Hong_Kong": "Hong Kong",
  "Asia/Singapore": "Singapore",
  "Asia/Dubai": "United Arab Emirates",
  "America/Toronto": "Canada",
  "America/Vancouver": "Canada",
  "America/Sao_Paulo": "Brazil",
  "America/Buenos_Aires": "Argentina",
  "Asia/Seoul": "South Korea",
  "Europe/Amsterdam": "Netherlands",
  "Pacific/Auckland": "New Zealand",
  "Asia/Bangkok": "Thailand",
  "Asia/Manila": "Philippines",
  "Asia/Jakarta": "Indonesia",
  "America/Mexico_City": "Mexico",
  "Europe/Madrid": "Spain",
  "Europe/Rome": "Italy",
  "Europe/Vienna": "Austria",
  "Europe/Stockholm": "Sweden",
  "Europe/Warsaw": "Poland",
  "Europe/Moscow": "Russia",
  "Europe/Istanbul": "Turkey",
  "Africa/Cairo": "Egypt",
  "Africa/Johannesburg": "South Africa",
  "Africa/Lagos": "Nigeria",
  "Africa/Nairobi": "Kenya",
  "Pacific/Fiji": "Fiji",
  "Asia/Dhaka": "Bangladesh",
  "UTC": "",
};

export const WorldClockCards = ({ officeCountries = [] }: WorldClockCardsProps) => {
  // Get user's current timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const [timezones, setTimezones] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure user's timezone is always first
        if (!parsed.includes(userTimezone)) {
          return [userTimezone, ...parsed].slice(0, MAX_CLOCKS);
        }
        // Move user timezone to front if it exists
        const filtered = parsed.filter((tz: string) => tz !== userTimezone);
        return [userTimezone, ...filtered].slice(0, MAX_CLOCKS);
      } catch {
        return [userTimezone];
      }
    }
    // Default to user timezone + office timezones
    const officeTimezones = officeCountries
      .map(country => countryToTimezone[country])
      .filter(Boolean)
      .filter(tz => tz !== userTimezone)
      .slice(0, MAX_CLOCKS - 1);
    return [userTimezone, ...new Set(officeTimezones)];
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Persist timezones
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timezones));
  }, [timezones]);

  // Initialize with office timezones if empty and offices provided
  useEffect(() => {
    if (timezones.length === 0 && officeCountries.length > 0) {
      const officeTimezones = officeCountries
        .map(country => countryToTimezone[country])
        .filter(Boolean)
        .slice(0, MAX_CLOCKS);
      if (officeTimezones.length > 0) {
        setTimezones([...new Set(officeTimezones)]);
      }
    }
  }, [officeCountries]);

  const addTimezone = (tz: string) => {
    if (timezones.length < MAX_CLOCKS && !timezones.includes(tz)) {
      setTimezones([...timezones, tz]);
    }
    setIsAddOpen(false);
  };

  const removeTimezone = (tz: string) => {
    setTimezones(timezones.filter(t => t !== tz));
  };

  const getTimeInZone = (tz: string) => {
    try {
      const zonedTime = toZonedTime(currentTime, tz);
      return {
        time: format(zonedTime, "h:mm"),
        period: format(zonedTime, "a"),
        date: format(zonedTime, "EEE, d MMM"),
        seconds: format(zonedTime, "ss"),
      };
    } catch {
      return { time: "--:--", period: "", date: "--", seconds: "00" };
    }
  };

  const getDisplayName = (tz: string) => {
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
    return city;
  };

  const getFlag = (tz: string) => {
    const country = timezoneToCountry[tz];
    return country ? getCountryFlag(country) : "";
  };

  const availableTimezones = getTimezones().filter(tz => !timezones.includes(tz));

  if (timezones.length === 0 && officeCountries.length === 0) {
    return null;
  }

  return (
    <div className="px-4 lg:px-6 pb-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {timezones.map((tz, index) => {
          const { time, period, date, seconds } = getTimeInZone(tz);
          const flag = getFlag(tz);
          const isUserTimezone = index === 0;
          
          return (
            <Card
              key={tz}
              className={cn(
                "relative shrink-0 p-3 min-w-[120px] bg-card border-border/50",
                "hover:border-border transition-colors group",
                isUserTimezone && "border-primary/30 bg-primary/5"
              )}
            >
              {!isUserTimezone && (
                <button
                  onClick={() => removeTimezone(tz)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              )}
              
              <div className="flex items-center gap-1.5 mb-1">
                {flag && <span className="text-sm">{flag}</span>}
                <span className="text-[11px] font-medium text-muted-foreground truncate">
                  {getDisplayName(tz)}
                </span>
              </div>
              
              <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-semibold tabular-nums">{time}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{seconds}</span>
                <span className="text-[10px] text-muted-foreground ml-0.5">{period}</span>
              </div>
              
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {date}
              </div>
            </Card>
          );
        })}
        
        {timezones.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Clock className="h-3.5 w-3.5" />
            <span>Add timezones to track</span>
          </div>
        )}

        {timezones.length < MAX_CLOCKS && (
          <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
            <PopoverTrigger asChild>
              <Card className="shrink-0 p-3 min-w-[80px] bg-card border-border/50 border-dashed flex items-center justify-center cursor-pointer hover:border-border hover:bg-accent/50 transition-colors">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </Card>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search timezone..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {availableTimezones.map((tz) => (
                      <CommandItem
                        key={tz}
                        value={formatTimezoneLabel(tz)}
                        onSelect={() => addTimezone(tz)}
                        className="text-xs"
                      >
                        <span className="mr-2">{getFlag(tz)}</span>
                        {formatTimezoneLabel(tz)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
