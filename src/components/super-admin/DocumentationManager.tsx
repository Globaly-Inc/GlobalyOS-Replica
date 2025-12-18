/**
 * Documentation Manager Component
 * Admin interface for managing support documentation, screenshots, and API docs
 */

import { useState, useEffect } from 'react';
import { 
  FileText, FolderOpen, Camera, Code, Plus, Pencil, Trash2, 
  Eye, EyeOff, RefreshCw, Search, Upload, ExternalLink, Check,
  Sparkles, Play, KeyRound, Mail, ShieldCheck, Link2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ArticleBulkActionsBar } from './ArticleBulkActionsBar';
import { Checkbox } from '@/components/ui/checkbox';
import { AIGenerateCard } from './AIGenerateCard';
import { AIUpdateCard } from './AIUpdateCard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  useSupportCategories,
  useSupportArticles,
  useSupportScreenshots,
  useApiDocumentation,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle,
  useCreateScreenshot,
  useDeleteScreenshot,
  useCaptureScreenshot,
  useScanApiDocumentation,
  useUpdateApiDoc,
  useCaptureModuleScreenshots,
  useAnalyzeAllScreenshots,
  useScreenshotRoutes,
  SUPPORT_MODULES,
  SupportArticle,
  SupportCategory,
  SupportScreenshot,
  ScreenshotRoute,
  ApiDocumentation,
} from '@/services/useSupportArticles';
import { useAISmartCapture, useCaptureAllPending, PrivacyOptions, ScreenshotSession } from '@/services/useSupportScreenshots';

