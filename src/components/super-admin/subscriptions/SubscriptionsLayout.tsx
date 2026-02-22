import { ReactNode } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Layers, Users, Receipt, RefreshCw,
  TrendingDown, Tag, BarChart2, Sparkles,
} from 'lucide-react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';

const smsNavItems = [
  { path: '/super-admin/subscriptions', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/super-admin/subscriptions/plans', label: 'Plans & Pricing', icon: Layers },
  { path: '/super-admin/subscriptions/subscribers', label: 'Subscribers', icon: Users },
  { path: '/super-admin/subscriptions/billing', label: 'Billing', icon: Receipt },
  { path: '/super-admin/subscriptions/dunning', label: 'Dunning', icon: RefreshCw },
  { path: '/super-admin/subscriptions/churn', label: 'Churn', icon: TrendingDown },
  { path: '/super-admin/subscriptions/coupons', label: 'Coupons', icon: Tag },
  { path: '/super-admin/subscriptions/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/super-admin/subscriptions/ai-insights', label: 'AI Insights', icon: Sparkles },
];

interface Props {
  children?: ReactNode;
}

const SubscriptionsLayout = ({ children }: Props) => {
  const location = useLocation();

  const isActive = (item: typeof smsNavItems[number]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <SuperAdminLayout>
      <div className="flex gap-6 min-h-[calc(100vh-10rem)]">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <nav className="sticky top-36 space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Subscriptions
            </h3>
            {smsNavItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {children || <Outlet />}
        </main>
      </div>
    </SuperAdminLayout>
  );
};

export default SubscriptionsLayout;
