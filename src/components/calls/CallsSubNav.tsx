import { Phone, Mic, PhoneCall, Users, Headphones, Activity, LayoutDashboard } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const callsSubNavItems = [
  { name: 'Numbers', href: '/crm/calls', icon: Phone, exact: true },
  { name: 'Recordings', href: '/crm/calls/recordings', icon: Mic },
  { name: 'Campaigns', href: '/crm/calls/campaigns', icon: PhoneCall },
  { name: 'Queues', href: '/crm/calls/queues', icon: Users },
  { name: 'Monitoring', href: '/crm/calls/monitoring', icon: Headphones },
  { name: 'Usage', href: '/crm/calls/usage', icon: Activity },
];

export const CallsSubNav = () => {
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();

  const basePath = orgCode ? `/org/${orgCode}` : '';
  const isCallsSection = location.pathname.includes('/crm/calls');

  if (!isCallsSection) return null;

  return (
    <div className="border-b border-border bg-card/80 backdrop-blur">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {callsSubNavItems.map((item) => {
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
