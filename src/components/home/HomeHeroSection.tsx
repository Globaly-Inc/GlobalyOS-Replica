import { useState, useEffect, lazy, Suspense } from "react";
import { Globe, Cloud, Sparkles, Pencil, Sun, Sunrise, Moon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatInTimeZone } from "date-fns-tz";
import { useTimezone, getTimezones, formatTimezoneLabel } from "@/hooks/useTimezone";
import { WeatherDisplay } from "@/components/home/WeatherDisplay";
import { HeroWorldClocks } from "@/components/home/HeroWorldClocks";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/hooks/useHomeData";

const HoroscopeWidget = lazy(() => import("@/components/home/HoroscopeWidget").then(m => ({ default: m.HoroscopeWidget })));

type HeroWidget = 'weather' | 'horoscope' | 'worldtime';
const HERO_WIDGET_STORAGE_KEY = 'hero-widget-selection';

interface HomeHeroSectionProps {
  currentUserName: string | null;
  currentUserBirthday: string | null;
  weather: WeatherData | null;
}

export const HomeHeroSection = ({ currentUserName, currentUserBirthday, weather }: HomeHeroSectionProps) => {
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { timezone, setTimezone } = useTimezone();
  
  const [selectedWidget, setSelectedWidget] = useState<HeroWidget>(() => {
    const saved = localStorage.getItem(HERO_WIDGET_STORAGE_KEY);
    if (saved && ['weather', 'horoscope', 'worldtime'].includes(saved)) {
      return saved as HeroWidget;
    }
    return 'weather';
  });

  useEffect(() => {
    localStorage.setItem(HERO_WIDGET_STORAGE_KEY, selectedWidget);
  }, [selectedWidget]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = new Date().getHours();
  let greeting = "Good evening";
  let TimeIcon = Moon;
  if (hour < 12) {
    greeting = "Good morning";
    TimeIcon = Sunrise;
  } else if (hour < 17) {
    greeting = "Good afternoon";
    TimeIcon = Sun;
  }

  return (
    <div className="relative overflow-hidden rounded-xl p-6 shadow-lg animate-fade-in" style={{
      background: 'linear-gradient(135deg, hsl(270 60% 25%) 0%, hsl(280 70% 40%) 35%, hsl(290 80% 50%) 65%, hsl(300 85% 55%) 100%)',
      animation: 'fade-in 0.3s ease-out'
    }}>
      {/* Grain overlay */}
      <div 
        className="absolute inset-0 opacity-70 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='6' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Greeting, Date/Time, Timezone */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-semibold text-white drop-shadow-sm">
            {greeting}{currentUserName ? `, ${currentUserName}` : ""}
          </h1>
          <p className="text-sm text-white/80 mt-1">
            {formatInTimeZone(currentTime, timezone, "EEEE, dd MMM yyyy")} • {formatInTimeZone(currentTime, timezone, "h:mm a")}
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
        
        {/* Right: Widget Content + Vertical Toggle */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex-1 md:min-w-[280px] lg:min-w-[380px]">
            <div key={selectedWidget} className="animate-fade-in">
              {selectedWidget === 'weather' && weather && (
                <WeatherDisplay weather={weather} />
              )}
              {selectedWidget === 'weather' && !weather && (
                <div className="text-sm text-white/60 text-right">
                  Loading weather...
                </div>
              )}
              {selectedWidget === 'horoscope' && (
                <Suspense fallback={<div className="text-sm text-white/60">Loading...</div>}>
                  <HoroscopeWidget dateOfBirth={currentUserBirthday} userName={currentUserName} />
                </Suspense>
              )}
              {selectedWidget === 'worldtime' && (
                <HeroWorldClocks officeCountries={[]} />
              )}
            </div>
          </div>
          
          {/* Widget Toggle Buttons */}
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-col gap-1 bg-white/10 rounded-xl p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelectedWidget('weather')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      selectedWidget === 'weather' 
                        ? "bg-white/25 shadow-sm" 
                        : "hover:bg-white/10"
                    )}
                  >
                    <Cloud className="h-4 w-4 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-popover text-popover-foreground">
                  Weather
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelectedWidget('horoscope')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      selectedWidget === 'horoscope' 
                        ? "bg-white/25 shadow-sm" 
                        : "hover:bg-white/10"
                    )}
                  >
                    <Sparkles className="h-4 w-4 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-popover text-popover-foreground">
                  Horoscope
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelectedWidget('worldtime')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      selectedWidget === 'worldtime' 
                        ? "bg-white/25 shadow-sm" 
                        : "hover:bg-white/10"
                    )}
                  >
                    <Globe className="h-4 w-4 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-popover text-popover-foreground">
                  World Time
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
