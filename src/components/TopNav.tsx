import { Home, Users, MessageSquare, BookOpen, CheckSquare, Briefcase, Target, Sparkles, UserPlus } from 'lucide-react';
import { OrgLink } from './OrgLink';
import { cn } from '@/lib/utils';
import { useLocation, useParams } from 'react-router-dom';
import { useFeatureFlags, FeatureName } from '@/hooks/useFeatureFlags';
import { useUserRole } from '@/hooks/useUserRole';
import { useTotalUnreadCount } from '@/services/chat';
import { Badge } from '@/components/ui/badge';

interface TopNavProps {
  isAdmin: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly: boolean;
  ownerOnly?: boolean;
  hrAllowed?: boolean;
  isStatic?: boolean;
  featureFlag?: FeatureName;
}

const mainNavItems: NavItem[] = [
  { name: 'Home', href: '/', icon: Home, adminOnly: false },
  { name: 'Team', href: '/team', icon: Users, adminOnly: false },
  { name: 'KPIs', href: '/kpi-dashboard', icon: Target, adminOnly: false },
  { name: 'Wiki', href: '/wiki', icon: BookOpen, adminOnly: false },
  { name: 'Chat', href: '/chat', icon: MessageSquare, adminOnly: false, featureFlag: 'chat' },
  { name: 'Ask AI', href: '/ask-ai', icon: Sparkles, adminOnly: false, featureFlag: 'ask-ai' },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, adminOnly: false, ownerOnly: true, isStatic: true, featureFlag: 'tasks' },
  { name: 'CRM', href: '/crm', icon: Briefcase, adminOnly: false, ownerOnly: true, isStatic: true, featureFlag: 'crm' },
  { name: 'Hiring', href: '/hiring', icon: UserPlus, adminOnly: true, hrAllowed: true, featureFlag: 'hiring' },
];

export const TopNav = ({ isAdmin }: TopNavProps) => {
  const { isEnabled } = useFeatureFlags();
  const { isOwner, isHR } = useUserRole();
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { data: chatUnreadCount = 0 } = useTotalUnreadCount();

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
    // If admin only, check admin status (or HR if hrAllowed)
    if (item.adminOnly) {
      const hasAccess = isAdmin || (item.hrAllowed && isHR);
      if (!hasAccess) {
        return false;
      }
    }
    return true;
  });

  const isActive = (href: string) => {
    const basePath = orgCode ? `/org/${orgCode}` : '';
    const fullPath = href === '/' ? basePath || '/' : `${basePath}${href}`;
    
    if (href === '/') {
      // Home is active only for root path
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    if (href === '/team') {
      // Team is active for /team/*, /calendar, etc. (not KPIs - they have their own nav item now)
      return location.pathname.startsWith(`${basePath}/team`) ||
             location.pathname === `${basePath}/calendar` ||
             location.pathname === `${basePath}/leave-history` ||
             location.pathname === `${basePath}/attendance-history` ||
             location.pathname === `${basePath}/payroll` ||
             location.pathname.startsWith(`${basePath}/payroll/`);
    }
    if (href === '/kpi-dashboard') {
      return location.pathname === `${basePath}/kpi-dashboard` ||
             location.pathname.startsWith(`${basePath}/kpi-dashboard/`);
    }
    if (href === '/hiring') {
      return location.pathname === `${basePath}/hiring` ||
             location.pathname.startsWith(`${basePath}/hiring/`);
    }
    return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
  };

  return (
    <nav className="flex items-center space-x-0.5 tour-feature-overview">
      {visibleItems.map((item) => (
        <OrgLink
          key={item.name}
          to={item.href}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            item.isStatic && 'opacity-70',
            isActive(item.href) && 'bg-secondary text-foreground',
            item.name === 'Team' && 'tour-team-directory',
            item.name === 'Wiki' && 'tour-wiki-nav',
            item.name === 'Chat' && 'tour-chat-nav'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.name}
          {item.name === 'Chat' && chatUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="h-5 min-w-[20px] px-1.5 text-[10px] font-semibold"
            >
              {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
            </Badge>
          )}
        </OrgLink>
      ))}
    </nav>
  );
};

export { mainNavItems };
