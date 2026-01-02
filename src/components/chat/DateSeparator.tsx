import { isToday, isYesterday } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { useTimezone } from "@/hooks/useTimezone";

interface DateSeparatorProps {
  date: string;
}

const DateSeparator = ({ date }: DateSeparatorProps) => {
  const { timezone } = useTimezone();
  const dateObj = new Date(date);
  const zonedDate = toZonedTime(dateObj, timezone);
  
  const getLabel = () => {
    if (isToday(zonedDate)) return "Today";
    if (isYesterday(zonedDate)) return "Yesterday";
    return formatInTimeZone(dateObj, timezone, "EEEE, MMMM d");
  };

  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground">
        {getLabel()}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};

export default DateSeparator;
