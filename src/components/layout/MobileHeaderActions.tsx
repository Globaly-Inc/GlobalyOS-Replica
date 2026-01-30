import { Calendar, BookOpen, BarChart3, ClipboardCheck, Search, Bell, LifeBuoy, Clock } from 'lucide-react';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';

interface MobileHeaderActionsProps {
  elapsedTime: string;
  unreadCount: number;
  onSearch: () => void;
  onGetHelp: () => void;
}

export const MobileHeaderActions = ({
  elapsedTime,
  unreadCount,
  onSearch,
  onGetHelp,
}: MobileHeaderActionsProps) => {
  const { navigateOrg } = useOrgNavigation();

  return (
    <div className="flex flex-1 items-center justify-between md:hidden">
      {/* Left Side - Quick Access Icons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigateOrg("/calendar")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 hover:bg-muted transition-colors active:scale-95"
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <button
          onClick={() => navigateOrg("/wiki")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 hover:bg-muted transition-colors active:scale-95"
        >
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <button
          onClick={() => navigateOrg("/kpi-dashboard")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 hover:bg-muted transition-colors active:scale-95"
        >
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <button
          onClick={() => navigateOrg("/attendance-history")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 hover:bg-muted transition-colors active:scale-95"
        >
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
        </button>

        {elapsedTime && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-[11px] font-medium ml-0.5">
            <Clock className="h-3 w-3" />
            <span>{elapsedTime}</span>
          </div>
        )}
      </div>

      {/* Right Side - Search, Help, Notifications */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSearch}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 hover:bg-muted transition-colors active:scale-95"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <button
          onClick={onGetHelp}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 hover:bg-muted transition-colors active:scale-95"
        >
          <LifeBuoy className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <button 
          onClick={() => navigateOrg('/notifications')}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/80 hover:bg-muted transition-colors active:scale-95"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
