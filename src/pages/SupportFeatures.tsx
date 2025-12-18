/**
 * Features Index Page
 * Overview of all feature modules with links to documentation
 */

import { SupportLayout } from '@/components/support/SupportLayout';
import { SupportModuleCard } from '@/components/support/SupportModuleCard';
import { useSupportArticles, SUPPORT_MODULES } from '@/services/useSupportArticles';

const SupportFeatures = () => {
  const { data: articles } = useSupportArticles();

  // Count articles per module
  const articleCounts = articles?.reduce((acc, article) => {
    acc[article.module] = (acc[article.module] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <SupportLayout 
      title="Feature Guides"
      breadcrumbs={[{ label: 'Features' }]}
    >
      <p className="text-muted-foreground mb-8">
        Explore detailed documentation for every feature in GlobalyOS.
      </p>

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
    </SupportLayout>
  );
};

export default SupportFeatures;
