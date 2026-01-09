import { Users, Target, Calendar, CalendarDays, Clock, DollarSign, GitBranch } from 'lucide-react';
import { OrgLink } from './OrgLink';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

interface SubNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const teamSubNavItems: SubNavItem[] = [
  { name: 'Directory', href: '/team', icon: Users },
  { name: 'KPIs', href: '/kpi-dashboard', icon: Target },
  { name: 'Team Cal', href: '/calendar', icon: Calendar },
  { name: 'Leave', href: '/leave-history', icon: CalendarDays },
  { name: 'Attendance', href: '/attendance-history', icon: Clock },
  { name: 'Workflows', href: '/workflows', icon: GitBranch, adminOnly: true },
  { name: 'Payroll', href: '/payroll', icon: DollarSign, adminOnly: true },
];

export const SubNav = () => {
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { isOwner, isAdmin, isHR } = useUserRole();
  
  const basePath = orgCode ? `/org/${orgCode}` : '';
  const canAccessAdmin = isOwner || isAdmin || isHR;
  
  // Filter items based on role
  const visibleItems = teamSubNavItems.filter(item => {
    if (item.adminOnly && !canAccessAdmin) return false;
    return true;
  });
  
  // Show sub-nav on Team-related pages (not on Home which is now separate)
  const isTeamSection = 
    location.pathname === `${basePath}/team` || 
    location.pathname.startsWith(`${basePath}/team/`) ||
    location.pathname === `${basePath}/kpi-dashboard` ||
    location.pathname.startsWith(`${basePath}/kpi-dashboard/`) ||
    location.pathname === `${basePath}/calendar` ||
    location.pathname === `${basePath}/leave-history` ||
    location.pathname === `${basePath}/attendance-history` ||
    location.pathname === `${basePath}/workflows` ||
    location.pathname.startsWith(`${basePath}/workflows/`) ||
    location.pathname === `${basePath}/payroll` ||
    location.pathname.startsWith(`${basePath}/payroll/`);

  if (!isTeamSection) return null;

  return (
    <div className="hidden md:block sticky top-16 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {visibleItems.map((item) => {
            const fullPath = `${basePath}${item.href}`;
            
            const isActive = 
              item.href === '/team' 
                ? location.pathname === `${basePath}/team` || 
                  (location.pathname.startsWith(`${basePath}/team/`) && 
                   !location.pathname.includes('/bulk-import'))
                : location.pathname === fullPath || 
                  location.pathname.startsWith(`${fullPath}/`);
            
            return (
              <OrgLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 border-transparent whitespace-nowrap',
                  'text-muted-foreground hover:text-foreground hover:border-border',
                  isActive && 'text-foreground border-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </OrgLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export { teamSubNavItems };
