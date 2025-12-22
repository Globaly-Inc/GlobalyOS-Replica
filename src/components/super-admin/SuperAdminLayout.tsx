import { ReactNode } from "react";
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
  Headphones
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/super-admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/super-admin/organisations", label: "Organisations", icon: Building2 },
  { path: "/super-admin/users", label: "Users", icon: Users },
  { path: "/super-admin/payments", label: "Subscription", icon: CreditCard },
  { path: "/super-admin/customer-success", label: "Customer Success", icon: Headphones },
  { path: "/super-admin/testing", label: "Testing", icon: FlaskConical },
  { path: "/super-admin/blog", label: "Blog", icon: FileText },
];

const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
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
          <div className="flex items-center gap-1 h-12">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
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
