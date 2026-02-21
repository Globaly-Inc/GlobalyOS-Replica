import { useState, useEffect } from 'react';
import { Outlet, Link, useParams, useLocation } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { LayoutDashboard, FolderOpen, MessageSquare, Bell, User, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface PortalBranding {
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
}

export const PortalLayout = () => {
  const { user, signOut } = usePortalAuth();
  const { orgCode } = useParams<{ orgCode: string }>();
  const location = useLocation();
  const [branding, setBranding] = useState<PortalBranding>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/portal-api?action=check-portal&orgSlug=${orgCode}`);
        const data = await res.json();
        if (data.branding) setBranding(data.branding);
      } catch {}
    };
    fetchBranding();
  }, [orgCode]);

  const basePath = `/org/${orgCode}/portal`;
  const navItems = [
    { path: `${basePath}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { path: `${basePath}/messages`, label: 'Messages', icon: MessageSquare },
    { path: `${basePath}/profile`, label: 'Profile', icon: User },
  ];

  const companyName = branding.company_name || 'Client Portal';
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={companyName} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">{companyName.charAt(0)}</span>
              </div>
            )}
            <span className="font-semibold text-foreground hidden sm:block">{companyName}</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname.startsWith(item.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:flex gap-1">
              <LogOut className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Sign out</span>
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  location.pathname.startsWith(item.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => { signOut(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};
