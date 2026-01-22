import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getZodiacSign, ZodiacSign } from '@/lib/zodiac';
import { HoroscopeData, HoroscopeAspect, HoroscopeApiResponse } from '@/types/horoscope';

interface UseHoroscopeResult {
  zodiac: ZodiacSign | null;
  horoscope: HoroscopeData | null;
  isLoading: boolean;
  error: string | null;
  hasDateOfBirth: boolean;
}

export function useHoroscope(dateOfBirth: string | null): UseHoroscopeResult {
  const [zodiac, setZodiac] = useState<ZodiacSign | null>(null);
  const [horoscope, setHoroscope] = useState<HoroscopeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateOfBirth) {
      setZodiac(null);
      setHoroscope(null);
      return;
    }
    
    const sign = getZodiacSign(dateOfBirth);
    setZodiac(sign);
    
    if (sign) {
      fetchHoroscope(sign);
    }
  }, [dateOfBirth]);

  const fetchHoroscope = async (sign: ZodiacSign) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke<HoroscopeApiResponse>('daily-horoscope', {
        body: { zodiacSign: sign.sign }
      });

      if (fnError) {
        console.error('Horoscope fetch error:', fnError);
        setError('Could not load horoscope');
        return;
      }

      if (data?.aspects && data.aspects.length > 0 && data?.summaryParagraph) {
        // Structured horoscope data available
        setHoroscope({
          sign: sign.sign,
          symbol: sign.symbol,
          dateRange: sign.dateRange,
          element: sign.element,
          date: new Date().toISOString().split('T')[0],
          title: data.title,
          aspects: data.aspects,
          summaryParagraph: data.summaryParagraph,
          legacyContent: data.horoscope
        });
      } else if (data?.horoscope) {
        // Fallback for legacy format (plain text only)
        setHoroscope({
          sign: sign.sign,
          symbol: sign.symbol,
          dateRange: sign.dateRange,
          element: sign.element,
          date: new Date().toISOString().split('T')[0],
          aspects: [],
          summaryParagraph: data.horoscope
        });
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError('No horoscope available');
      }
    } catch (err) {
      console.error('Error fetching horoscope:', err);
      setError('Could not load horoscope');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    zodiac,
    horoscope,
    isLoading,
    error,
    hasDateOfBirth: !!dateOfBirth
  };
}
