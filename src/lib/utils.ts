import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities for consistent date display across the system
// All functions accept an optional timezone parameter for timezone-aware formatting
export function formatDateTime(date: string | Date, timezone?: string): string {
  if (timezone) {
    return formatInTimeZone(new Date(date), timezone, "d MMM yyyy - h:mm a");
  }
  return format(new Date(date), "d MMM yyyy - h:mm a");
}

export function formatDate(date: string | Date, timezone?: string): string {
  if (timezone) {
    return formatInTimeZone(new Date(date), timezone, "d MMM yyyy");
  }
  return format(new Date(date), "d MMM yyyy");
}

export function formatDateRange(startDate: string | Date, endDate: string | Date, timezone?: string): string {
  const start = timezone 
    ? formatInTimeZone(new Date(startDate), timezone, "d MMM yyyy")
    : format(new Date(startDate), "d MMM yyyy");
  const end = timezone 
    ? formatInTimeZone(new Date(endDate), timezone, "d MMM yyyy")
    : format(new Date(endDate), "d MMM yyyy");
  return start === end ? start : `${start} - ${end}`;
}

export function formatMonthYear(date: string | Date, timezone?: string): string {
  if (timezone) {
    return formatInTimeZone(new Date(date), timezone, "MMM yyyy");
  }
  return format(new Date(date), "MMM yyyy");
}

export function formatTime(date: string | Date, timezone?: string): string {
  if (timezone) {
    return formatInTimeZone(new Date(date), timezone, "h:mm a");
  }
  return format(new Date(date), "h:mm a");
}
