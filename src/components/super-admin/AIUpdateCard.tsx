/**
 * AI Update Card Component
 * Checks for changes in existing features and updates documentation with new screenshots
 */

import { useState } from 'react';
import { RefreshCw, Loader2, Check, AlertCircle, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSupportArticles, SupportArticle } from '@/services/useSupportArticles';

interface ArticleUpdate {
  article: SupportArticle;
  suggestedChanges: string;
  newContent?: string;
  screenshotNeedsUpdate: boolean;
  selected: boolean;
}

export const AIUpdateCard = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentArticle, setCurrentArticle] = useState('');
  const [articlesToUpdate, setArticlesToUpdate] = useState<ArticleUpdate[]>([]);
  const [updatesAvailable, setUpdatesAvailable] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: existingArticles, refetch } = useSupportArticles();

  const handleCheck = async () => {
    if (!existingArticles || existingArticles.length === 0) {
      toast.info('No existing articles to check');
      return;
    }

    setIsChecking(true);
    setShowDialog(true);
    setProgress(0);
    setError(null);
    setArticlesToUpdate([]);

    const updates: ArticleUpdate[] = [];
    const totalArticles = existingArticles.length;

    try {
      // Check each article for potential updates
      for (let i = 0; i < existingArticles.length; i++) {
        const article = existingArticles[i];
        setCurrentArticle(article.title);
        setProgress(((i) / totalArticles) * 100);

        try {
          const { data, error: fnError } = await supabase.functions.invoke('generate-support-content', {
            body: { 
              mode: 'update',
              article: {
                id: article.id,
                module: article.module,
                title: article.title,
                slug: article.slug,
                content: article.content,
                excerpt: article.excerpt,
              },
            },
          });

          if (fnError) {
            console.error(`Error checking ${article.title}:`, fnError);
            continue;
          }

          if (data.needsUpdate) {
            updates.push({
              article,
              suggestedChanges: data.suggestedChanges || 'Content may be outdated',
              newContent: data.newContent,
              screenshotNeedsUpdate: data.screenshotNeedsUpdate || false,
              selected: true,
            });
          }
        } catch (err) {
          console.error(`Failed to check article ${article.title}:`, err);
        }

        setProgress(((i + 1) / totalArticles) * 100);
      }

      setArticlesToUpdate(updates);
      setUpdatesAvailable(updates.length);
      setCurrentArticle('');

      if (updates.length > 0) {
        toast.success(`Found ${updates.length} articles that may need updates`);
      } else {
        toast.success('All articles are up to date!');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check for updates';
      setError(message);
      toast.error(message);
    } finally {
      setIsChecking(false);
      setProgress(100);
    }
  };

  const handleToggleArticle = (index: number) => {
    setArticlesToUpdate(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setArticlesToUpdate(prev => prev.map(item => ({ ...item, selected })));
  };

  const handleApplyUpdates = async () => {
    const selectedUpdates = articlesToUpdate.filter(u => u.selected);
    if (selectedUpdates.length === 0) {
      toast.error('No articles selected');
      return;
    }

    setIsUpdating(true);
    setUpdateProgress(0);

    try {
      for (let i = 0; i < selectedUpdates.length; i++) {
        const update = selectedUpdates[i];
        
        if (update.newContent) {
          const { error } = await supabase
            .from('support_articles')
            .update({
              content: update.newContent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', update.article.id);

          if (error) {
            console.error('Failed to update article:', error);
            throw error;
          }
        }

        setUpdateProgress(((i + 1) / selectedUpdates.length) * 100);
      }

      toast.success(`Updated ${selectedUpdates.length} articles`);
      await refetch();
      setArticlesToUpdate([]);
      setShowDialog(false);
      setUpdatesAvailable(0);
    } catch (err) {
      toast.error('Failed to apply some updates');
    } finally {
      setIsUpdating(false);
      setUpdateProgress(0);
    }
  };

  const selectedCount = articlesToUpdate.filter(u => u.selected).length;

  return (
    <>
      <Card className="w-72">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            AI Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Check for changes in existing features and update 
            documentation with new screenshots.
          </p>
          
          {isChecking && !showDialog ? (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                Checking {currentArticle}...
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleCheck} 
              className="w-full" 
              size="sm" 
              variant="outline"
              disabled={isChecking}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for Updates
            </Button>
          )}
          
          {updatesAvailable > 0 && !showDialog && (
            <Badge variant="destructive" className="w-full justify-center">
              {updatesAvailable} updates available
            </Badge>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              Content Update Check
            </DialogTitle>
          </DialogHeader>

          {isChecking ? (
            <div className="py-12 space-y-4">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
                <p className="mt-4 font-medium">Checking articles for updates...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Currently checking: {currentArticle}
                </p>
              </div>
              <Progress value={progress} className="max-w-md mx-auto" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          ) : articlesToUpdate.length > 0 ? (
            <>
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm text-muted-foreground">
                  Found {articlesToUpdate.length} articles that may need updates
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(true)}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(false)}>
                    Deselect All
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 pr-4 max-h-[50vh]">
                <div className="space-y-2">
                  {articlesToUpdate.map((update, index) => (
                    <div 
                      key={update.article.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={update.selected}
                          onCheckedChange={() => handleToggleArticle(index)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium truncate">{update.article.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {update.article.module}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {update.suggestedChanges}
                          </p>
                          {update.screenshotNeedsUpdate && (
                            <Badge variant="secondary" className="text-xs mt-2">
                              📸 Screenshot update needed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {isUpdating && (
                <div className="space-y-2 pt-2">
                  <Progress value={updateProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Updating articles... {Math.round(updateProgress)}%
                  </p>
                </div>
              )}

              <DialogFooter className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {articlesToUpdate.length} articles selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApplyUpdates}
                    disabled={selectedCount === 0 || isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Apply Updates
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : (
            <div className="py-12 text-center">
              {error ? (
                <div className="space-y-2">
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                  <p className="text-destructive">{error}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Check className="h-12 w-12 mx-auto text-green-500" />
                  <p className="font-medium">All documentation is up to date!</p>
                  <p className="text-sm text-muted-foreground">
                    No articles need updates at this time.
                  </p>
                </div>
              )}
              <Button variant="outline" className="mt-4" onClick={() => setShowDialog(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
