/**
 * Shared hook to check if the current user has connected Google Calendar.
 * Re-exports useGoogleCalendarConnect for convenience.
 */

import { useIntegrationSettings } from '@/services/useScheduler';
import { useGoogleCalendarConnect } from '@/services/useGoogleCalendar';

export const useGoogleCalendarStatus = () => {
  const { data: settings, isLoading } = useIntegrationSettings();

  const isGoogleConnected = settings?.google_calendar_connected === true;

  return { isGoogleConnected, isLoading };
};

export { useGoogleCalendarConnect };
