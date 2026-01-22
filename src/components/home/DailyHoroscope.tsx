import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getZodiacSign, ZodiacSign } from '@/lib/zodiac';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface DailyHoroscopeProps {
  dateOfBirth: string | null;
  variant?: 'default' | 'hero';
}

export function DailyHoroscope({ dateOfBirth, variant = 'default' }: DailyHoroscopeProps) {
  const [zodiac, setZodiac] = useState<ZodiacSign | null>(null);
  const [horoscope, setHoroscope] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateOfBirth) return;
    
    const sign = getZodiacSign(dateOfBirth);
    setZodiac(sign);
    
    if (sign) {
      fetchHoroscope(sign.sign);
    }
  }, [dateOfBirth]);

  const fetchHoroscope = async (signName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('daily-horoscope', {
        body: { zodiacSign: signName }
      });

      if (fnError) {
        console.error('Horoscope fetch error:', fnError);
        setError('Could not load horoscope');
        return;
      }

      if (data?.horoscope) {
        setHoroscope(data.horoscope);
      } else if (data?.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching horoscope:', err);
      setError('Could not load horoscope');
    } finally {
      setLoading(false);
    }
  };

  if (!dateOfBirth || !zodiac) {
    return null;
  }

  // Hero variant - card style with zodiac info in one row, horoscope text below
  if (variant === 'hero') {
    return (
      <div className="text-right">
        {/* Row 1: Zodiac card with symbol, name, date, element */}
        <div className="inline-flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2">
          <span className="text-2xl">{zodiac.symbol}</span>
          <div className="text-left">
            <p className="text-sm font-medium text-white flex items-center gap-1">
              {zodiac.sign}
              <Sparkles className="h-3 w-3 text-yellow-300" />
            </p>
            <p className="text-xs text-white/70">
              {zodiac.dateRange} • {zodiac.element}
            </p>
          </div>
        </div>
        
        {/* Row 2: Horoscope text */}
        <div className="mt-2 text-sm text-white/80 leading-relaxed max-w-md ml-auto">
          {loading ? (
            <span className="flex items-center justify-end gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </span>
          ) : error ? (
            <span className="italic">{error}</span>
          ) : horoscope ? (
            <p className="line-clamp-2">{horoscope}</p>
          ) : (
            <span className="italic">No horoscope available</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 pl-4 border-l border-white/20">
      <HoverCard>
        <HoverCardTrigger asChild>
          <button className="flex items-start gap-2 text-left hover:opacity-80 transition-opacity max-w-sm">
            <span className="text-2xl">{zodiac.symbol}</span>
            <div className="min-w-0">
              <p className="text-sm text-white/90 font-medium flex items-center gap-1">
                {zodiac.sign}
                <Sparkles className="h-3 w-3 text-yellow-300" />
              </p>
              {loading ? (
                <div className="flex items-center gap-1 text-xs text-white/60">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <p className="text-xs text-white/60 italic">{error}</p>
              ) : horoscope ? (
                <p className="text-xs text-white/70 line-clamp-3">{horoscope}</p>
              ) : (
                <p className="text-xs text-white/60">{zodiac.element} Sign</p>
              )}
            </div>
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" align="end">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{zodiac.symbol}</span>
              <div>
                <h4 className="font-medium">{zodiac.sign}</h4>
                <p className="text-xs text-muted-foreground">{zodiac.dateRange} • {zodiac.element} Sign</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Today's Work Horoscope</p>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : error ? (
                <p className="text-sm text-muted-foreground italic">{error}</p>
              ) : horoscope ? (
                <p className="text-sm">{horoscope}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No horoscope available</p>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
