import { Home, Users, ScanLine, User, Calendar } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { QRScannerDialog } from "./dialogs/QRScannerDialog";
import { AddLeaveRequestDialog } from "./dialogs/AddLeaveRequestDialog";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  action?: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Overview", href: "/" },
  { icon: Users, label: "Directory", href: "/team" },
  { icon: ScanLine, label: "Check In", action: "scan" },
  { icon: Calendar, label: "Cal", href: "/calendar" },
  { icon: User, label: "Profile", action: "profile" },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!user?.id || !currentOrg?.id) return;
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();
      setEmployeeId(data?.id || null);
    };
    loadEmployee();
  }, [user?.id, currentOrg?.id]);

  // Check for active check-in session
  useEffect(() => {
    const fetchActiveSession = async () => {
      if (!employeeId) return;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from("attendance_records")
        .select("check_in_time")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .is("check_out_time", null)
        .order("check_in_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCheckInTime(data?.check_in_time ? new Date(data.check_in_time) : null);
    };
    fetchActiveSession();
  }, [employeeId, qrScannerOpen]);

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      navigate(item.href);
    } else if (item.action === "scan") {
      setQrScannerOpen(true);
    } else if (item.action === "leave") {
      setLeaveDialogOpen(true);
    } else if (item.action === "profile" && employeeId) {
      navigate(`/team/${employeeId}`);
    }
  };

  const isActive = (item: NavItem) => {
    if (item.href) {
      if (item.href === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(item.href);
    }
    if (item.action === "profile") {
      return location.pathname.includes(`/team/${employeeId}`);
    }
    return false;
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item);
            const isScan = item.action === "scan";
            
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                disabled={item.action === "leave" && !employeeId}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all relative",
                  active && "text-primary",
                  !active && "text-muted-foreground",
                  isScan && "relative"
                )}
              >
                {isScan ? (
                  <div className={cn(
                    "flex items-center justify-center w-12 h-12 -mt-6 rounded-full shadow-lg transition-all",
                    checkInTime 
                      ? "bg-green-500 text-white animate-pulse" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    <item.icon className="h-6 w-6" />
                  </div>
                ) : (
                  <item.icon className={cn("h-5 w-5", active && "scale-110")} />
                )}
                <span className={cn(
                  "text-[10px] font-medium",
                  isScan && "mt-1"
                )}>
                  {isScan && checkInTime ? "Check Out" : item.label}
                </span>
                {active && !isScan && (
                  <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <QRScannerDialog
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
      />
      
      {employeeId && (
        <AddLeaveRequestDialog
          employeeId={employeeId}
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
        />
      )}
    </>
  );
};
