import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTimezone } from "@/hooks/useTimezone";
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
import {
  TIMEZONE_DATABASE,
  getTimezoneFlag,
  getTimezoneDisplayName,
  getTimezoneOffset,
  getPrimaryTimezoneForCountry,
  searchTimezones,
  formatTimezoneWithFlag,
} from "@/constants/timezones";

interface WorldClockCardsProps {
  officeCountries?: string[];
}

const STORAGE_KEY = "world-clock-timezones";
const MAX_CLOCKS = 7;

export const WorldClockCards = ({ officeCountries = [] }: WorldClockCardsProps) => {
  // Get system timezone from context (read-only, edited from Home page)
  const { timezone: systemTimezone } = useTimezone();
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userTimezone = systemTimezone || browserTimezone;
  
  const [timezones, setTimezones] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter out the user timezone from stored (it will be added dynamically)
        const filtered = parsed.filter((tz: string) => tz !== userTimezone && tz !== browserTimezone);
        return filtered.slice(0, MAX_CLOCKS - 1);
      } catch {
        return [];
      }
    }
    // Default to office timezones using centralized lookup
    const officeTimezones = officeCountries
      .map(country => getPrimaryTimezoneForCountry(country))
      .filter(tz => tz !== 'UTC' && tz !== userTimezone)
      .slice(0, MAX_CLOCKS - 1);
    return [...new Set(officeTimezones)];
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        .map(country => getPrimaryTimezoneForCountry(country))
        .filter(tz => tz !== 'UTC')
        .slice(0, MAX_CLOCKS);
      if (officeTimezones.length > 0) {
        setTimezones([...new Set(officeTimezones)]);
      }
    }
  }, [officeCountries]);

  const addTimezone = (tz: string) => {
    if (timezones.length < MAX_CLOCKS && !timezones.includes(tz) && tz !== userTimezone) {
      setTimezones([...timezones, tz]);
    }
    setIsAddOpen(false);
    setSearchQuery("");
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

  // Get available timezones (filtered by search and excluding already selected)
  const availableTimezones = searchQuery 
    ? searchTimezones(searchQuery).filter(tz => tz.timezone !== userTimezone && !timezones.includes(tz.timezone))
    : TIMEZONE_DATABASE.filter(tz => tz.timezone !== userTimezone && !timezones.includes(tz.timezone));
  
  // Combine user timezone with other timezones for display
  const allTimezones = [userTimezone, ...timezones.filter(tz => tz !== userTimezone)];

  if (allTimezones.length === 0 && officeCountries.length === 0) {
    return null;
  }

  return (
    <div className="px-4 lg:px-6 pb-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allTimezones.map((tz, index) => {
          const { time, period, date, seconds } = getTimeInZone(tz);
          const flag = getTimezoneFlag(tz);
          const displayName = getTimezoneDisplayName(tz);
          const isUserTimezone = index === 0;
          
          return isUserTimezone ? (
            <Card
              key={tz}
              className={cn(
                "relative shrink-0 p-3 min-w-[120px] bg-card border-border/50",
                "border-primary/30 bg-primary/5"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {flag && <span className="text-sm">{flag}</span>}
                <span className="text-[11px] font-medium text-muted-foreground truncate">
                  {displayName}
                </span>
                <span className="text-[9px] text-primary/70 ml-auto">Default</span>
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
          ) : (
            <Card
              key={tz}
              className={cn(
                "relative shrink-0 p-3 min-w-[120px] bg-card border-border/50",
                "hover:border-border transition-colors group"
              )}
            >
              <button
                onClick={() => removeTimezone(tz)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
              
              <div className="flex items-center gap-1.5 mb-1">
                {flag && <span className="text-sm">{flag}</span>}
                <span className="text-[11px] font-medium text-muted-foreground truncate">
                  {displayName}
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
        
        {allTimezones.length < MAX_CLOCKS && (
          <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
            <PopoverTrigger asChild>
              <Card className="shrink-0 p-3 min-w-[80px] bg-card border-border/50 border-dashed flex items-center justify-center cursor-pointer hover:border-border hover:bg-accent/50 transition-colors">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </Card>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Search by city, country..." 
                  className="h-9"
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>No timezone found. Try searching by country or city.</CommandEmpty>
                  <CommandGroup className="max-h-[250px] overflow-auto">
                    {availableTimezones.slice(0, 50).map((tz) => {
                      const flag = tz.countryCode ? getTimezoneFlag(tz.timezone) : '';
                      const offset = getTimezoneOffset(tz.timezone);
                      return (
                        <CommandItem
                          key={tz.timezone}
                          value={tz.timezone}
                          onSelect={() => addTimezone(tz.timezone)}
                          className="text-xs"
                        >
                          <span className="mr-2 text-sm">{flag}</span>
                          <span className="flex-1">{tz.city}</span>
                          <span className="text-muted-foreground ml-2">{offset}</span>
                        </CommandItem>
                      );
                    })}
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
