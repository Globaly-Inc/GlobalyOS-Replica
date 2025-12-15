import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Send, Loader2, ImageIcon, X } from "lucide-react";
import { BlogRichEditor } from "@/components/blog/BlogRichEditor";
import { BlogSEOPanel } from "@/components/blog/BlogSEOPanel";
import { 
  useBlogPost, 
  useCreateBlogPost, 
  useUpdateBlogPost, 
  generateSlug, 
  calculateReadingTime,
  calculateSEOScore,
  uploadBlogImage,
  BlogPost 
} from "@/services/useBlog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  'HR Technology',
  'Employee Management',
  'Workplace Culture',
  'Remote Work',
  'Leadership',
  'Performance',
  'Compliance',
  'Industry News',
];

export default function SuperAdminBlogEditor() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!postId;

  const { data: existingPost, isLoading: isLoadingPost } = useBlogPost(postId);
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("HR Technology");
  const [authorName, setAuthorName] = useState("GlobalyOS Team");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing post data
  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title);
      setSlug(existingPost.slug);
      setContent(existingPost.content);
      setExcerpt(existingPost.excerpt || "");
      setCategory(existingPost.category);
      setAuthorName(existingPost.author_name);
      setCoverImageUrl(existingPost.cover_image_url || "");
      setFocusKeyword(existingPost.focus_keyword || "");
      setMetaTitle(existingPost.meta_title || "");
      setMetaDescription(existingPost.meta_description || "");
    }
  }, [existingPost]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!isEditing && title) {
      setSlug(generateSlug(title));
    }
  }, [title, isEditing]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [title, content, excerpt, category, coverImageUrl, focusKeyword, metaTitle, metaDescription]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-save to localStorage
  useEffect(() => {
    const key = `blog-draft-${postId || 'new'}`;
    const timer = setTimeout(() => {
      if (title || content) {
        localStorage.setItem(key, JSON.stringify({
          title, slug, content, excerpt, category, authorName, 
          coverImageUrl, focusKeyword, metaTitle, metaDescription,
          savedAt: new Date().toISOString(),
        }));
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [title, slug, content, excerpt, category, authorName, coverImageUrl, focusKeyword, metaTitle, metaDescription, postId]);

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadBlogImage(file);
      setCoverImageUrl(url);
      toast.success('Cover image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const buildPostData = (isPublished: boolean = false): any => {
    const seoScore = calculateSEOScore({
      title, slug, content, focus_keyword: focusKeyword,
      meta_description: metaDescription, cover_image_url: coverImageUrl,
    });

    return {
      title,
      slug,
      content,
      excerpt: excerpt || metaDescription?.substring(0, 160),
      category,
      author_name: authorName,
      cover_image_url: coverImageUrl || null,
      focus_keyword: focusKeyword || null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      seo_score: seoScore,
      reading_time_minutes: calculateReadingTime(content),
      is_published: isPublished,
      // If AI generated and being approved
      ...(existingPost?.ai_generated && existingPost?.generation_status === 'pending_review' ? {
        generation_status: 'approved',
        reviewed_at: new Date().toISOString(),
      } : {}),
    };
  };

  const handleSaveDraft = async () => {
    if (!title) {
      toast.error('Please enter a title');
      return;
    }

    const data = buildPostData(false);

    if (isEditing) {
      updatePost.mutate({ id: postId, ...data }, {
        onSuccess: () => {
          setHasUnsavedChanges(false);
          localStorage.removeItem(`blog-draft-${postId}`);
        }
      });
    } else {
      createPost.mutate(data, {
        onSuccess: (newPost) => {
          setHasUnsavedChanges(false);
          localStorage.removeItem('blog-draft-new');
          navigate(`/super-admin/blog/${newPost.id}/edit`, { replace: true });
        }
      });
    }
  };

  const handlePublish = async () => {
    if (!title || !content) {
      toast.error('Please enter a title and content');
      return;
    }

    const data = buildPostData(true);

    if (isEditing) {
      updatePost.mutate({ id: postId, ...data }, {
        onSuccess: () => {
          setHasUnsavedChanges(false);
          localStorage.removeItem(`blog-draft-${postId}`);
          toast.success('Post published!');
        }
      });
    } else {
      createPost.mutate(data, {
        onSuccess: () => {
          setHasUnsavedChanges(false);
          localStorage.removeItem('blog-draft-new');
          navigate('/super-admin/blog');
        }
      });
    }
  };

  const handlePreview = () => {
    window.open(`/blog/${slug}?preview=true`, '_blank');
  };

  const isSaving = createPost.isPending || updatePost.isPending;

  if (isEditing && isLoadingPost) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusBadge = () => {
    if (existingPost?.is_published) return <Badge variant="default">Published</Badge>;
    if (existingPost?.generation_status === 'pending_review') return <Badge variant="secondary">Pending Review</Badge>;
    if (existingPost?.ai_generated) return <Badge variant="outline">AI Generated</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/blog')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 w-[400px]"
              />
              {isEditing && getStatusBadge()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={!slug}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save Draft
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={isSaving}>
              <Send className="h-4 w-4 mr-1" />
              Publish
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Slug */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>/blog/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-7 w-64 text-sm"
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              {coverImageUrl ? (
                <div className="relative group">
                  <img 
                    src={coverImageUrl} 
                    alt="Cover" 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setCoverImageUrl("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageUpload}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload cover image
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Content Editor */}
            <BlogRichEditor
              value={content}
              onChange={setContent}
              placeholder="Start writing your blog post..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-80 border-l bg-muted/30 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Post Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Post Settings</h3>
                
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Author</Label>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Author name"
                  />
                </div>
              </div>

              <Separator />

              {/* SEO Panel */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">SEO</h3>
                <BlogSEOPanel
                  title={title}
                  slug={slug}
                  content={content}
                  focusKeyword={focusKeyword}
                  metaTitle={metaTitle}
                  metaDescription={metaDescription}
                  onFocusKeywordChange={setFocusKeyword}
                  onMetaTitleChange={setMetaTitle}
                  onMetaDescriptionChange={setMetaDescription}
                />
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
