import { Inbox, Radio, FileText, BarChart3, Phone, Activity } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const inboxSubNavItems = [
  { name: 'Inbox', href: '/crm/inbox', icon: Inbox, exact: true },
  { name: 'Channels', href: '/crm/inbox/channels', icon: Radio },
  { name: 'Numbers', href: '/crm/inbox/numbers', icon: Phone, requiresTelephony: true },
  { name: 'Usage', href: '/crm/inbox/usage', icon: Activity, requiresTelephony: true },
  { name: 'Templates', href: '/crm/inbox/templates', icon: FileText },
  { name: 'Analytics', href: '/crm/inbox/analytics', icon: BarChart3 },
];

export const InboxSubNav = () => {
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { isEnabled } = useFeatureFlags();

  const basePath = orgCode ? `/org/${orgCode}` : '';
  const isInboxSection = location.pathname.includes('/crm/inbox');

  if (!isInboxSection) return null;

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {inboxSubNavItems.filter((item) => !(item as any).requiresTelephony || isEnabled('telephony')).map((item) => {
            const fullPath = `${basePath}${item.href}`;
            const isActive = item.exact
              ? location.pathname === fullPath
              : location.pathname.startsWith(fullPath);

            return (
              <OrgLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 border-transparent whitespace-nowrap',
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
