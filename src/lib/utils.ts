import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities for consistent date display across the system
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "d MMM yyyy - h:mm a");
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "d MMM yyyy");
}

export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = format(new Date(startDate), "d MMM yyyy");
  const end = format(new Date(endDate), "d MMM yyyy");
  return start === end ? start : `${start} - ${end}`;
}

export function formatMonthYear(date: string | Date): string {
  return format(new Date(date), "MMM yyyy");
}
