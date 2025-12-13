import { Home, Users, Target, Calendar } from "lucide-react";
import { NavLink } from "./NavLink";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const teamSubNavItems = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Directory", href: "/team", icon: Users },
  { name: "KPIs", href: "/kpi-dashboard", icon: Target },
  { name: "Team Cal", href: "/calendar", icon: Calendar },
];

export const SubNav = () => {
  const location = useLocation();
  
  // Show sub-nav on Team-related pages (including home which is now Overview)
  const isTeamSection = 
    location.pathname === "/" ||
    location.pathname === "/team" || 
    location.pathname.startsWith("/team/") ||
    location.pathname === "/kpi-dashboard" ||
    location.pathname === "/calendar";

  if (!isTeamSection) return null;

  return (
    <div className="border-b border-border bg-card/50">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {teamSubNavItems.map((item) => {
            const isActive = 
              item.href === "/" 
                ? location.pathname === "/"
                : item.href === "/team" 
                  ? location.pathname === "/team" || (location.pathname.startsWith("/team/") && location.pathname !== "/team/bulk-import")
                  : location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 border-transparent whitespace-nowrap",
                  "text-muted-foreground hover:text-foreground hover:border-border",
                  isActive && "text-foreground border-primary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export { teamSubNavItems };
