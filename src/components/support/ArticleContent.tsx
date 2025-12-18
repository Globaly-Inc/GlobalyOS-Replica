/**
 * Article Content Component
 * Renders markdown content with screenshots and helpfulness tracking
 */

import { useState } from 'react';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, ThumbsDown, Eye, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

// Configure marked to return string synchronously
marked.use({ async: false });
import { cn } from '@/lib/utils';
import { SupportArticle } from '@/services/useSupportArticles';
import { format } from 'date-fns';

interface ArticleContentProps {
  article: SupportArticle;
  onHelpful?: (helpful: boolean) => void;
}

export const ArticleContent = ({ article, onHelpful }: ArticleContentProps) => {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);

  const handleFeedback = (helpful: boolean) => {
    if (feedbackGiven !== null) return;
    setFeedbackGiven(helpful);
    onHelpful?.(helpful);
  };

  const screenshots = article.screenshots || [];

  return (
    <article className="max-w-4xl">
      {/* Article header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">{article.title}</h1>
        {article.excerpt && (
          <p className="text-lg text-muted-foreground mb-4">{article.excerpt}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {article.view_count} views
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Updated {format(new Date(article.updated_at), 'MMM d, yyyy')}
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

      {/* Screenshots gallery */}
      {screenshots.length > 0 && (
        <Card className="mb-8 p-4">
          <div className="relative">
            <img 
              src={screenshots[currentScreenshot]} 
              alt={`Screenshot ${currentScreenshot + 1}`}
              className="w-full h-auto rounded-lg"
            />
            {screenshots.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80"
                  onClick={() => setCurrentScreenshot((prev) => 
                    prev === 0 ? screenshots.length - 1 : prev - 1
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80"
                  onClick={() => setCurrentScreenshot((prev) => 
                    prev === screenshots.length - 1 ? 0 : prev + 1
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {screenshots.map((_, index) => (
                    <button
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        index === currentScreenshot 
                          ? "bg-primary" 
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      )}
                      onClick={() => setCurrentScreenshot(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Screenshot {currentScreenshot + 1} of {screenshots.length}
          </p>
        </Card>
      )}

      {/* Article content */}
      <div 
        className="prose prose-slate dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: marked(article.content || '') as string }}
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
