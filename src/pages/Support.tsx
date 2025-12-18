/**
 * Support Hub Page
 * Main landing page for the GlobalyOS Help Center
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Rocket, HelpCircle, BookOpen, Code, Search, MessageSquare,
  Users, Calendar, Clock, Target, Star, CheckSquare, Briefcase, DollarSign, Settings
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SupportLayout } from '@/components/support/SupportLayout';
import { SupportArticleCard } from '@/components/support/SupportArticleCard';
import { useSupportArticles, SUPPORT_MODULES } from '@/services/useSupportArticles';
import { GetHelpDialog } from '@/components/support/GetHelpDialog';

const QUICK_LINKS = [
  { href: '/support/getting-started', label: 'Getting Started', icon: Rocket, description: 'New to GlobalyOS? Start here' },
  { href: '/support/faq', label: 'FAQ', icon: HelpCircle, description: 'Frequently asked questions' },
  { href: '/support/features', label: 'Feature Guides', icon: BookOpen, description: 'Learn about all features' },
  { href: '/support/api', label: 'API Reference', icon: Code, description: 'For developers' },
];

const ICON_MAP: Record<string, typeof Users> = {
  Info: Users,
  Users,
  Calendar,
  Clock,
  CalendarDays: Calendar,
  Target,
  Star,
  BookOpen,
  MessageSquare,
  CheckSquare,
  Briefcase,
  DollarSign,
  Settings,
};

const Support = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  
  const { data: featuredArticles, isLoading } = useSupportArticles({ featured: true, limit: 6 });

  return (
    <SupportLayout>
      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} to={link.href}>
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{link.label}</CardTitle>
                      <CardDescription className="text-xs">{link.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Featured Articles */}
      {featuredArticles && featuredArticles.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Popular Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredArticles.map((article) => (
              <SupportArticleCard key={article.id} article={article} showModule />
            ))}
          </div>
        </section>
      )}

      {/* Browse by Module */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Browse by Feature</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SUPPORT_MODULES.map((module) => {
            const Icon = ICON_MAP[module.icon] || BookOpen;
            return (
              <Link key={module.id} to={`/support/features/${module.id}`}>
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="font-medium">{module.name}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Contact Support */}
      <section className="text-center py-8 border-t">
        <h2 className="text-xl font-semibold mb-2">Can't find what you're looking for?</h2>
        <p className="text-muted-foreground mb-4">
          Our support team is here to help
        </p>
        <Button onClick={() => setHelpDialogOpen(true)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact Support
        </Button>
      </section>

      <GetHelpDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
    </SupportLayout>
  );
};

export default Support;
