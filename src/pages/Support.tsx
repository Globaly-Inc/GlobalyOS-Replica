/**
 * Support Hub Page
 * Main landing page for the GlobalyOS Help Center
 */

import { Link } from 'react-router-dom';
import { Rocket, HelpCircle, BookOpen, Code } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SupportLayout } from '@/components/support/SupportLayout';
import { SupportArticleCard } from '@/components/support/SupportArticleCard';
import { SupportModuleCard } from '@/components/support/SupportModuleCard';
import { useSupportArticles, SUPPORT_MODULES } from '@/services/useSupportArticles';

const QUICK_LINKS = [
  { href: '/support/getting-started', label: 'Getting Started', icon: Rocket, description: 'New to GlobalyOS? Start here' },
  { href: '/support/faq', label: 'FAQ', icon: HelpCircle, description: 'Frequently asked questions' },
  { href: '/support/features', label: 'Feature Guides', icon: BookOpen, description: 'Learn about all features' },
  { href: '/support/api', label: 'API Reference', icon: Code, description: 'For developers' },
];

const Support = () => {
  const { data: featuredArticles } = useSupportArticles({ featured: true, limit: 6 });
  const { data: allArticles } = useSupportArticles();
  
  // Count articles per module
  const articleCounts = allArticles?.reduce((acc, article) => {
    acc[article.module] = (acc[article.module] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

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

      {/* Feature Guides */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Feature Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUPPORT_MODULES.map((module) => (
            <SupportModuleCard
              key={module.id}
              id={module.id}
              name={module.name}
              description={module.description}
              icon={module.icon}
              articleCount={articleCounts[module.id]}
            />
          ))}
        </div>
      </section>
    </SupportLayout>
  );
};

export default Support;
