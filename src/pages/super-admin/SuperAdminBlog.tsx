import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Eye, EyeOff, Sparkles, Search, Bot, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useBlogPosts, useDeleteBlogPost, useBlogKeywords } from "@/services/useBlog";
import { BlogKeywordsManager } from "@/components/blog/BlogKeywordsManager";
import { BlogAIGenerateDialog } from "@/components/blog/BlogAIGenerateDialog";
import { BlogReviewCard } from "@/components/blog/BlogReviewCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SuperAdminBlog() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);

  const { data: posts, isLoading } = useBlogPosts();
  const { data: keywords } = useBlogKeywords();
  const deleteMutation = useDeleteBlogPost();

  const filteredPosts = posts?.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    switch (activeTab) {
      case "drafts":
        return matchesSearch && !post.is_published && post.generation_status !== "pending_review";
      case "pending":
        return matchesSearch && post.generation_status === "pending_review";
      case "published":
        return matchesSearch && post.is_published;
      case "ai-generated":
        return matchesSearch && post.ai_generated;
      default:
        return matchesSearch;
    }
  });

  const counts = {
    all: posts?.length || 0,
    drafts: posts?.filter(p => !p.is_published && p.generation_status !== "pending_review").length || 0,
    pending: posts?.filter(p => p.generation_status === "pending_review").length || 0,
    published: posts?.filter(p => p.is_published).length || 0,
    aiGenerated: posts?.filter(p => p.ai_generated).length || 0,
  };

  const handleDelete = () => {
    if (deletePostId) {
      deleteMutation.mutate(deletePostId, {
        onSuccess: () => {
          toast.success("Post deleted successfully");
          setDeletePostId(null);
        },
      });
    }
  };

  const getStatusBadge = (post: typeof posts extends (infer T)[] | undefined ? T : never) => {
    if (post.generation_status === "pending_review") {
      return <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
    }
    if (post.is_published) {
      return <Badge className="bg-emerald-500/10 text-emerald-600"><Eye className="w-3 h-3 mr-1" />Published</Badge>;
    }
    return <Badge variant="outline"><EyeOff className="w-3 h-3 mr-1" />Draft</Badge>;
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <SuperAdminPageHeader 
          title="Blog Management" 
          description="Create, manage, and publish blog posts with AI assistance"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Blogs
              </Button>
              <Button onClick={() => navigate("/super-admin/blog/new")}>
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="drafts">Drafts ({counts.drafts})</TabsTrigger>
              <TabsTrigger value="pending">Pending Review ({counts.pending})</TabsTrigger>
              <TabsTrigger value="published">Published ({counts.published})</TabsTrigger>
              <TabsTrigger value="ai-generated">
                <Bot className="w-3 h-3 mr-1" />
                AI Generated ({counts.aiGenerated})
              </TabsTrigger>
              <TabsTrigger value="keywords">Keywords ({keywords?.length || 0})</TabsTrigger>
            </TabsList>

            {activeTab !== "keywords" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            )}
          </div>

          <TabsContent value="keywords" className="mt-6">
            <BlogKeywordsManager />
          </TabsContent>

          {["all", "drafts", "pending", "published", "ai-generated"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              {isLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-1/3 bg-muted rounded" />
                          <div className="h-4 w-1/4 bg-muted rounded" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredPosts?.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    {tab === "pending" ? <Clock className="w-6 h-6 text-muted-foreground" /> : <Plus className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {tab === "pending" ? "No posts pending review" : "No posts found"}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {tab === "pending" 
                      ? "AI-generated posts will appear here for your approval"
                      : "Create your first blog post or generate content with AI"}
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate with AI
                    </Button>
                    <Button onClick={() => navigate("/super-admin/blog/new")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Manually
                    </Button>
                  </div>
                </Card>
              ) : tab === "pending" ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPosts?.map((post) => (
                    <BlogReviewCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredPosts?.map((post) => (
                    <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        {post.cover_image_url ? (
                          <img src={post.cover_image_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-bold text-primary/50">{post.title.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary">{post.category.replace("-", " ")}</Badge>
                            {getStatusBadge(post)}
                            {post.ai_generated && (
                              <Badge variant="outline" className="border-primary/50 text-primary">
                                <Bot className="w-3 h-3 mr-1" />AI
                              </Badge>
                            )}
                            {post.seo_score !== null && post.seo_score !== undefined && (
                              <Badge variant={post.seo_score >= 70 ? "default" : "outline"} className={post.seo_score >= 70 ? "bg-emerald-500" : ""}>
                                SEO: {post.seo_score}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            By {post.author_name} • {format(new Date(post.created_at), "dd MMM yyyy")}
                            {post.reading_time_minutes && ` • ${post.reading_time_minutes} min read`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/super-admin/blog/${post.id}/edit`)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletePostId(post.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <BlogAIGenerateDialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen} />

      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminLayout>
  );
}
