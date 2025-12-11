import { useEffect, useState } from "react";
import { NavLink } from "./NavLink";
import { Users, Home, Menu, LogOut, User, CalendarPlus, SquarePen } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";
import { AddLeaveRequestDialog } from "./dialogs/AddLeaveRequestDialog";
import { PostUpdateDialog } from "./dialogs/PostUpdateDialog";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Team", href: "/team", icon: Users },
];

interface UserProfile {
  fullName: string;
  position: string;
  avatarUrl: string | null;
  employeeId: string | null;
  role: string | null;
}

const getRoleConfig = (role?: string | null) => {
  switch (role) {
    case 'admin':
      return { label: 'Admin', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'hr':
      return { label: 'HR', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    default:
      return { label: 'Team Member', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  }
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const { currentOrg } = useOrganization();

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id || !currentOrg) return;

      // Get profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      // Get employee data for current org
      const { data: employee } = await supabase
        .from("employees")
        .select("id, position")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      // Get user role for current org
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      if (profile) {
        setUserProfile({
          fullName: profile.full_name,
          position: employee?.position || "",
          avatarUrl: profile.avatar_url,
          employeeId: employee?.id || null,
          role: roleData?.role || null,
        });
      }
    };

    loadUserProfile();
  }, [user?.id, currentOrg?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleViewProfile = () => {
    if (userProfile?.employeeId) {
      navigate(`/team/${userProfile.employeeId}`);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const roleConfig = getRoleConfig(userProfile?.role);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center px-4 md:px-8">
          <div className="mr-4 flex items-center">
            <button 
              onClick={() => navigate("/landing")}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark hover:opacity-90 transition-opacity"
            >
              <Users className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>

          {(userProfile?.role === 'admin' || userProfile?.role === 'hr') && (
            <div className="hidden md:block mr-4">
              <OrganizationSwitcher />
            </div>
          )}
          
          <nav className="hidden md:flex md:flex-1 md:items-center md:space-x-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeClassName="bg-secondary text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex md:items-center md:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setPostDialogOpen(true)}
                  disabled={!userProfile?.employeeId}
                >
                  <SquarePen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Post</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setLeaveDialogOpen(true)}
                  disabled={!userProfile?.employeeId}
                >
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Request Leave</p>
              </TooltipContent>
            </Tooltip>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 px-2 h-10 hover:bg-secondary"
              onClick={handleViewProfile}
              disabled={!userProfile?.employeeId}
            >
              <Avatar className="h-7 w-7 border-2 border-primary/10">
                <AvatarImage src={userProfile?.avatarUrl || undefined} alt={userProfile?.fullName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold text-xs">
                  {userProfile?.fullName ? getInitials(userProfile.fullName) : user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start gap-0">
                <span className="text-sm font-medium text-foreground leading-tight">
                  {userProfile?.fullName || "Loading..."}
                </span>
                <Badge className={`text-[10px] px-1.5 py-0 h-4 font-normal ${roleConfig.className} border-0`}>
                  {roleConfig.label}
                </Badge>
              </div>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSignOut}
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

          {/* Mobile Navigation */}
          <div className="flex flex-1 items-center justify-end md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex items-center gap-3 border-b border-border pb-4 pt-2">
                  <Avatar className="h-10 w-10 border-2 border-primary/10">
                    <AvatarImage src={userProfile?.avatarUrl || undefined} alt={userProfile?.fullName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold">
                      {userProfile?.fullName ? getInitials(userProfile.fullName) : user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {userProfile?.fullName || "Loading..."}
                    </span>
                    <Badge className={`text-[10px] px-1.5 py-0 h-4 font-normal mt-1 w-fit ${roleConfig.className} border-0`}>
                      {roleConfig.label}
                    </Badge>
                  </div>
                </div>
                <nav className="flex flex-col space-y-2 pt-4">
                  {navigation.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeClassName="bg-secondary text-foreground"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </NavLink>
                  ))}
                  <div className="border-t border-border pt-2 mt-2">
                    {userProfile?.employeeId && (
                      <button
                        onClick={handleViewProfile}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <User className="h-5 w-5" />
                        View Profile
                      </button>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-secondary"
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container px-4 pt-2 pb-8 md:px-8">{children}</main>

      {userProfile?.employeeId && (
        <>
          <AddLeaveRequestDialog
            employeeId={userProfile.employeeId}
            open={leaveDialogOpen}
            onOpenChange={setLeaveDialogOpen}
          />
          <PostUpdateDialog
            open={postDialogOpen}
            onOpenChange={setPostDialogOpen}
            canPostAnnouncement={userProfile?.role === 'admin' || userProfile?.role === 'hr'}
          />
        </>
      )}
    </div>
  );
};
