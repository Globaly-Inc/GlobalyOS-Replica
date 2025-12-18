/**
 * Support Article Page
 * Displays a single support article with content and screenshots
 */

import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SupportLayout } from '@/components/support/SupportLayout';
import { ArticleContent } from '@/components/support/ArticleContent';
import { SupportArticleCard } from '@/components/support/SupportArticleCard';
import { 
  useSupportArticle, 
  useSupportArticles, 
  useTrackArticleView,
  useTrackArticleHelpfulness,
  SUPPORT_MODULES 
} from '@/services/useSupportArticles';

const SupportArticle = () => {
  const { module, slug } = useParams<{ module: string; slug: string }>();
  const { data: article, isLoading, error } = useSupportArticle(module || '', slug || '');
  const { data: relatedArticles } = useSupportArticles({ module, limit: 4 });
  const trackView = useTrackArticleView();
  const trackHelpfulness = useTrackArticleHelpfulness();

  const moduleInfo = SUPPORT_MODULES.find(m => m.id === module);

  // Track view on mount
  useEffect(() => {
    if (article?.id) {
      trackView.mutate(article.id);
    }
  }, [article?.id]);

  const handleHelpfulFeedback = (helpful: boolean) => {
    if (article?.id) {
      trackHelpfulness.mutate({ articleId: article.id, helpful });
    }
  };

  // Filter out current article from related
  const otherArticles = relatedArticles?.filter(a => a.id !== article?.id).slice(0, 3);

  if (isLoading) {
    return (
      <SupportLayout 
        breadcrumbs={[
          { label: 'Features', href: '/support/features' },
          { label: moduleInfo?.name || module || '', href: `/support/features/${module}` },
          { label: 'Loading...' }
        ]}
      >
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </SupportLayout>
    );
  }

  if (error || !article) {
    return (
      <SupportLayout 
        title="Article Not Found"
        breadcrumbs={[
          { label: 'Features', href: '/support/features' },
          { label: moduleInfo?.name || module || '', href: `/support/features/${module}` },
          { label: 'Not Found' }
        ]}
      >
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Article Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The requested article could not be found or may have been removed.
          </p>
          <Link to={`/support/features/${module}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {moduleInfo?.name || 'Module'}
            </Button>
          </Link>
        </div>
      </SupportLayout>
    );
  }

  return (
    <SupportLayout 
      breadcrumbs={[
        { label: 'Features', href: '/support/features' },
        { label: moduleInfo?.name || module || '', href: `/support/features/${module}` },
        { label: article.title }
      ]}
    >
      <div className="lg:flex lg:gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <ArticleContent article={article} onHelpful={handleHelpfulFeedback} />
        </div>

        {/* Sidebar - Related Articles */}
        {otherArticles && otherArticles.length > 0 && (
          <aside className="lg:w-80 mt-8 lg:mt-0">
            <div className="sticky top-24">
              <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
              <div className="space-y-3">
                {otherArticles.map((relatedArticle) => (
                  <SupportArticleCard 
                    key={relatedArticle.id} 
                    article={relatedArticle}
                  />
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </SupportLayout>
  );
};

export default SupportArticle;
