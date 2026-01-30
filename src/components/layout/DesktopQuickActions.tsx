import { Bell, CalendarPlus, ScanLine, Search, Settings, Clock, LogOut, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GlobalAskAI } from "@/components/GlobalAskAI";
import { GetHelpButton } from "@/components/GetHelpButton";
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { UserProfile } from '@/hooks/useLayoutState';

interface DesktopQuickActionsProps {
  userProfile: UserProfile | null;
  elapsedTime: string;
  unreadCount: number;
  isOnline: boolean;
  currentOrgId: string | undefined;
  shouldUseRemoteCheckIn: boolean;
  onCheckIn: () => void;
  onLeaveRequest: () => void;
  onSearch: () => void;
  onViewProfile: () => void;
  onSignOut: () => void;
}

const getInitials = (name: string) => {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export const DesktopQuickActions = ({
  userProfile,
  elapsedTime,
  unreadCount,
  isOnline,
  currentOrgId,
  shouldUseRemoteCheckIn,
  onCheckIn,
  onLeaveRequest,
  onSearch,
  onViewProfile,
  onSignOut,
}: DesktopQuickActionsProps) => {
  const { navigateOrg } = useOrgNavigation();
  const { isEnabled } = useFeatureFlags();

  return (
    <div className="hidden md:flex md:items-center md:gap-2 tour-quick-actions">
      {elapsedTime && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
          <Clock className="h-4 w-4" />
          <span>{elapsedTime}</span>
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={onSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Search <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd></p>
        </TooltipContent>
      </Tooltip>
      {isEnabled('ask-ai') && <GlobalAskAI organizationId={currentOrgId} />}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="h-10 w-10 tour-check-in"
            onClick={onCheckIn}
            disabled={!userProfile?.employeeId}
          >
            <ScanLine className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{shouldUseRemoteCheckIn ? 'Remote Check-In' : 'Quick Check-In'}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="h-10 w-10"
            onClick={onLeaveRequest}
            disabled={!userProfile?.employeeId}
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Request Leave</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="h-10 w-10 relative"
            onClick={() => navigateOrg('/notifications')}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Notifications</p>
        </TooltipContent>
      </Tooltip>
      {(userProfile?.role === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'hr') && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="h-10 w-10 tour-settings-menu"
              onClick={() => navigateOrg('/settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Organization Settings</p>
          </TooltipContent>
        </Tooltip>
      )}
      <GetHelpButton />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="h-10 w-10 relative tour-profile-avatar"
            onClick={onViewProfile}
            disabled={!userProfile?.employeeId}
          >
            <Avatar className="h-7 w-7 border-2 border-primary/10">
              <AvatarImage src={userProfile?.avatarUrl || undefined} alt={userProfile?.fullName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold text-xs">
                {userProfile?.fullName ? getInitials(userProfile.fullName) : "U"}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{userProfile?.fullName || "Profile"}</p>
        </TooltipContent>
      </Tooltip>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onSignOut}
              className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Logout</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
