/**
 * Support Article Card Component
 * Displays an article preview card
 */

import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, ThumbsUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupportArticle } from '@/services/useSupportArticles';

const ROLE_LABELS: Record<string, { label: string; icon: string }> = {
  owner: { label: 'Owner', icon: '👑' },
  admin: { label: 'Admin', icon: '⚙️' },
  hr: { label: 'HR', icon: '📋' },
  user: { label: 'User', icon: '👤' },
};

interface SupportArticleCardProps {
  article: SupportArticle;
  showModule?: boolean;
  className?: string;
}

export const SupportArticleCard = ({ article, showModule = false, className }: SupportArticleCardProps) => {
  return (
    <Link to={`/support/features/${article.module}/${article.slug}`}>
      <Card className={cn(
        "h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer",
        className
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {article.is_featured && (
                  <Badge variant="secondary" className="text-xs">Featured</Badge>
                )}
                {showModule && (
                  <Badge variant="outline" className="text-xs capitalize">{article.module}</Badge>
                )}
              </div>
              <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {article.excerpt && (
            <CardDescription className="line-clamp-2 mb-3">
              {article.excerpt}
            </CardDescription>
          )}
          {article.target_roles && article.target_roles.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mb-3">
              <Users className="h-3 w-3 text-muted-foreground mr-1" />
              {article.target_roles.map(role => (
                <Badge key={role} variant="outline" className="text-xs px-1.5 py-0">
                  {ROLE_LABELS[role]?.icon} {ROLE_LABELS[role]?.label || role}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.view_count} views
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {article.helpful_yes} helpful
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
