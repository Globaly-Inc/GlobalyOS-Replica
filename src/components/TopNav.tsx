import { Users, MessageSquare, BookOpen, CheckSquare, Briefcase } from 'lucide-react';
import { OrgLink } from './OrgLink';
import { cn } from '@/lib/utils';
import { useLocation, useParams } from 'react-router-dom';
import { useFeatureFlags, FeatureName } from '@/hooks/useFeatureFlags';
import { useUserRole } from '@/hooks/useUserRole';

interface TopNavProps {
  isAdmin: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly: boolean;
  ownerOnly?: boolean;
  isStatic?: boolean;
  featureFlag?: FeatureName;
}

const mainNavItems: NavItem[] = [
  { name: 'Team', href: '/', icon: Users, adminOnly: false },
  { name: 'Wiki', href: '/wiki', icon: BookOpen, adminOnly: false },
  { name: 'Chat', href: '/chat', icon: MessageSquare, adminOnly: false, ownerOnly: true, featureFlag: 'chat' },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, adminOnly: false, ownerOnly: true, isStatic: true, featureFlag: 'tasks' },
  { name: 'CRM', href: '/crm', icon: Briefcase, adminOnly: false, ownerOnly: true, isStatic: true, featureFlag: 'crm' },
];

export const TopNav = ({ isAdmin }: TopNavProps) => {
  const { isEnabled } = useFeatureFlags();
  const { isOwner } = useUserRole();
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();

  // Filter items based on feature flags, admin-only, and owner-only
  const visibleItems = mainNavItems.filter(item => {
    // If owner only, check owner status
    if (item.ownerOnly && !isOwner) {
      return false;
    }
    // If item has a feature flag, check if it's enabled
    if (item.featureFlag && !isEnabled(item.featureFlag)) {
      return false;
    }
    // If admin only, check admin status
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    return true;
  });

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
    <nav className="flex items-center space-x-1 tour-feature-overview">
      {visibleItems.map((item) => (
        <OrgLink
          key={item.name}
          to={item.href}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            item.isStatic && 'opacity-70',
            isActive(item.href) && 'bg-secondary text-foreground',
            item.name === 'Team' && 'tour-team-directory',
            item.name === 'Wiki' && 'tour-wiki-nav',
            item.name === 'Chat' && 'tour-chat-nav'
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
