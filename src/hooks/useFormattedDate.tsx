import { useCallback } from 'react';
import { useTimezone } from './useTimezone';
import { 
  formatDateTime as formatDateTimeUtil, 
  formatDate as formatDateUtil, 
  formatDateRange as formatDateRangeUtil, 
  formatMonthYear as formatMonthYearUtil,
  formatTime as formatTimeUtil
} from '@/lib/utils';

/**
 * Hook that provides timezone-aware date formatting functions.
 * Uses the user's selected timezone from the TimezoneContext.
 */
export const useFormattedDate = () => {
  const { timezone } = useTimezone();

  const formatDateTime = useCallback((date: string | Date, showTimezone?: boolean): string => {
    return formatDateTimeUtil(date, timezone, showTimezone);
  }, [timezone]);

  const formatDate = useCallback((date: string | Date): string => {
    return formatDateUtil(date, timezone);
  }, [timezone]);

  const formatDateRange = useCallback((startDate: string | Date, endDate: string | Date): string => {
    return formatDateRangeUtil(startDate, endDate, timezone);
  }, [timezone]);

  const formatMonthYear = useCallback((date: string | Date): string => {
    return formatMonthYearUtil(date, timezone);
  }, [timezone]);

  const formatTime = useCallback((date: string | Date): string => {
    return formatTimeUtil(date, timezone);
  }, [timezone]);

  return {
    formatDateTime,
    formatDate,
    formatDateRange,
    formatMonthYear,
    formatTime,
    timezone
  };
};
