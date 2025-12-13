import { format, isToday, isYesterday } from "date-fns";

interface DateSeparatorProps {
  date: string;
}

const DateSeparator = ({ date }: DateSeparatorProps) => {
  const dateObj = new Date(date);
  
  const getLabel = () => {
    if (isToday(dateObj)) return "Today";
    if (isYesterday(dateObj)) return "Yesterday";
    return format(dateObj, "MMMM d, yyyy");
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-full mx-2">
        {getLabel()}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};

export default DateSeparator;
