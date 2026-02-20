import { BarChart3, FileText, Receipt, Landmark, LayoutDashboard, Settings } from 'lucide-react';
import { OrgLink } from '../OrgLink';
import { useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const accountingSubNavItems = [
  { name: 'Dashboard', href: '/accounting', icon: LayoutDashboard },
  { name: 'Invoices', href: '/accounting/invoices', icon: FileText },
  { name: 'Bills', href: '/accounting/bills', icon: Receipt },
  { name: 'Banking', href: '/accounting/banking', icon: Landmark },
  { name: 'Reports', href: '/accounting/reports', icon: BarChart3 },
  { name: 'Settings', href: '/accounting/settings', icon: Settings },
];

export const AccountingSubNav = () => {
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  const basePath = orgCode ? `/org/${orgCode}` : '';

  const isAccountingSection = location.pathname.startsWith(`${basePath}/accounting`);
  if (!isAccountingSection) return null;

  return (
    <div className="hidden md:block sticky top-16 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container px-4 md:px-8">
        <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
          {accountingSubNavItems.map((item) => {
            const fullPath = `${basePath}${item.href}`;
            const isActive =
              item.href === '/accounting'
                ? location.pathname === fullPath
                : location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);

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
