import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, User, Users, Clock, Palmtree, Calendar, BookOpen, 
  Settings, LogOut, BarChart3, ChevronRight, Moon, Sun 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { useUserRole } from "@/hooks/useUserRole";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface MobileMoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    fullName: string;
    position: string;
    avatarUrl: string | null;
    employeeId: string | null;
  } | null;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  action?: () => void;
  adminOnly?: boolean;
  hrOnly?: boolean;
}

export const MobileMoreMenu = ({ open, onOpenChange, userProfile }: MobileMoreMenuProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { navigateOrg } = useOrgNavigation();
  const { isAdmin, isHR } = useUserRole();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems: MenuItem[] = [
    { icon: User, label: "My Profile", action: () => userProfile?.employeeId && navigateOrg(`/team/${userProfile.employeeId}`) },
    { icon: Users, label: "Team Directory", href: "/team" },
    { icon: BarChart3, label: "KPI Dashboard", href: "/kpi-dashboard" },
    { icon: Calendar, label: "Team Calendar", href: "/calendar" },
    { icon: Palmtree, label: "Leave History", href: "/leave-history" },
    { icon: Clock, label: "Attendance History", href: "/attendance-history" },
    { icon: BookOpen, label: "Wiki", href: "/wiki" },
  ];

  const adminItems: MenuItem[] = [
    { icon: Settings, label: "Settings", href: "/settings", hrOnly: true },
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.href) {
      navigateOrg(item.href);
    }
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background animate-in slide-in-from-bottom duration-300 md:hidden">
      <div className="flex flex-col h-full safe-area-top safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-lg font-semibold">More</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Profile Card */}
        {userProfile && (
          <div 
            className="mx-4 mt-4 p-4 rounded-xl bg-muted/50 flex items-center gap-3 active:bg-muted transition-colors"
            onClick={() => {
              if (userProfile.employeeId) {
                navigateOrg(`/team/${userProfile.employeeId}`);
                onOpenChange(false);
              }
            }}
          >
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={userProfile.avatarUrl || undefined} alt={userProfile.fullName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold">
                {getInitials(userProfile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{userProfile.fullName}</p>
              <p className="text-sm text-muted-foreground truncate">{userProfile.position}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleMenuClick(item)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Admin/HR Items */}
          {(isAdmin || isHR) && (
            <>
              <Separator className="my-4" />
              <div className="space-y-1">
                {adminItems
                  .filter(item => {
                    if (item.adminOnly) return isAdmin;
                    if (item.hrOnly) return isAdmin || isHR;
                    return true;
                  })
                  .map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleMenuClick(item)}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
              </div>
            </>
          )}

          {/* Theme Toggle */}
          <Separator className="my-4" />
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="font-medium">Dark Mode</span>
            </div>
            <Switch 
              checked={theme === 'dark'} 
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          {/* Logout */}
          <Separator className="my-4" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left hover:bg-destructive/10 active:bg-destructive/20 text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
