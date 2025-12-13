import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
  unreadCount?: number;
}

const ScrollToBottom = ({ visible, onClick, unreadCount = 0 }: ScrollToBottomProps) => {
  if (!visible) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="rounded-full shadow-lg flex items-center gap-2 pr-4"
      >
        <ArrowDown className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span>{unreadCount} new message{unreadCount > 1 ? 's' : ''}</span>
        ) : (
          <span>Jump to bottom</span>
        )}
      </Button>
    </div>
  );
};

export default ScrollToBottom;
