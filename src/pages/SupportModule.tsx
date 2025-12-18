/**
 * Support Module Page
 * Lists all articles for a specific module
 */

import { useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { SupportLayout } from '@/components/support/SupportLayout';
import { SupportArticleCard } from '@/components/support/SupportArticleCard';
import { useSupportArticles, SUPPORT_MODULES } from '@/services/useSupportArticles';
import { Skeleton } from '@/components/ui/skeleton';

const SupportModule = () => {
  const { module } = useParams<{ module: string }>();
  const { data: articles, isLoading } = useSupportArticles({ module });

  const moduleInfo = SUPPORT_MODULES.find(m => m.id === module);

  if (!moduleInfo) {
    return (
      <SupportLayout 
        title="Module Not Found"
        breadcrumbs={[{ label: 'Features', href: '/support/features' }, { label: 'Not Found' }]}
      >
        <p className="text-muted-foreground">
          The requested module could not be found.
        </p>
      </SupportLayout>
    );
  }

  return (
    <SupportLayout 
      title={moduleInfo.name}
      breadcrumbs={[{ label: 'Features', href: '/support/features' }, { label: moduleInfo.name }]}
    >
      <p className="text-muted-foreground mb-8">
        {moduleInfo.description}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : articles && articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <SupportArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Articles Yet</h3>
          <p className="text-muted-foreground">
            Documentation for this module is being created.
          </p>
        </div>
      )}
    </SupportLayout>
  );
};

export default SupportModule;
