import { Briefcase, Users, Settings, TrendingUp, LayoutDashboard } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HiringNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const hiringNavItems: HiringNavItem[] = [
  { name: 'Dashboard', href: '/hiring', icon: LayoutDashboard },
  { name: 'Jobs', href: '/hiring/jobs', icon: Briefcase },
  { name: 'Candidates', href: '/hiring/candidates', icon: Users },
  { name: 'Analytics', href: '/hiring/analytics', icon: TrendingUp },
  { name: 'Settings', href: '/hiring/settings', icon: Settings },
];

export const HiringSubNav = () => {
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  
  const basePath = orgCode ? `/org/${orgCode}` : '';
  
  // Check if we're in the hiring section
  const isHiringSection = 
    location.pathname === `${basePath}/hiring` ||
    location.pathname.startsWith(`${basePath}/hiring/`);
  
  if (!isHiringSection) return null;
  
  return (
    <div className="hidden md:block sticky top-16 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {hiringNavItems.map((item) => {
            const fullPath = `${basePath}${item.href}`;
            
            let isActive = false;
            if (item.href === '/hiring') {
              // Dashboard is active only for exact match
              isActive = location.pathname === `${basePath}/hiring`;
            } else if (item.href === '/hiring/jobs') {
              // Jobs is active for /hiring/jobs and /hiring/jobs/*
              isActive = location.pathname === `${basePath}/hiring/jobs` ||
                (location.pathname.startsWith(`${basePath}/hiring/jobs/`) && 
                 !location.pathname.includes('/applications/'));
            } else {
              isActive = location.pathname === fullPath ||
                location.pathname.startsWith(`${fullPath}/`);
            }
            
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

export { hiringNavItems };
