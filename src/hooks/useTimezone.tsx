import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Globe, MapPin } from 'lucide-react';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (tz: string) => void;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

const TIMEZONE_STORAGE_KEY = 'user-timezone';
const TIMEZONE_PROMPT_DISMISSED_KEY = 'timezone-prompt-dismissed';

// Get browser's default timezone
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

// Get all available timezones
export const getTimezones = (): string[] => {
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'America/Honolulu',
    'America/Toronto',
    'America/Vancouver',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Buenos_Aires',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Vienna',
    'Europe/Stockholm',
    'Europe/Warsaw',
    'Europe/Moscow',
    'Europe/Istanbul',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Kathmandu',
    'Asia/Dhaka',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Jakarta',
    'Asia/Manila',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Perth',
    'Australia/Brisbane',
    'Pacific/Auckland',
    'Pacific/Fiji',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',
    'Africa/Nairobi',
  ].sort();
};

// Format timezone for display (e.g., "Asia/Kathmandu" -> "Asia/Kathmandu (UTC+5:45)")
export const formatTimezoneLabel = (tz: string): string => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    const offset = offsetPart?.value || '';
    return `${tz.replace(/_/g, ' ')} (${offset})`;
  } catch {
    return tz;
  }
};

// Format timezone city name for display
const formatTimezoneCity = (tz: string): string => {
  return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
};

export const TimezoneProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showTimezonePrompt, setShowTimezonePrompt] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  
  // Initialize with localStorage or browser timezone
  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
      if (stored) return stored;
    }
    return getBrowserTimezone();
  });

  // Fetch timezone from database when user is authenticated
  useEffect(() => {
    const fetchTimezone = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('id', user.id)
          .single();

        if (!error && data?.timezone) {
          setTimezoneState(data.timezone);
          localStorage.setItem(TIMEZONE_STORAGE_KEY, data.timezone);
        }
      } catch (err) {
        console.error('Error fetching timezone:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimezone();
  }, [user?.id]);

  // Detect timezone change when browser timezone differs from saved
  useEffect(() => {
    if (isLoading) return;
    
    const browserTz = getBrowserTimezone();
    const savedTz = timezone;
    const dismissedKey = `${TIMEZONE_PROMPT_DISMISSED_KEY}-${browserTz}`;
    const wasDismissed = localStorage.getItem(dismissedKey);
    
    // Show prompt if browser timezone differs from saved and user hasn't dismissed this specific prompt
    if (browserTz !== savedTz && !wasDismissed) {
      setDetectedTimezone(browserTz);
      setShowTimezonePrompt(true);
    }
  }, [isLoading, timezone]);

  const setTimezone = useCallback(async (tz: string) => {
    setTimezoneState(tz);
    localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);

    // Save to database if user is authenticated
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ timezone: tz })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error saving timezone:', err);
      }
    }
  }, [user?.id]);

  const handleAcceptNewTimezone = () => {
    if (detectedTimezone) {
      setTimezone(detectedTimezone);
    }
    setShowTimezonePrompt(false);
    setDetectedTimezone(null);
  };

  const handleDismissPrompt = () => {
    // Remember that user dismissed this specific timezone prompt
    if (detectedTimezone) {
      localStorage.setItem(`${TIMEZONE_PROMPT_DISMISSED_KEY}-${detectedTimezone}`, 'true');
    }
    setShowTimezonePrompt(false);
    setDetectedTimezone(null);
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, isLoading }}>
      {children}
      
      <AlertDialog open={showTimezonePrompt} onOpenChange={setShowTimezonePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Timezone Change Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Your device timezone appears to be different from your saved preference. Would you like to update it?
                </p>
                <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium text-foreground">{formatTimezoneCity(timezone)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Detected:</span>
                    <span className="font-medium text-foreground">{detectedTimezone ? formatTimezoneCity(detectedTimezone) : ''}</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissPrompt}>
              Keep Current
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptNewTimezone}>
              Update Timezone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TimezoneContext.Provider>
  );
};

export const useTimezone = (): TimezoneContextType => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};
