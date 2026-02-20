import { useRef, useState, useEffect } from 'react';
import { Home, Users, MessageSquare, BookOpen, CheckSquare, Briefcase, Target, Sparkles, Inbox, Phone } from 'lucide-react';
import { OrgLink } from './OrgLink';
import { cn } from '@/lib/utils';
import { useLocation, useParams } from 'react-router-dom';
import { useFeatureFlags, FeatureName } from '@/hooks/useFeatureFlags';
import { useUserRole } from '@/hooks/useUserRole';
import { useTotalUnreadCount } from '@/services/chat';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface TopNavProps {
  isAdmin: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{className?: string;}>;
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
{ name: 'Tasks', href: '/tasks', icon: CheckSquare, adminOnly: false, featureFlag: 'tasks' },
{ name: 'CRM', href: '/crm', icon: Briefcase, adminOnly: false, featureFlag: 'crm' },
{ name: 'Inbox', href: '/crm/inbox', icon: Inbox, adminOnly: false, featureFlag: 'crm' },
{ name: 'Calls', href: '/crm/calls', icon: Phone, adminOnly: false, featureFlag: 'crm' }];

const EXPANDED_ITEM_WIDTH = 90;

export const TopNav = ({ isAdmin }: TopNavProps) => {
  const { isEnabled } = useFeatureFlags();
  const { isOwner, isHR } = useUserRole();
  const location = useLocation();
  const { orgCode } = useParams<{orgCode: string;}>();
  const { data: chatUnreadCount = 0 } = useTotalUnreadCount();
  const navRef = useRef<HTMLElement>(null);
  const [isCompact, setIsCompact] = useState(false);

  // Filter items based on feature flags, admin-only, and owner-only
  const visibleItems = mainNavItems.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.featureFlag && !isEnabled(item.featureFlag)) return false;
    if (item.adminOnly) {
      const hasAccess = isAdmin || item.hrAllowed && isHR;
      if (!hasAccess) return false;
    }
    return true;
  });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const threshold = visibleItems.length * EXPANDED_ITEM_WIDTH;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsCompact(entry.contentRect.width < threshold);
      }
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, [visibleItems.length]);

  const isActive = (href: string) => {
    const basePath = orgCode ? `/org/${orgCode}` : '';
    const fullPath = href === '/' ? basePath || '/' : `${basePath}${href}`;

    if (href === '/') {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    if (href === '/team') {
      return location.pathname.startsWith(`${basePath}/team`) ||
      location.pathname === `${basePath}/calendar` ||
      location.pathname === `${basePath}/leave-history` ||
      location.pathname === `${basePath}/attendance-history` ||
      location.pathname === `${basePath}/payroll` ||
      location.pathname.startsWith(`${basePath}/payroll/`);
    }
    if (href === '/settings') {
      return location.pathname.startsWith(`${basePath}/settings`);
    }
    if (href === '/kpi-dashboard') {
      return location.pathname === `${basePath}/kpi-dashboard` ||
      location.pathname.startsWith(`${basePath}/kpi-dashboard/`);
    }
    // CRM should not match inbox/calls sub-sections
    if (href === '/crm') {
      const path = location.pathname;
      const crmBase = `${basePath}/crm`;
      if (path.startsWith(`${crmBase}/inbox`) || path.startsWith(`${crmBase}/calls`)) return false;
      return path === crmBase || path.startsWith(`${crmBase}/`);
    }
    return location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
  };

  const showLabel = (item: NavItem, active: boolean) => {
    if (!isCompact) return true; // expanded: always show label
    return active; // compact: only active shows label
  };

  return (
    <TooltipProvider delayDuration={300}>
      <nav ref={navRef} className="flex items-center gap-1 tour-feature-overview">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          const labelVisible = showLabel(item, active);
          const iconOnly = !labelVisible;

          const link = (
            <OrgLink
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                labelVisible
                  ? 'gap-2 px-3 py-2'
                  : 'h-9 w-9 justify-center relative',
                active
                  ? 'bg-secondary text-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-secondary hover:text-foreground',
                item.isStatic && 'opacity-70',
                item.name === 'Team' && 'tour-team-directory',
                item.name === 'Wiki' && 'tour-wiki-nav',
                item.name === 'Chat' && 'tour-chat-nav'
              )}>
              <item.icon className="h-4 w-4" />
              {labelVisible && item.name}
              {item.name === 'Chat' && chatUnreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className={cn(
                    "h-5 min-w-[20px] px-1.5 text-[10px] font-semibold",
                    iconOnly && "absolute -top-1 -right-1"
                  )}>
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </Badge>
              )}
            </OrgLink>
          );

          if (iconOnly) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="bottom">{item.name}</TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>
    </TooltipProvider>
  );
};

export { mainNavItems };