export const DocumentationManager = () => {
  const [activeTab, setActiveTab] = useState('articles');

  return (
    <div className="space-y-4">
      {/* AI Cards Row */}
      <div className="flex items-center gap-3">
        <AIGenerateCard />
        <AIUpdateCard />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tabs + View Support Center button row */}
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="screenshots" className="gap-2">
              <Camera className="h-4 w-4" />
              Screenshots
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Code className="h-4 w-4" />
              API Docs
            </TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm" asChild>
            <a href="/support" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Support Center
            </a>
          </Button>
        </div>

        <TabsContent value="articles" className="mt-6">
          <ArticlesManager />
        </TabsContent>
        <TabsContent value="categories" className="mt-6">
          <CategoriesManager />
        </TabsContent>
        <TabsContent value="screenshots" className="mt-6">
          <ScreenshotsManager />
        </TabsContent>
        <TabsContent value="api" className="mt-6">
          <ApiDocsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Articles Manager
const ArticlesManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { data: articles, isLoading } = useSupportArticles();
  const { data: categories } = useSupportCategories();
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const deleteArticle = useDeleteArticle();

  const filteredArticles = articles?.filter((article) => {
    const matchesSearch = searchQuery.trim() === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = filterModule === 'all' || article.module === filterModule;
    return matchesSearch && matchesModule;
  });

  // Selection helpers
  const isArticleSelected = (id: string) => selectedArticles.includes(id);
  
  const toggleArticleSelection = (id: string) => {
    setSelectedArticles(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const selectAllArticles = () => {
    if (filteredArticles) {
      setSelectedArticles(filteredArticles.map(a => a.id));
    }
  };

  const deselectAllArticles = () => {
    setSelectedArticles([]);
  };

  // Bulk action handlers
  const handleBulkPublish = async () => {
    try {
      await Promise.all(
        selectedArticles.map(id => updateArticle.mutateAsync({ id, is_published: true }))
      );
      toast.success(`Published ${selectedArticles.length} article${selectedArticles.length > 1 ? 's' : ''}`);
      setSelectedArticles([]);
    } catch {
      toast.error('Failed to publish some articles');
    }
  };

  const handleBulkUnpublish = async () => {
    try {
      await Promise.all(
        selectedArticles.map(id => updateArticle.mutateAsync({ id, is_published: false }))
      );
      toast.success(`Unpublished ${selectedArticles.length} article${selectedArticles.length > 1 ? 's' : ''}`);
      setSelectedArticles([]);
    } catch {
      toast.error('Failed to unpublish some articles');
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedArticles.map(id => deleteArticle.mutateAsync(id)));
      toast.success(`Deleted ${selectedArticles.length} article${selectedArticles.length > 1 ? 's' : ''}`);
      setSelectedArticles([]);
    } catch {
      toast.error('Failed to delete some articles');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = async (data: Partial<SupportArticle>) => {
    await createArticle.mutateAsync(data as { module: string; title: string; slug: string });
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: Partial<SupportArticle> & { id: string }) => {
    await updateArticle.mutateAsync(data);
  };

  const handleDelete = async (id: string) => {
    await deleteArticle.mutateAsync(id);
  };

  const handleTogglePublish = async (article: SupportArticle) => {
    await updateArticle.mutateAsync({ 
      id: article.id, 
      is_published: !article.is_published 
    });
  };

  const hasSelection = selectedArticles.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {SUPPORT_MODULES.map((module) => (
              <SelectItem key={module.id} value={module.id}>{module.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ArticleDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          categories={categories || []}
          onSave={handleCreate}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredArticles?.map((article) => {
            const isSelected = isArticleSelected(article.id);
            return (
              <div 
                key={article.id} 
                className={`p-4 flex items-center gap-3 transition-colors group hover:bg-muted/50 ${
                  isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
              >
                {/* Checkbox */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleArticleSelection(article.id)}
                  className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{article.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">{article.module}</Badge>
                    {article.is_featured && <Badge className="text-xs">Featured</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{article.excerpt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePublish(article)}
                    title={article.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {article.is_published ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <ArticleDialog
                    article={article}
                    categories={categories || []}
                    onSave={handleUpdate}
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Article</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{article.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(article.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
          {filteredArticles?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No articles found.
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <AlertDialog>
          <ArticleBulkActionsBar
            selectedCount={selectedArticles.length}
            totalItems={filteredArticles?.length || 0}
            onSelectAll={selectAllArticles}
            onDeselectAll={deselectAllArticles}
            onPublish={handleBulkPublish}
            onUnpublish={handleBulkUnpublish}
            onDelete={() => {
              // Trigger the AlertDialog
              const deleteBtn = document.getElementById('bulk-delete-trigger');
              deleteBtn?.click();
            }}
          />
          <AlertDialogTrigger asChild>
            <button id="bulk-delete-trigger" className="hidden" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedArticles.length} Articles</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

// Article Edit Dialog
const ArticleDialog = ({ 
  article, 
  categories, 
  onSave, 
  trigger,
  open,
  onOpenChange,
}: { 
  article?: SupportArticle; 
  categories: SupportCategory[];
  onSave: (data: Partial<SupportArticle> & { id?: string }) => Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: article?.title || '',
    slug: article?.slug || '',
    module: article?.module || 'general',
    category_id: article?.category_id || '',
    excerpt: article?.excerpt || '',
    content: article?.content || '',
    is_published: article?.is_published || false,
    is_featured: article?.is_featured || false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setIsOpen(open);
    }
    if (open && article) {
      setFormData({
        title: article.title,
        slug: article.slug,
        module: article.module,
        category_id: article.category_id || '',
        excerpt: article.excerpt || '',
        content: article.content || '',
        is_published: article.is_published,
        is_featured: article.is_featured,
      });
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.module) {
      toast.error('Title, slug, and module are required');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(article ? { ...formData, id: article.id } : formData);
      handleOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData((prev) => ({ ...prev, slug }));
  };

  const dialogOpen = open !== undefined ? open : isOpen;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{article ? 'Edit Article' : 'Create Article'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  onBlur={() => !formData.slug && generateSlug()}
                  placeholder="How to request leave"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="how-to-request-leave"
                  />
                  <Button variant="outline" size="icon" onClick={generateSlug} title="Generate from title">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select 
                  value={formData.module} 
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, module: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_MODULES.map((module) => (
                      <SelectItem key={module.id} value={module.id}>{module.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category_id || 'none'} 
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Brief description of the article..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="# Article Title\n\nWrite your content here..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_published: checked }))}
                />
                <Label htmlFor="is_published">Published</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Categories Manager
const CategoriesManager = () => {
  const { data: categories, isLoading } = useSupportCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editingCategory, setEditingCategory] = useState<SupportCategory | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '', icon: '' });

  const handleCreate = async () => {
    if (!newCategory.name || !newCategory.slug) {
      toast.error('Name and slug are required');
      return;
    }
    await createCategory.mutateAsync(newCategory);
    setNewCategory({ name: '', slug: '', description: '', icon: '' });
  };

  const handleUpdate = async () => {
    if (!editingCategory) return;
    await updateCategory.mutateAsync({
      id: editingCategory.id,
      name: editingCategory.name,
      slug: editingCategory.slug,
      description: editingCategory.description,
      icon: editingCategory.icon,
    });
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Create new category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Slug (e.g., getting-started)"
              value={newCategory.slug}
              onChange={(e) => setNewCategory((prev) => ({ ...prev, slug: e.target.value }))}
            />
            <Input
              placeholder="Description"
              value={newCategory.description}
              onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))}
            />
            <Input
              placeholder="Icon (e.g., Rocket)"
              value={newCategory.icon}
              onChange={(e) => setNewCategory((prev) => ({ ...prev, icon: e.target.value }))}
            />
          </div>
          <Button className="mt-4" onClick={handleCreate} disabled={createCategory.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardContent>
      </Card>

      {/* Categories list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {categories?.map((category) => (
            <div key={category.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  <Badge variant="outline" className="text-xs">{category.slug}</Badge>
                  {category.icon && <Badge variant="secondary" className="text-xs">{category.icon}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setEditingCategory(category)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Category</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure? Articles in this category will become uncategorized.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteCategory.mutate(category.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Screenshots Manager
const ScreenshotsManager = () => {
  const { data: screenshots, isLoading: screenshotsLoading } = useSupportScreenshots();
  const { data: routes, isLoading: routesLoading } = useScreenshotRoutes();
  const { data: articles } = useSupportArticles();
  const createScreenshot = useCreateScreenshot();
  const deleteScreenshot = useDeleteScreenshot();
  const captureScreenshot = useCaptureScreenshot();
  const { smartCapture, isAnalyzing, isCapturing } = useAISmartCapture();
  const captureAllPending = useCaptureAllPending();
  const captureModuleScreenshots = useCaptureModuleScreenshots();
  const analyzeAllScreenshots = useAnalyzeAllScreenshots();

  const [newScreenshot, setNewScreenshot] = useState({ route_path: '', description: '', article_id: '' });
  const [smartCaptureOpen, setSmartCaptureOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [orgSlug, setOrgSlug] = useState('globalyhub');
  const [privacyOptions, setPrivacyOptions] = useState<PrivacyOptions>({
    maskNames: true,
    blurAvatars: true,
    hideEmails: true,
  });
  const [activeTab, setActiveTab] = useState<'routes' | 'screenshots'>('routes');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDescription, setPreviewDescription] = useState<string>('');

  // Magic Link Authentication State
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [screenshotSession, setScreenshotSession] = useState<ScreenshotSession | null>(null);

  // Listen for auth state changes (when user clicks magic link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && magicLinkSent) {
        // User signed in via magic link
        setScreenshotSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        });
        setMagicLinkSent(false);
        setMagicLinkEmail('');
        toast.success('Authenticated! You can now capture screenshots.');
      }
    });

    return () => subscription.unsubscribe();
  }, [magicLinkSent]);

  // Check if already have a session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setScreenshotSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        });
      }
    };
    checkSession();
  }, []);

  // Send magic link to email
  const handleSendMagicLink = async () => {
    if (!magicLinkEmail || !magicLinkEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: window.location.href, // Redirect back to this page
        },
      });
      if (error) {
        throw error;
      }
      setMagicLinkSent(true);
      toast.success('Magic link sent! Check your email and click the link to authenticate.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send magic link');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Clear authentication
  const handleClearAuth = () => {
    setScreenshotSession(null);
    setMagicLinkEmail('');
    setMagicLinkSent(false);
    toast.info('Screenshot session cleared');
  };

  // Helper to get public URL from storage path
  const getPublicUrl = (storagePath: string) => {
    return `https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/doc_screenshots/${storagePath}`;
  };

  const handleCreate = async () => {
    if (!newScreenshot.route_path) {
      toast.error('Route path is required');
      return;
    }
    await createScreenshot.mutateAsync({
      route_path: newScreenshot.route_path,
      description: newScreenshot.description || undefined,
      article_id: newScreenshot.article_id || undefined,
    });
    setNewScreenshot({ route_path: '', description: '', article_id: '' });
  };

  const handleSmartCapture = async () => {
    if (!selectedArticleId) {
      toast.error('Please select an article');
      return;
    }

    const article = articles?.find(a => a.id === selectedArticleId);
    if (!article) {
      toast.error('Article not found');
      return;
    }

    try {
      await smartCapture({
        articleId: article.id,
        articleContent: article.content || article.excerpt || '',
        articleTitle: article.title,
        module: article.module,
        orgSlug,
        privacyOptions,
      });
      setSmartCaptureOpen(false);
      setSelectedArticleId('');
    } catch (error) {
      // Error handled by hook
    }
  };

  const pendingCount = screenshots?.filter(s => s.status === 'pending').length || 0;
  const unanalyzedCount = screenshots?.filter(s => s.status === 'completed' && !s.is_analyzed).length || 0;
  const routeCount = routes?.length || 0;

  // Group routes by module
  const routesByModule = routes?.reduce<Record<string, ScreenshotRoute[]>>((acc, route) => {
    if (!acc[route.module]) acc[route.module] = [];
    acc[route.module].push(route);
    return acc;
  }, {}) || {};

  const handleCaptureModule = async () => {
    if (!selectedModule) {
      toast.error('Please select a module');
      return;
    }
    captureModuleScreenshots.mutate({ 
      module: selectedModule, 
      orgSlug, 
      analyzeAfterCapture: true,
      accessToken: screenshotSession?.accessToken,
      refreshToken: screenshotSession?.refreshToken,
    });
  };

  const handleCaptureAll = async () => {
    captureModuleScreenshots.mutate({ 
      captureAll: true, 
      orgSlug, 
      analyzeAfterCapture: true,
      accessToken: screenshotSession?.accessToken,
      refreshToken: screenshotSession?.refreshToken,
    });
  };

  return (
    <div className="space-y-6">
      {/* OTP Authentication Card */}
      <Card className={`border-2 ${screenshotSession ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {screenshotSession ? (
              <>
                <ShieldCheck className="h-5 w-5 text-green-500" />
                Authenticated for Screenshots
              </>
            ) : (
              <>
                <KeyRound className="h-5 w-5 text-amber-500" />
                Authenticate for Screenshots
              </>
            )}
          </CardTitle>
          <CardDescription>
            {screenshotSession 
              ? 'Your session is active. You can now capture authenticated app screens.' 
              : 'Enter OTP to capture authenticated app screens (login required for protected routes).'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {screenshotSession ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-500/30">
                  <Check className="h-3 w-3 mr-1" />
                  Session Active
                </Badge>
                <span className="text-sm text-muted-foreground">Ready to capture protected routes</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearAuth}>
                Clear Session
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {!magicLinkSent ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter service account email"
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMagicLink()}
                    />
                  </div>
                  <Button 
                    onClick={handleSendMagicLink} 
                    disabled={isAuthenticating || !magicLinkEmail}
                  >
                    {isAuthenticating ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    Send Magic Link
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                  <Mail className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Magic link sent to {magicLinkEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      Click the link in your email to authenticate. This page will update automatically.
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleSendMagicLink}
                    disabled={isAuthenticating}
                  >
                    Resend
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setMagicLinkSent(false); setMagicLinkEmail(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Smart Capture Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Smart Capture
          </CardTitle>
          <CardDescription>
            Capture screenshots of all app modules and analyze with AI for documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 border-r pr-4">
              <Label className="text-sm">Org Slug:</Label>
              <Input
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="globalyhub"
                className="w-32"
              />
            </div>

            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_MODULES.map((mod) => (
                  <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleCaptureModule}
              disabled={!selectedModule || captureModuleScreenshots.isPending}
            >
              {captureModuleScreenshots.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Capture Module
            </Button>

            <Button 
              className="gap-2"
              onClick={handleCaptureAll}
              disabled={captureModuleScreenshots.isPending}
            >
              {captureModuleScreenshots.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Capture All ({routeCount} routes)
            </Button>

            {pendingCount > 0 && (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => captureAllPending.mutate(screenshotSession || undefined)}
                disabled={captureAllPending.isPending || !screenshotSession}
                title={!screenshotSession ? 'Authenticate first to capture screenshots' : undefined}
              >
                {captureAllPending.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Pending ({pendingCount})
              </Button>
            )}

            {unanalyzedCount > 0 && (
              <Button 
                variant="secondary" 
                className="gap-2"
                onClick={() => analyzeAllScreenshots.mutate(selectedModule || undefined)}
                disabled={analyzeAllScreenshots.isPending}
              >
                {analyzeAllScreenshots.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analyze ({unanalyzedCount})
              </Button>
            )}

            <Dialog open={smartCaptureOpen} onOpenChange={setSmartCaptureOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Article Smart Capture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Smart Screenshot Capture
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Article</Label>
                    <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an article to analyze" />
                      </SelectTrigger>
                      <SelectContent>
                        {articles?.map((article) => (
                          <SelectItem key={article.id} value={article.id}>
                            <span className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{article.module}</Badge>
                              {article.title}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Privacy Options</Label>
                    <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mask-names" className="font-normal cursor-pointer">
                          Mask real names with demo names
                        </Label>
                        <Switch
                          id="mask-names"
                          checked={privacyOptions.maskNames}
                          onCheckedChange={(checked) => 
                            setPrivacyOptions(prev => ({ ...prev, maskNames: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="blur-avatars" className="font-normal cursor-pointer">
                          Blur profile photos
                        </Label>
                        <Switch
                          id="blur-avatars"
                          checked={privacyOptions.blurAvatars}
                          onCheckedChange={(checked) => 
                            setPrivacyOptions(prev => ({ ...prev, blurAvatars: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="hide-emails" className="font-normal cursor-pointer">
                          Hide email addresses
                        </Label>
                        <Switch
                          id="hide-emails"
                          checked={privacyOptions.hideEmails}
                          onCheckedChange={(checked) => 
                            setPrivacyOptions(prev => ({ ...prev, hideEmails: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSmartCaptureOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSmartCapture} 
                    disabled={!selectedArticleId || isAnalyzing || isCapturing}
                    className="gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : isCapturing ? (
                      <>
                        <Camera className="h-4 w-4 animate-pulse" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Analyze & Capture
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Routes vs Screenshots */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'routes' | 'screenshots')}>
        <TabsList>
          <TabsTrigger value="routes" className="gap-2">
            Routes Registry
            <Badge variant="secondary" className="ml-1">{routeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="screenshots" className="gap-2">
            Captured Screenshots
            <Badge variant="secondary" className="ml-1">{screenshots?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capturable Routes</CardTitle>
              <CardDescription>
                Pre-defined routes across all modules that can be captured for documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {routesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : Object.keys(routesByModule).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No routes configured. Run the migration to populate default routes.
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(routesByModule).map(([module, moduleRoutes]) => (
                    <div key={module} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase text-xs">{module}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {moduleRoutes?.length} routes
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {moduleRoutes?.map((route) => (
                          <div key={route.id} className="p-3 border rounded-lg flex items-center justify-between bg-muted/30">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{route.feature_name}</span>
                                {route.is_flow_step && route.flow_name && (
                                  <Badge variant="secondary" className="text-xs">
                                    {route.flow_name} #{route.flow_order}
                                  </Badge>
                                )}
                              </div>
                              <div className="font-mono text-xs text-muted-foreground mt-1">
                                {route.route_template}
                              </div>
                              {route.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {route.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {route.requires_auth && (
                                <Badge variant="outline" className="text-xs">Auth</Badge>
                              )}
                              {route.requires_data && (
                                <Badge variant="outline" className="text-xs">Data</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screenshots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Custom Screenshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Route path (e.g., /org/demo/team)"
                  value={newScreenshot.route_path}
                  onChange={(e) => setNewScreenshot((prev) => ({ ...prev, route_path: e.target.value }))}
                />
                <Input
                  placeholder="Description"
                  value={newScreenshot.description}
                  onChange={(e) => setNewScreenshot((prev) => ({ ...prev, description: e.target.value }))}
                />
                <Select 
                  value={newScreenshot.article_id || 'none'} 
                  onValueChange={(value) => setNewScreenshot((prev) => ({ ...prev, article_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to article" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No article</SelectItem>
                    {articles?.map((article) => (
                      <SelectItem key={article.id} value={article.id}>{article.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="mt-4" onClick={handleCreate} disabled={createScreenshot.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Add Route
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Captured Screenshots</CardTitle>
            </CardHeader>
            <CardContent>
              {screenshotsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : screenshots?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No screenshots captured yet. Use "Capture All" to get started.
                </p>
              ) : (
                <div className="space-y-2">
                  {screenshots?.map((screenshot) => (
                    <div key={screenshot.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{screenshot.route_path}</span>
                          {screenshot.module && (
                            <Badge variant="outline" className="text-xs">{screenshot.module}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {screenshot.ai_description || screenshot.description || 'No description'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            screenshot.status === 'completed' ? 'default' : 
                            screenshot.status === 'failed' ? 'destructive' : 
                            screenshot.status === 'capturing' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {screenshot.status === 'capturing' && (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            )}
                            {screenshot.status}
                          </Badge>
                          {screenshot.is_analyzed && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI Analyzed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {screenshot.storage_path && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setPreviewUrl(getPublicUrl(screenshot.storage_path!));
                              setPreviewDescription(screenshot.ai_description || screenshot.description || screenshot.route_path);
                            }}
                          >
                            View
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => captureScreenshot.mutate(screenshot.id)}
                          disabled={screenshot.status === 'capturing' || captureScreenshot.isPending}
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Recapture
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteScreenshot.mutate(screenshot.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Screenshot Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Screenshot Preview</DialogTitle>
            {previewDescription && (
              <p className="text-sm text-muted-foreground">{previewDescription}</p>
            )}
          </DialogHeader>
          {previewUrl && (
            <div className="mt-4">
              <img 
                src={previewUrl} 
                alt="Screenshot preview" 
                className="w-full rounded-lg border shadow-sm"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Automated screenshot capture requires the BROWSERLESS_API_KEY and APP_BASE_URL secrets to be configured.
            Screenshots are captured at 1920x1080 resolution with 2x scaling and stored in the doc_screenshots bucket.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// API Docs Manager
const ApiDocsManager = () => {
  const { data: apiDocs, isLoading } = useApiDocumentation();
  const scanApiDocs = useScanApiDocumentation();
  const updateApiDoc = useUpdateApiDoc();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Auto-generated documentation for edge functions.
        </p>
        <Button onClick={() => scanApiDocs.mutate()} disabled={scanApiDocs.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${scanApiDocs.isPending ? 'animate-spin' : ''}`} />
          Scan Functions
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {apiDocs?.map((doc) => (
            <div key={doc.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{doc.method}</Badge>
                  <span className="font-mono font-medium">{doc.function_name}</span>
                  {doc.is_public ? (
                    <Badge variant="secondary">Public</Badge>
                  ) : (
                    <Badge variant="outline">Authenticated</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={doc.is_active}
                    onCheckedChange={(checked) => updateApiDoc.mutate({ id: doc.id, is_active: checked })}
                  />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {doc.description || 'No description'}
              </p>
              {doc.last_scanned_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last scanned: {new Date(doc.last_scanned_at).toLocaleString()}
                </p>
              )}
            </div>
          ))}
          {apiDocs?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No API documentation found. Click "Scan Functions" to generate.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
