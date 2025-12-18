/**
 * AI Content Generator Component
 * Generates support documentation using AI with role tagging
 */

import { useState } from 'react';
import { Sparkles, Loader2, FileText, Check, AlertCircle, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useSupportCategories,
  useCreateArticle,
  SUPPORT_MODULES,
} from '@/services/useSupportArticles';

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

export const AIContentGenerator = () => {
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArticles, setGeneratedArticles] = useState<GeneratedArticle[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useSupportCategories();
  const createArticle = useCreateArticle();

  const handleGenerate = async () => {
    if (!selectedModule) {
      toast.error('Please select a module');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedArticles([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-support-content', {
        body: { 
          module: selectedModule,
          categoryId: selectedCategory && selectedCategory !== 'none' ? selectedCategory : null,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const articlesWithSelection = (data.articles || []).map((article: GeneratedArticle) => ({
        ...article,
        selected: true,
      }));

      setGeneratedArticles(articlesWithSelection);
      toast.success(`Generated ${articlesWithSelection.length} articles`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate content';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
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
        
        // Insert article with target_roles
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
    } catch (err) {
      toast.error('Failed to save some articles');
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  const selectedCount = generatedArticles.filter(a => a.selected).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate comprehensive support articles for any module using AI. 
            Articles include step-by-step instructions, role-based access tags, and screenshot suggestions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Module *</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_MODULES.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category (Optional)</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !selectedModule}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Articles
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {generatedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generated Articles ({generatedArticles.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(true)}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(false)}
                >
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
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
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Excerpt</Label>
                          <p className="text-sm">{article.excerpt}</p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Target Roles
                          </Label>
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

                        {article.suggested_screenshots.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Suggested Screenshots</Label>
                            <div className="mt-1 space-y-1">
                              {article.suggested_screenshots.map((ss, ssIndex) => (
                                <div key={ssIndex} className="text-xs bg-muted p-2 rounded">
                                  <span className="font-mono">{ss.route}</span>
                                  {ss.annotation && (
                                    <span className="text-muted-foreground ml-2">
                                      — {ss.annotation}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <Label className="text-xs text-muted-foreground">Content Preview</Label>
                          <div className="mt-1 bg-muted p-3 rounded-lg max-h-48 overflow-auto">
                            <pre className="text-xs whitespace-pre-wrap font-mono">
                              {article.content.slice(0, 800)}
                              {article.content.length > 800 && '...'}
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
              <div className="space-y-2">
                <Progress value={saveProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Saving articles... {Math.round(saveProgress)}%
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedCount} of {generatedArticles.length} articles selected
              </p>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};
