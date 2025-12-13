import { Home, Users, Target, Calendar, CalendarDays, Clock } from 'lucide-react';
import { OrgLink } from './OrgLink';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const teamSubNavItems = [
  { name: 'Overview', href: '/', icon: Home },
  { name: 'Directory', href: '/team', icon: Users },
  { name: 'KPIs', href: '/kpi-dashboard', icon: Target },
  { name: 'Team Cal', href: '/calendar', icon: Calendar },
  { name: 'Leave', href: '/leave-history', icon: CalendarDays },
  { name: 'Attendance', href: '/attendance-history', icon: Clock },
];

export const SubNav = () => {
  const location = useLocation();
  const { orgId } = useParams<{ orgId: string }>();
  
  const basePath = orgId ? `/org/${orgId}` : '';
  
  // Show sub-nav on Team-related pages (including home which is now Overview)
  const isTeamSection = 
    location.pathname === basePath ||
    location.pathname === `${basePath}/` ||
    location.pathname === `${basePath}/team` || 
    location.pathname.startsWith(`${basePath}/team/`) ||
    location.pathname === `${basePath}/kpi-dashboard` ||
    location.pathname === `${basePath}/calendar` ||
    location.pathname === `${basePath}/leave-history` ||
    location.pathname === `${basePath}/attendance-history`;

  if (!isTeamSection) return null;

  return (
    <div className="hidden md:block border-b border-border bg-card/50">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {teamSubNavItems.map((item) => {
            const fullPath = item.href === '/' 
              ? basePath || '/'
              : `${basePath}${item.href}`;
            
            const isActive = 
              item.href === '/' 
                ? location.pathname === basePath || location.pathname === `${basePath}/`
                : item.href === '/team' 
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
