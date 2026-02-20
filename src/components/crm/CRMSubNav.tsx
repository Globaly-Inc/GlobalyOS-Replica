import { Users, Building2, Calendar, Mail, MessageCircle } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const crmSubNavItems = [
  { name: 'Contacts', href: '/crm/contacts', icon: Users },
  { name: 'Companies', href: '/crm/companies', icon: Building2 },
  { name: 'Campaigns', href: '/crm/campaigns', icon: Mail },
  { name: 'WhatsApp', href: '/crm/whatsapp', icon: MessageCircle, featureFlag: 'whatsapp' as const, hideWhenFlag: 'omnichannel_inbox' as const },
  { name: 'Scheduler', href: '/crm/scheduler', icon: Calendar },
];

export const CRMSubNav = () => {
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { isEnabled } = useFeatureFlags();

  const basePath = orgCode ? `/org/${orgCode}` : '';
  const isCRMSection = location.pathname.startsWith(`${basePath}/crm`) &&
    !location.pathname.startsWith(`${basePath}/crm/inbox`) &&
    !location.pathname.startsWith(`${basePath}/crm/calls`);

  if (!isCRMSection) return null;

  const visibleItems = crmSubNavItems.filter(item => {
    if ('featureFlag' in item && item.featureFlag && !isEnabled(item.featureFlag)) return false;
    if ('hideWhenFlag' in item && item.hideWhenFlag && isEnabled(item.hideWhenFlag)) return false;
    return true;
  });

  return (
    <div className="hidden md:block sticky top-16 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {visibleItems.map((item) => {
            const fullPath = `${basePath}${item.href}`;
            const isActive =
              location.pathname === fullPath ||
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
