import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to validate date
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

// Date formatting utilities for consistent date display across the system
// All functions accept an optional timezone parameter for timezone-aware formatting
export function formatDateTime(date: string | Date | null | undefined, timezone?: string, showTimezone?: boolean): string {
  if (!date) return '';
  const dateObj = new Date(date);
  if (!isValidDate(dateObj)) return '';
  
  if (timezone) {
    const formatted = formatInTimeZone(dateObj, timezone, "d MMM yyyy - h:mm a");
    if (showTimezone) {
      const tzAbbr = formatInTimeZone(dateObj, timezone, "zzz");
      return `${formatted} ${tzAbbr}`;
    }
    return formatted;
  }
  return format(dateObj, "d MMM yyyy - h:mm a");
}

export function formatDate(date: string | Date | null | undefined, timezone?: string): string {
  if (!date) return '';
  const dateObj = new Date(date);
  if (!isValidDate(dateObj)) return '';
  
  if (timezone) {
    return formatInTimeZone(dateObj, timezone, "d MMM yyyy");
  }
  return format(dateObj, "d MMM yyyy");
}

export function formatDateRange(startDate: string | Date | null | undefined, endDate: string | Date | null | undefined, timezone?: string): string {
  if (!startDate || !endDate) return '';
  const startObj = new Date(startDate);
  const endObj = new Date(endDate);
  if (!isValidDate(startObj) || !isValidDate(endObj)) return '';
  
  const start = timezone 
    ? formatInTimeZone(startObj, timezone, "d MMM yyyy")
    : format(startObj, "d MMM yyyy");
  const end = timezone 
    ? formatInTimeZone(endObj, timezone, "d MMM yyyy")
    : format(endObj, "d MMM yyyy");
  return start === end ? start : `${start} - ${end}`;
}

export function formatMonthYear(date: string | Date | null | undefined, timezone?: string): string {
  if (!date) return '';
  const dateObj = new Date(date);
  if (!isValidDate(dateObj)) return '';
  
  if (timezone) {
    return formatInTimeZone(dateObj, timezone, "MMM yyyy");
  }
  return format(dateObj, "MMM yyyy");
}

export function formatTime(date: string | Date | null | undefined, timezone?: string): string {
  if (!date) return '';
  const dateObj = new Date(date);
  if (!isValidDate(dateObj)) return '';
  
  if (timezone) {
    return formatInTimeZone(dateObj, timezone, "h:mm a");
  }
  return format(dateObj, "h:mm a");
}
