/**
 * Documentation Manager Component
 * Admin interface for managing support documentation, screenshots, and API docs
 */

import { useState } from 'react';
import { 
  FileText, FolderOpen, Camera, Code, Plus, Pencil, Trash2, 
  Eye, EyeOff, RefreshCw, Search, Upload, ExternalLink
} from 'lucide-react';
import { AIGenerateCard } from './AIGenerateCard';
import { AIUpdateCard } from './AIUpdateCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  SUPPORT_MODULES,
  SupportArticle,
  SupportCategory,
  SupportScreenshot,
  ApiDocumentation,
} from '@/services/useSupportArticles';

export const DocumentationManager = () => {
  const [activeTab, setActiveTab] = useState('articles');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentation Manager</h2>
          <p className="text-muted-foreground">
            Manage support articles, screenshots, and API documentation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AIGenerateCard />
          <AIUpdateCard />
          <Button variant="outline" asChild>
            <a href="/support" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Support Center
            </a>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
  const [editingArticle, setEditingArticle] = useState<SupportArticle | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
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

  const handleCreate = async (data: Partial<SupportArticle>) => {
    await createArticle.mutateAsync(data as { module: string; title: string; slug: string });
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: Partial<SupportArticle> & { id: string }) => {
    await updateArticle.mutateAsync(data);
    setEditingArticle(null);
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
          {filteredArticles?.map((article) => (
            <div key={article.id} className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{article.title}</span>
                  <Badge variant="outline" className="text-xs capitalize">{article.module}</Badge>
                  {article.is_featured && <Badge className="text-xs">Featured</Badge>}
                </div>
                <p className="text-sm text-muted-foreground truncate">{article.excerpt}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
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
          ))}
          {filteredArticles?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No articles found.
            </div>
          )}
        </div>
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
  const { data: screenshots, isLoading } = useSupportScreenshots();
  const { data: articles } = useSupportArticles();
  const createScreenshot = useCreateScreenshot();
  const deleteScreenshot = useDeleteScreenshot();
  const captureScreenshot = useCaptureScreenshot();

  const [newScreenshot, setNewScreenshot] = useState({ route_path: '', description: '', article_id: '' });

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Screenshot Route</CardTitle>
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
          <CardTitle className="text-lg">Screenshot Routes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {screenshots?.map((screenshot) => (
                <div key={screenshot.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm">{screenshot.route_path}</div>
                    <div className="text-xs text-muted-foreground">
                      {screenshot.description || 'No description'}
                      {' • '}
                      <Badge variant={
                        screenshot.status === 'completed' ? 'default' : 
                        screenshot.status === 'failed' ? 'destructive' : 'secondary'
                      } className="text-xs">
                        {screenshot.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {screenshot.storage_path && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={screenshot.storage_path} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => captureScreenshot.mutate(screenshot.id)}
                      disabled={screenshot.status === 'capturing' || captureScreenshot.isPending}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Capture
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
              {screenshots?.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No screenshot routes configured.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Automated screenshot capture requires the BROWSERLESS_API_KEY secret to be configured.
            Screenshots are captured at 1280x720 resolution and stored in the doc_screenshots bucket.
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
