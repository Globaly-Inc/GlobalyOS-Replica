import { ReactNode, useRef, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Users, 
  BarChart3,
  ArrowLeft,
  FileText,
  CreditCard,
  FlaskConical,
  Headphones,
  AlertCircle,
  LayoutTemplate,
  UserPlus,
  Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/super-admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/super-admin/organisations", label: "Organisations", icon: Building2 },
  { path: "/super-admin/users", label: "Users", icon: Users },
  { path: "/super-admin/templates", label: "Templates", icon: LayoutTemplate },
  { path: "/super-admin/features", label: "Features", icon: Flag },
  { path: "/super-admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { path: "/super-admin/customer-success", label: "Support", icon: Headphones },
  { path: "/super-admin/error-logs", label: "Errors", icon: AlertCircle },
  { path: "/super-admin/hiring-logs", label: "Jobs", icon: UserPlus },
  { path: "/super-admin/testing", label: "Testing", icon: FlaskConical },
  { path: "/super-admin/blog", label: "Blog", icon: FileText },
];

const EXPANDED_ITEM_WIDTH = 90;

const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const threshold = navItems.length * EXPANDED_ITEM_WIDTH;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsCompact(entry.contentRect.width < threshold);
      }
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  const showLabel = (active: boolean) => {
    if (!isCompact) return true;
    return active;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to App
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-semibold text-foreground">
                Super Admin Portal
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <nav className="sticky top-16 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <TooltipProvider delayDuration={300}>
            <div ref={navRef} className="flex items-center gap-1 h-12">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const labelVisible = showLabel(active);
                const iconOnly = !labelVisible;

                const link = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center rounded-md text-sm font-medium transition-colors",
                      labelVisible
                        ? "gap-2 px-3 py-2"
                        : "h-9 w-9 justify-center",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {labelVisible && item.label}
                  </Link>
                );

                if (iconOnly) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="bottom">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return link;
              })}
            </div>
          </TooltipProvider>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default SuperAdminLayout;
