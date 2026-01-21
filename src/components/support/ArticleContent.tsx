/**
 * Article Content Component
 * Renders markdown content with screenshots and helpfulness tracking
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, ThumbsDown, Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupportArticle, useSupportScreenshots } from '@/services/useSupportArticles';
import { format } from 'date-fns';
import { SupportMarkdownRenderer } from './SupportMarkdownRenderer';
import { RoleBadges, UserRole } from './RoleBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ArticleContentProps {
  article: SupportArticle;
  onHelpful?: (helpful: boolean) => void;
  isAdmin?: boolean;
}

export const ArticleContent = ({ article, onHelpful, isAdmin = false }: ArticleContentProps) => {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  
  // Fetch screenshots for this article
  const { data: screenshots } = useSupportScreenshots(article.id);

  // Transform screenshots to the format expected by SupportMarkdownRenderer
  const screenshotData = screenshots?.map(s => ({
    id: s.id,
    description: s.description || '',
    imageUrl: s.storage_path ? supabase.storage.from('doc_screenshots').getPublicUrl(s.storage_path).data.publicUrl : undefined,
    status: s.status as 'pending' | 'capturing' | 'completed' | 'failed',
    annotation: s.description || undefined,
  })) || [];

  const handleFeedback = (helpful: boolean) => {
    if (feedbackGiven !== null) return;
    setFeedbackGiven(helpful);
    onHelpful?.(helpful);
  };

  const handleCaptureScreenshot = async (description: string) => {
    if (!isAdmin) return;
    
    try {
      // Create a new screenshot record
      const { data: newScreenshot, error: insertError } = await supabase
        .from('support_screenshots')
        .insert({
          article_id: article.id,
          module: article.module,
          route_path: `/org/:slug/${article.module}`, // Default route, can be refined
          description,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger screenshot capture
      const { error: captureError } = await supabase.functions.invoke('capture-doc-screenshot', {
        body: { screenshotId: newScreenshot.id },
      });

      if (captureError) {
        console.error('Screenshot capture error:', captureError);
        toast.error('Failed to capture screenshot');
      } else {
        toast.success('Screenshot capture started');
      }
    } catch (err) {
      console.error('Error triggering screenshot capture:', err);
      toast.error('Failed to start screenshot capture');
    }
  };

  // Parse target_roles safely
  const targetRoles: UserRole[] = Array.isArray(article.target_roles) 
    ? (article.target_roles as string[]).filter((r): r is UserRole => 
        ['owner', 'admin', 'hr', 'user'].includes(r)
      )
    : [];

  return (
    <article className="max-w-4xl">
      {/* Article header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">{article.title}</h1>
        
        {article.excerpt && (
          <p className="text-lg text-muted-foreground mb-4">{article.excerpt}</p>
        )}
        
        {/* Role badges */}
        {targetRoles.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Available to:</p>
            <RoleBadges roles={targetRoles} size="md" />
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {article.view_count} views
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Updated {format(new Date(article.updated_at), 'dd MMM yyyy')}
          </span>
        </div>
      </header>

      {/* Cover image */}
      {article.cover_image_url && (
        <div className="mb-8 rounded-lg overflow-hidden border">
          <img 
            src={article.cover_image_url} 
            alt={article.title}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Article content with enhanced renderer */}
      <SupportMarkdownRenderer
        content={article.content || ''}
        screenshots={screenshotData}
        onCaptureScreenshot={isAdmin ? handleCaptureScreenshot : undefined}
        isAdmin={isAdmin}
      />

      {/* Helpfulness feedback */}
      <Separator className="my-8" />
      <div className="flex flex-col items-center gap-4">
        <p className="text-muted-foreground">Was this article helpful?</p>
        <div className="flex gap-4">
          <Button
            variant={feedbackGiven === true ? "default" : "outline"}
            size="lg"
            onClick={() => handleFeedback(true)}
            disabled={feedbackGiven !== null}
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            Yes ({article.helpful_yes})
          </Button>
          <Button
            variant={feedbackGiven === false ? "destructive" : "outline"}
            size="lg"
            onClick={() => handleFeedback(false)}
            disabled={feedbackGiven !== null}
          >
            <ThumbsDown className="h-4 w-4 mr-2" />
            No ({article.helpful_no})
          </Button>
        </div>
        {feedbackGiven !== null && (
          <p className="text-sm text-muted-foreground">
            Thanks for your feedback!
          </p>
        )}
      </div>
    </article>
  );
};
