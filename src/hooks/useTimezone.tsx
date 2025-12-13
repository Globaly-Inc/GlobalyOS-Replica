import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (tz: string) => void;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

const TIMEZONE_STORAGE_KEY = 'user-timezone';

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

export const TimezoneProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
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

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, isLoading }}>
      {children}
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
