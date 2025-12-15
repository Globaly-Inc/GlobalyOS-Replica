import { useMemo } from "react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";

export const useRelativeTime = () => {
  const formatRelativeTime = useMemo(() => {
    return (dateString: string | undefined | null): string => {
      if (!dateString) return "";
      
      try {
        const date = parseISO(dateString);
        if (!isValid(date)) return "";
        
        return formatDistanceToNow(date, { addSuffix: true });
      } catch {
        return "";
      }
    };
  }, []);

  const getShortRelativeTime = useMemo(() => {
    return (dateString: string | undefined | null): string => {
      if (!dateString) return "";
      
      try {
        const date = parseISO(dateString);
        if (!isValid(date)) return "";
        
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
      } catch {
        return "";
      }
    };
  }, []);

  return { formatRelativeTime, getShortRelativeTime };
};
