import { Home, CalendarDays, ScanLine, Sparkles } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { QRScannerDialog } from './dialogs/QRScannerDialog';
import { RemoteCheckInDialog } from './dialogs/RemoteCheckInDialog';
import { MobileMoreMenu } from './MobileMoreMenu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useEmployeeWorkLocation, useHasApprovedWfhToday } from '@/services/useWfh';

interface NavItem {
  icon: React.ElementType | null;
  label: string;
  href?: string;
  action?: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: CalendarDays, label: 'Leave', action: 'leave' },
  { icon: ScanLine, label: 'Check In', action: 'scan' },
  { icon: Sparkles, label: 'Ask AI', href: '/ask-ai' },
  { icon: null, label: 'Profile', action: 'more' },
];

interface MobileBottomNavProps {
  userProfile?: {
    fullName: string;
    position: string;
    avatarUrl: string | null;
    employeeId: string | null;
  } | null;
  isOnline?: boolean;
}

export const MobileBottomNav = ({ userProfile, isOnline = false }: MobileBottomNavProps) => {
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [remoteCheckInOpen, setRemoteCheckInOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);

  // Work location and WFH hooks for smart check-in
  const { data: workLocation } = useEmployeeWorkLocation(employeeId || undefined);
  const { data: hasApprovedWfhToday } = useHasApprovedWfhToday(employeeId || undefined);

  // Determine if user should use remote check-in (no QR scan)
  const shouldUseRemoteCheckIn = workLocation === 'hybrid' || workLocation === 'remote' || 
    (workLocation === 'office' && hasApprovedWfhToday);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!user?.id || !currentOrg?.id) return;
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
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
        .from('attendance_records')
        .select('check_in_time')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      setCheckInTime(data?.check_in_time ? new Date(data.check_in_time) : null);
    };
    fetchActiveSession();
  }, [employeeId, qrScannerOpen]);

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      navigateOrg(item.href);
    } else if (item.action === 'leave') {
      if (employeeId) {
        navigateOrg(`/team/${employeeId}/leave-history`);
      } else {
        navigateOrg('/leave');
      }
    } else if (item.action === 'scan') {
      if (shouldUseRemoteCheckIn) {
        setRemoteCheckInOpen(true);
      } else {
        setQrScannerOpen(true);
      }
    } else if (item.action === 'more') {
      setMoreMenuOpen(true);
    }
  };

  const basePath = orgCode ? `/org/${orgCode}` : '';

  const isActive = (item: NavItem) => {
    if (item.action === 'leave') {
      return location.pathname.includes('/leave-history') || 
             location.pathname.includes('/leave');
    }
    if (item.href) {
      const fullPath = item.href === '/' ? basePath : `${basePath}${item.href}`;
      if (item.href === '/') {
        // Home is active for home page only
        return location.pathname === basePath || location.pathname === `${basePath}/`;
      }
      return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
    }
    return false;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item);
            const isScan = item.action === 'scan';
            const isProfile = item.action === 'more';
            
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all relative',
                  active && 'text-primary',
                  !active && 'text-muted-foreground'
                )}
              >
                {isProfile ? (
                  // Profile avatar with online status
                  <div className="relative">
                    <Avatar className="h-6 w-6 border border-border">
                      <AvatarImage src={userProfile?.avatarUrl || undefined} alt={userProfile?.fullName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold text-[9px]">
                        {userProfile?.fullName ? getInitials(userProfile.fullName) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-card" />
                    )}
                  </div>
                ) : item.icon ? (
                  <item.icon className={cn(
                    'h-5 w-5',
                    active && 'scale-110',
                    isScan && checkInTime && 'text-green-500',
                    item.label === 'Ask AI' && 'text-ai'
                  )} />
                ) : null}
                <span className="text-[10px] font-medium">
                  {isScan && checkInTime ? 'Check Out' : item.label}
                </span>
                {active && !isProfile && (
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

      <RemoteCheckInDialog
        open={remoteCheckInOpen}
        onOpenChange={setRemoteCheckInOpen}
      />
      
      <MobileMoreMenu
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        userProfile={userProfile}
      />
    </>
  );
};
