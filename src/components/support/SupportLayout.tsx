/**
 * Support Layout Component
 * Provides consistent layout for support pages with sidebar navigation
 */

import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LifeBuoy, Search, Home, Rocket, HelpCircle, BookOpen, Code, 
  Menu, X, ChevronRight, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSearchSupportArticles } from '@/services/useSupportArticles';

interface SupportLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

const NAV_ITEMS = [
  { href: '/support', label: 'Support Home', icon: Home },
  { href: '/support/getting-started', label: 'Getting Started', icon: Rocket },
  { href: '/support/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/support/features', label: 'Feature Guides', icon: BookOpen },
  { href: '/support/api', label: 'API Reference', icon: Code },
];

export const SupportLayout = ({ children, title, breadcrumbs }: SupportLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults } = useSearchSupportArticles(searchQuery);

  const handleSearchSelect = (module: string, slug: string) => {
    navigate(`/support/features/${module}/${slug}`);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/support" className="flex items-center gap-2">
              <LifeBuoy className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">GlobalyOS Help Center</span>
            </Link>
          </div>
          
          {/* Search */}
          <div className="relative hidden md:block w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && searchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto z-50">
                {searchResults.map((article) => (
                  <button
                    key={article.id}
                    className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => handleSearchSelect(article.module, article.slug)}
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{article.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{article.module}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to App
          </Button>
        </div>
      </header>

      <div className="container flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-background transition-transform md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <ScrollArea className="h-full py-6">
            <nav className="space-y-1 px-3">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/support' && location.pathname.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="py-6 px-4 md:px-8">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                <Link to="/support" className="hover:text-foreground">Support</Link>
                {breadcrumbs.map((crumb, index) => (
                  <span key={index} className="flex items-center gap-1">
                    <ChevronRight className="h-4 w-4" />
                    {crumb.href ? (
                      <Link to={crumb.href} className="hover:text-foreground">{crumb.label}</Link>
                    ) : (
                      <span className="text-foreground">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            {/* Page title */}
            {title && (
              <h1 className="text-3xl font-bold tracking-tight mb-6">{title}</h1>
            )}

            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
