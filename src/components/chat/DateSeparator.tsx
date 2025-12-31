import { format, isToday, isYesterday } from "date-fns";

interface DateSeparatorProps {
  date: string;
}

const DateSeparator = ({ date }: DateSeparatorProps) => {
  const dateObj = new Date(date);
  
  const getLabel = () => {
    if (isToday(dateObj)) return "Today";
    if (isYesterday(dateObj)) return "Yesterday";
    return format(dateObj, "EEEE, MMMM d");
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
