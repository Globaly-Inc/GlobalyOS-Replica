import { Users, MessageCircle, FileText, Megaphone, Workflow, Settings, LayoutDashboard, ClipboardList } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const whatsappSubNavItems = [
  { name: 'Overview', href: '/crm/whatsapp', icon: LayoutDashboard, exact: true },
  { name: 'Inbox', href: '/crm/whatsapp/inbox', icon: MessageCircle },
  { name: 'Templates', href: '/crm/whatsapp/templates', icon: FileText },
  { name: 'Campaigns', href: '/crm/whatsapp/campaigns', icon: Megaphone },
  { name: 'Automations', href: '/crm/whatsapp/automations', icon: Workflow },
  { name: 'Flows', href: '/crm/whatsapp/flows', icon: ClipboardList },
  { name: 'Contacts', href: '/crm/whatsapp/contacts', icon: Users },
  { name: 'Settings', href: '/crm/whatsapp/settings', icon: Settings },
];

export const WhatsAppSubNav = () => {
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  const basePath = orgCode ? `/org/${orgCode}` : '';

  return (
    <div className="border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {whatsappSubNavItems.map((item) => {
            const fullPath = `${basePath}${item.href}`;
            const isActive = item.exact
              ? location.pathname === fullPath
              : location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);

            return (
              <OrgLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 border-transparent whitespace-nowrap',
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
