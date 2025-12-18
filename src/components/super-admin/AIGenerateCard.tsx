/**
 * AI Generate Card Component
 * Automatically scans all modules for new features and generates support documentation
 */

import { useState } from 'react';
import { Sparkles, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSupportArticles, SUPPORT_MODULES } from '@/services/useSupportArticles';

interface GeneratedArticle {
  module: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  target_roles: string[];
  suggested_screenshots: { route: string; highlight_selector?: string; annotation?: string }[];
  category_id?: string;
  is_published: boolean;
  is_featured: boolean;
  selected?: boolean;
}

const ROLE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  owner: { label: 'Owner', icon: '👑', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  admin: { label: 'Admin', icon: '⚙️', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  hr: { label: 'HR', icon: '📋', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  user: { label: 'User', icon: '👤', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
};

// Module to category mapping for auto-assignment
const MODULE_CATEGORY_MAP: Record<string, string> = {
  team: 'getting-started',
  leave: 'hr-management',
  attendance: 'hr-management',
  kpis: 'performance',
  okrs: 'performance',
  reviews: 'performance',
  wiki: 'knowledge-base',
  crm: 'crm',
  calendar: 'collaboration',
  chat: 'collaboration',
  updates: 'collaboration',
  settings: 'admin',
  general: 'getting-started',
};

export const AIGenerateCard = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState('');
  const [generatedArticles, setGeneratedArticles] = useState<GeneratedArticle[]>([]);
  const [newFeaturesCount, setNewFeaturesCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: existingArticles } = useSupportArticles();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowDialog(true);
    setProgress(0);
    setError(null);
    setGeneratedArticles([]);

    // Get existing article slugs for deduplication
    const existingSlugs = new Set(existingArticles?.map(a => a.slug) || []);

    const allGeneratedArticles: GeneratedArticle[] = [];
    const totalModules = SUPPORT_MODULES.length;

    try {
      for (let i = 0; i < SUPPORT_MODULES.length; i++) {
        const module = SUPPORT_MODULES[i];
        setCurrentModule(module.name);
        setProgress(((i) / totalModules) * 100);

        try {
          const { data, error: fnError } = await supabase.functions.invoke('generate-support-content', {
            body: { 
              mode: 'generate',
              module: module.id,
              existingSlugs: Array.from(existingSlugs),
            },
          });

          if (fnError) {
            console.error(`Error generating for ${module.id}:`, fnError);
            continue;
          }

          if (data.articles && Array.isArray(data.articles)) {
            // Filter out articles with slugs that already exist
            const newArticles = data.articles.filter(
              (article: GeneratedArticle) => !existingSlugs.has(article.slug)
            );

            // Add to existing slugs to avoid duplicates across modules
            newArticles.forEach((article: GeneratedArticle) => {
              existingSlugs.add(article.slug);
            });

            const articlesWithSelection = newArticles.map((article: GeneratedArticle) => ({
              ...article,
              selected: true,
            }));

            allGeneratedArticles.push(...articlesWithSelection);
          }
        } catch (err) {
          console.error(`Failed to generate for module ${module.id}:`, err);
        }

        setProgress(((i + 1) / totalModules) * 100);
      }

      setGeneratedArticles(allGeneratedArticles);
      setNewFeaturesCount(allGeneratedArticles.length);
      setCurrentModule('');

      if (allGeneratedArticles.length > 0) {
        toast.success(`Generated ${allGeneratedArticles.length} new articles across all modules`);
      } else {
        toast.info('No new articles generated - documentation may already be complete');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate content';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  };

  const handleToggleArticle = (index: number) => {
    setGeneratedArticles(prev => 
      prev.map((article, i) => 
        i === index ? { ...article, selected: !article.selected } : article
      )
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setGeneratedArticles(prev => prev.map(article => ({ ...article, selected })));
  };

  const handleSaveSelected = async () => {
    const selectedArticles = generatedArticles.filter(a => a.selected);
    if (selectedArticles.length === 0) {
      toast.error('No articles selected');
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      for (let i = 0; i < selectedArticles.length; i++) {
        const article = selectedArticles[i];
        
        const { error } = await supabase
          .from('support_articles')
          .insert({
            module: article.module,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            content: article.content,
            category_id: article.category_id || null,
            target_roles: article.target_roles,
            is_published: false,
            is_featured: false,
          });

        if (error) {
          console.error('Failed to save article:', error);
          throw error;
        }

        setSaveProgress(((i + 1) / selectedArticles.length) * 100);
      }

      toast.success(`Saved ${selectedArticles.length} articles as drafts`);
      setGeneratedArticles([]);
      setShowDialog(false);
      setNewFeaturesCount(0);
    } catch (err) {
      toast.error('Failed to save some articles');
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  const selectedCount = generatedArticles.filter(a => a.selected).length;

  return (
    <>
      <Card className="w-72">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Generate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Automatically scan all modules for new features and generate 
            support documentation with screenshots.
          </p>
          
          {isGenerating && !showDialog ? (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                Scanning {currentModule}...
              </p>
            </div>
          ) : (
            <Button onClick={handleGenerate} className="w-full" size="sm" disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate New Content
            </Button>
          )}
          
          {newFeaturesCount > 0 && !showDialog && (
            <Badge variant="secondary" className="w-full justify-center">
              {newFeaturesCount} new features detected
            </Badge>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Content Generation
            </DialogTitle>
          </DialogHeader>

          {isGenerating ? (
            <div className="py-12 space-y-4">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="mt-4 font-medium">Scanning modules for new features...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Currently processing: {currentModule}
                </p>
              </div>
              <Progress value={progress} className="max-w-md mx-auto" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          ) : generatedArticles.length > 0 ? (
            <>
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm text-muted-foreground">
                  Found {generatedArticles.length} new articles to create
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
                <Accordion type="multiple" className="space-y-2">
                  {generatedArticles.map((article, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`article-${index}`}
                      className="border rounded-lg px-4"
                    >
                      <div className="flex items-center gap-3 py-2">
                        <Checkbox
                          checked={article.selected}
                          onCheckedChange={() => handleToggleArticle(index)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <AccordionTrigger className="flex-1 hover:no-underline py-2">
                          <div className="flex items-center gap-2 text-left">
                            <span className="font-medium">{article.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {article.module}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="pb-4">
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Excerpt</Label>
                            <p className="text-sm">{article.excerpt}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Target Roles</Label>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {article.target_roles.map(role => (
                                <Badge 
                                  key={role} 
                                  variant="secondary" 
                                  className={`text-xs ${ROLE_LABELS[role]?.color || ''}`}
                                >
                                  {ROLE_LABELS[role]?.icon} {ROLE_LABELS[role]?.label || role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Content Preview</Label>
                            <div className="mt-1 bg-muted p-3 rounded-lg max-h-32 overflow-auto">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {article.content.slice(0, 500)}
                                {article.content.length > 500 && '...'}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>

              {isSaving && (
                <div className="space-y-2 pt-2">
                  <Progress value={saveProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Saving articles... {Math.round(saveProgress)}%
                  </p>
                </div>
              )}

              <DialogFooter className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {generatedArticles.length} articles selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveSelected}
                    disabled={selectedCount === 0 || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Selected as Drafts
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
                  <p className="font-medium">Documentation is up to date!</p>
                  <p className="text-sm text-muted-foreground">
                    No new features detected that need documentation.
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
