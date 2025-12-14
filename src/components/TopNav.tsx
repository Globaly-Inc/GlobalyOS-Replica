import { Users, MessageSquare, BookOpen, CheckSquare, Briefcase } from 'lucide-react';
import { OrgLink } from './OrgLink';
import { cn } from '@/lib/utils';
import { useLocation, useParams } from 'react-router-dom';

interface TopNavProps {
  isAdmin: boolean;
}

const mainNavItems = [
  { name: 'Team', href: '/', icon: Users, adminOnly: false },
  { name: 'Chat', href: '/chat', icon: MessageSquare, adminOnly: true }, // Admin only
  { name: 'Wiki', href: '/wiki', icon: BookOpen, adminOnly: false },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, adminOnly: true, isStatic: true },
  { name: 'CRM', href: '/crm', icon: Briefcase, adminOnly: true, isStatic: true },
];

export const TopNav = ({ isAdmin }: TopNavProps) => {
  const visibleItems = mainNavItems.filter(item => !item.adminOnly || isAdmin);
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();

  const isActive = (href: string) => {
    const basePath = orgCode ? `/org/${orgCode}` : '';
    const fullPath = href === '/' ? basePath || '/' : `${basePath}${href}`;
    
    if (href === '/') {
      // Team is active for root, /team/*, /kpi-dashboard, /calendar, etc.
      return location.pathname === basePath || 
             location.pathname === `${basePath}/` ||
             location.pathname.startsWith(`${basePath}/team`) ||
             location.pathname === `${basePath}/kpi-dashboard` ||
             location.pathname === `${basePath}/calendar` ||
             location.pathname === `${basePath}/leave-history` ||
             location.pathname === `${basePath}/attendance-history`;
    }
    return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
  };

  return (
    <nav className="flex items-center space-x-1">
      {visibleItems.map((item) => (
        <OrgLink
          key={item.name}
          to={item.href}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            item.isStatic && 'opacity-70',
            isActive(item.href) && 'bg-secondary text-foreground'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </OrgLink>
      ))}
    </nav>
  );
};

export { mainNavItems };
