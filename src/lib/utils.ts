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
    const formatted = formatInTimeZone(dateObj, timezone, "dd MMM yyyy - h:mm a");
    if (showTimezone) {
      const tzAbbr = formatInTimeZone(dateObj, timezone, "zzz");
      return `${formatted} ${tzAbbr}`;
    }
    return formatted;
  }
  return format(dateObj, "dd MMM yyyy - h:mm a");
}

export function formatDate(date: string | Date | null | undefined, timezone?: string): string {
  if (!date) return '';
  const dateObj = new Date(date);
  if (!isValidDate(dateObj)) return '';
  
  if (timezone) {
    return formatInTimeZone(dateObj, timezone, "dd MMM yyyy");
  }
  return format(dateObj, "dd MMM yyyy");
}

export function formatDateRange(startDate: string | Date | null | undefined, endDate: string | Date | null | undefined, timezone?: string): string {
  if (!startDate || !endDate) return '';
  const startObj = new Date(startDate);
  const endObj = new Date(endDate);
  if (!isValidDate(startObj) || !isValidDate(endObj)) return '';
  
  const start = timezone 
    ? formatInTimeZone(startObj, timezone, "dd MMM yyyy")
    : format(startObj, "dd MMM yyyy");
  const end = timezone 
    ? formatInTimeZone(endObj, timezone, "dd MMM yyyy")
    : format(endObj, "dd MMM yyyy");
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

// Format a date as relative time (e.g., "2d ago", "1w ago")
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const dateObj = new Date(date);
  if (!isValidDate(dateObj)) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}
