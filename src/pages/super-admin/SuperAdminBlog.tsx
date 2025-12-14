import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string;
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

const categories = [
  { value: "product-updates", label: "Product Updates" },
  { value: "hr-tips", label: "HR Tips" },
  { value: "company-culture", label: "Company Culture" },
  { value: "general", label: "General" },
];

export default function SuperAdminBlog() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image_url: "",
    category: "general",
    author_name: "",
    is_published: false,
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("blog_posts").insert({
        ...data,
        published_at: data.is_published ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Post created successfully");
      resetForm();
    },
    onError: (error) => toast.error(`Failed to create post: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const updateData = {
        ...data,
        published_at: data.is_published && !editingPost?.published_at 
          ? new Date().toISOString() 
          : editingPost?.published_at,
      };
      const { error } = await supabase.from("blog_posts").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Post updated successfully");
      resetForm();
    },
    onError: (error) => toast.error(`Failed to update post: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Post deleted successfully");
    },
    onError: (error) => toast.error(`Failed to delete post: ${error.message}`),
  });

  const resetForm = () => {
    setFormData({ title: "", slug: "", excerpt: "", content: "", cover_image_url: "", category: "general", author_name: "", is_published: false });
    setEditingPost(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      cover_image_url: post.cover_image_url || "",
      category: post.category,
      author_name: post.author_name,
      is_published: post.is_published,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <SuperAdminPageHeader 
          title="Blog Management" 
          description="Create and manage blog posts"
          actions={
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />New Post</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={formData.title} onChange={(e) => { setFormData({ ...formData, title: e.target.value, slug: generateSlug(e.target.value) }); }} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug</Label>
                      <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Author Name</Label>
                      <Input value={formData.author_name} onChange={(e) => setFormData({ ...formData, author_name: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cover Image URL</Label>
                    <Input value={formData.cover_image_url} onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Excerpt</Label>
                    <Textarea value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Content (HTML)</Label>
                    <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={10} required />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.is_published} onCheckedChange={(c) => setFormData({ ...formData, is_published: c })} />
                    <Label>Published</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button type="submit">{editingPost ? "Update" : "Create"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="grid gap-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : posts?.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No blog posts yet. Create your first one!</p>
            </Card>
          ) : (
            posts?.map((post) => (
              <Card key={post.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted" />
                  )}
                  <div>
                    <h3 className="font-semibold text-foreground">{post.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{post.category}</Badge>
                      {post.is_published ? (
                        <Badge className="bg-success/10 text-success"><Eye className="w-3 h-3 mr-1" />Published</Badge>
                      ) : (
                        <Badge variant="outline"><EyeOff className="w-3 h-3 mr-1" />Draft</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{format(new Date(post.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(post)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(post.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
