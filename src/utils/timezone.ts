import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

// Custom timezone abbreviation mapping for common timezones
const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  // Asia
  'Asia/Kathmandu': 'NPT',
  'Asia/Kolkata': 'IST',
  'Asia/Tokyo': 'JST',
  'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Singapore': 'SGT',
  'Asia/Dubai': 'GST',
  'Asia/Seoul': 'KST',
  'Asia/Bangkok': 'ICT',
  'Asia/Jakarta': 'WIB',
  'Asia/Manila': 'PHT',
  
  // Australia
  'Australia/Sydney': 'AEST',
  'Australia/Melbourne': 'AEST',
  'Australia/Brisbane': 'AEST',
  'Australia/Perth': 'AWST',
  'Australia/Adelaide': 'ACST',
  'Australia/Darwin': 'ACST',
  
  // Europe
  'Europe/London': 'GMT',
  'Europe/Paris': 'CET',
  'Europe/Berlin': 'CET',
  'Europe/Amsterdam': 'CET',
  'Europe/Rome': 'CET',
  'Europe/Madrid': 'CET',
  'Europe/Moscow': 'MSK',
  
  // Americas
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Denver': 'MST',
  'America/Los_Angeles': 'PST',
  'America/Toronto': 'EST',
  'America/Vancouver': 'PST',
  'America/Sao_Paulo': 'BRT',
  'America/Mexico_City': 'CST',
  
  // Pacific
  'Pacific/Auckland': 'NZST',
  'Pacific/Fiji': 'FJT',
  'Pacific/Honolulu': 'HST',
  
  // Other
  'UTC': 'UTC',
  'Etc/UTC': 'UTC',
};

/**
 * Converts a local date and time string to a UTC ISO string for database storage.
 * 
 * @param date - Date string in "yyyy-MM-dd" format
 * @param time - Time string in "HH:mm" format
 * @param timezone - IANA timezone string (e.g., "Asia/Kathmandu")
 * @returns ISO string in UTC for database storage
 * 
 * Example: toUTCDateTime("2024-01-15", "09:15", "Asia/Kathmandu") 
 * returns "2024-01-15T03:30:00.000Z" (UTC)
 */
export const toUTCDateTime = (date: string, time: string, timezone: string): string => {
  // Create a date string that represents the local time in the given timezone
  const localDateTimeStr = `${date}T${time}:00`;
  
  // fromZonedTime converts a date that's displayed in a timezone to UTC
  // It interprets the input as if it were in the specified timezone
  const utcDate = fromZonedTime(localDateTimeStr, timezone);
  
  return utcDate.toISOString();
};

/**
 * Converts a UTC datetime string from database to local time in the given timezone.
 * Returns an object with date and time strings.
 * 
 * @param utcDateTime - ISO datetime string from database (UTC)
 * @param timezone - IANA timezone string (e.g., "Asia/Kathmandu")
 * @returns Object with date ("yyyy-MM-dd") and time ("HH:mm") in local timezone
 * 
 * Example: fromUTCDateTime("2024-01-15T03:30:00.000Z", "Asia/Kathmandu")
 * returns { date: "2024-01-15", time: "09:15" }
 */
export const fromUTCDateTime = (
  utcDateTime: string, 
  timezone: string
): { date: string; time: string } => {
  // Parse the UTC datetime
  const utcDate = parseISO(utcDateTime);
  
  // Convert to the target timezone
  const zonedDate = toZonedTime(utcDate, timezone);
  
  return {
    date: format(zonedDate, 'yyyy-MM-dd'),
    time: format(zonedDate, 'HH:mm'),
  };
};

/**
 * Formats a UTC datetime string in the given timezone with custom format.
 * 
 * @param utcDateTime - ISO datetime string from database (UTC)
 * @param timezone - IANA timezone string (e.g., "Asia/Kathmandu")
 * @param formatStr - date-fns format string (e.g., "h:mm a", "yyyy-MM-dd HH:mm")
 * @returns Formatted string in the local timezone
 * 
 * Example: formatTimeInTimezone("2024-01-15T03:30:00.000Z", "Asia/Kathmandu", "h:mm a")
 * returns "9:15 AM"
 */
export const formatTimeInTimezone = (
  utcDateTime: string,
  timezone: string,
  formatStr: string
): string => {
  return formatInTimeZone(utcDateTime, timezone, formatStr);
};

/**
 * Gets just the time portion from a UTC datetime in a specific timezone.
 * 
 * @param utcDateTime - ISO datetime string from database (UTC)
 * @param timezone - IANA timezone string
 * @returns Time string in "HH:mm" format in local timezone
 */
export const getTimeInTimezone = (utcDateTime: string, timezone: string): string => {
  return formatInTimeZone(utcDateTime, timezone, 'HH:mm');
};

/**
 * Gets just the date portion from a UTC datetime in a specific timezone.
 * 
 * @param utcDateTime - ISO datetime string from database (UTC)
 * @param timezone - IANA timezone string
 * @returns Date string in "yyyy-MM-dd" format in local timezone
 */
export const getDateInTimezone = (utcDateTime: string, timezone: string): string => {
  return formatInTimeZone(utcDateTime, timezone, 'yyyy-MM-dd');
};

/**
 * Gets the timezone abbreviation for a given timezone and date.
 * 
 * @param timezone - IANA timezone string (e.g., "Asia/Kathmandu")
 * @param date - Optional date to get abbreviation for (affects DST)
 * @returns Timezone abbreviation (e.g., "NPT", "AEDT", "EST")
 * 
 * Example: getTimezoneAbbreviation("Asia/Kathmandu") returns "NPT"
 */
export const getTimezoneAbbreviation = (
  timezone: string,
  date: Date = new Date()
): string => {
  // Check custom mapping first for proper abbreviations
  if (TIMEZONE_ABBREVIATIONS[timezone]) {
    return TIMEZONE_ABBREVIATIONS[timezone];
  }
  
  // Fall back to library output for unmapped timezones
  return formatInTimeZone(date, timezone, 'zzz');
};
