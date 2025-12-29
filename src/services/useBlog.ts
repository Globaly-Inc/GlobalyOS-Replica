import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  author_name: string;
  author_avatar_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // SEO fields
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  seo_score: number | null;
  canonical_url: string | null;
  og_image_url: string | null;
  // AI fields
  ai_generated: boolean;
  generation_status: 'pending_review' | 'approved' | 'rejected' | null;
  generation_metadata: Record<string, any> | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reading_time_minutes: number | null;
}

export interface BlogKeyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  relevance_score: number | null;
  category: string | null;
  is_active: boolean;
  suggested_by_ai: boolean;
  created_at: string;
  last_analyzed_at: string | null;
}

export interface CreateBlogPostInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  category: string;
  author_name: string;
  author_avatar_url?: string;
  is_published?: boolean;
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  seo_score?: number;
  canonical_url?: string;
  og_image_url?: string;
  reading_time_minutes?: number;
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {
  id: string;
  generation_status?: 'pending_review' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  published_at?: string;
  generation_metadata?: Record<string, any>;
  ai_generated?: boolean;
}

// Fetch all blog posts
export const useBlogPosts = (filter?: 'all' | 'drafts' | 'published' | 'pending_review' | 'ai_generated') => {
  return useQuery({
    queryKey: ['blog-posts', filter],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'drafts') {
        query = query.eq('is_published', false).or('generation_status.is.null,generation_status.eq.approved');
      } else if (filter === 'published') {
        query = query.eq('is_published', true);
      } else if (filter === 'pending_review') {
        query = query.eq('generation_status', 'pending_review');
      } else if (filter === 'ai_generated') {
        query = query.eq('ai_generated', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BlogPost[];
    },
  });
};

// Fetch single blog post
export const useBlogPost = (postId: string | undefined) => {
  return useQuery({
    queryKey: ['blog-post', postId],
    queryFn: async () => {
      if (!postId) return null;
      
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    enabled: !!postId,
  });
};

// Create blog post
export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBlogPostInput) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert({
          ...input,
          published_at: input.is_published ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Blog post created');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create blog post');
      toast.error(message);
    },
  });
};

// Update blog post
export const useUpdateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateBlogPostInput) => {
      const updateData: any = { ...input };
      
      // If publishing, set published_at
      if (input.is_published) {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-post', data.id] });
      toast.success('Blog post updated');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update blog post');
      toast.error(message);
    },
  });
};

// Delete blog post
export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Blog post deleted');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to delete blog post');
      toast.error(message);
    },
  });
};

// Fetch all keywords
export const useBlogKeywords = (filter?: 'all' | 'active' | 'ai_suggested') => {
  return useQuery({
    queryKey: ['blog-keywords', filter],
    queryFn: async () => {
      let query = supabase
        .from('blog_keywords')
        .select('*')
        .order('relevance_score', { ascending: false, nullsFirst: false });

      if (filter === 'active') {
        query = query.eq('is_active', true);
      } else if (filter === 'ai_suggested') {
        query = query.eq('suggested_by_ai', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BlogKeyword[];
    },
  });
};

// Create keyword
export const useCreateBlogKeyword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { keyword: string; category?: string; difficulty?: 'easy' | 'medium' | 'hard'; relevance_score?: number }) => {
      const { data, error } = await supabase
        .from('blog_keywords')
        .insert({
          keyword: input.keyword,
          category: input.category || null,
          difficulty: input.difficulty || null,
          relevance_score: input.relevance_score || null,
          is_active: true,
          suggested_by_ai: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BlogKeyword;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-keywords'] });
      toast.success('Keyword added');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to add keyword');
      toast.error(message);
    },
  });
};

// Update keyword
export const useUpdateBlogKeyword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<BlogKeyword> & { id: string }) => {
      const { data, error } = await supabase
        .from('blog_keywords')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BlogKeyword;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-keywords'] });
      toast.success('Keyword updated');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update keyword');
      toast.error(message);
    },
  });
};

// Delete keyword
export const useDeleteBlogKeyword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keywordId: string) => {
      const { error } = await supabase
        .from('blog_keywords')
        .delete()
        .eq('id', keywordId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-keywords'] });
      toast.success('Keyword deleted');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to delete keyword');
      toast.error(message);
    },
  });
};

// Generate slug from title
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Calculate reading time
export const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]*>/g, ''); // Strip HTML
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

// Calculate SEO score
export const calculateSEOScore = (post: Partial<BlogPost>): number => {
  let score = 0;
  const maxScore = 100;

  // Title checks (20 points)
  if (post.title) {
    if (post.title.length >= 30 && post.title.length <= 60) score += 10;
    else if (post.title.length > 0) score += 5;
    
    if (post.focus_keyword && post.title.toLowerCase().includes(post.focus_keyword.toLowerCase())) {
      score += 10;
    }
  }

  // Meta description (15 points)
  if (post.meta_description) {
    if (post.meta_description.length >= 120 && post.meta_description.length <= 160) score += 10;
    else if (post.meta_description.length > 0) score += 5;
    
    if (post.focus_keyword && post.meta_description.toLowerCase().includes(post.focus_keyword.toLowerCase())) {
      score += 5;
    }
  }

  // Content checks (40 points)
  if (post.content) {
    const text = post.content.replace(/<[^>]*>/g, '');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    // Word count
    if (wordCount >= 1000) score += 15;
    else if (wordCount >= 600) score += 10;
    else if (wordCount >= 300) score += 5;

    // Focus keyword in content
    if (post.focus_keyword) {
      const keywordCount = (text.toLowerCase().match(new RegExp(post.focus_keyword.toLowerCase(), 'g')) || []).length;
      const density = (keywordCount / wordCount) * 100;
      if (density >= 0.5 && density <= 2.5) score += 15;
      else if (keywordCount > 0) score += 5;
    }

    // Has headings
    if (/<h[2-4]/i.test(post.content)) score += 5;
    
    // Has images
    if (/<img/i.test(post.content)) score += 5;
  }

  // Slug (10 points)
  if (post.slug) {
    if (post.slug.length <= 50 && !post.slug.includes('--')) score += 5;
    if (post.focus_keyword && post.slug.includes(post.focus_keyword.toLowerCase().replace(/\s+/g, '-'))) {
      score += 5;
    }
  }

  // Featured image (10 points)
  if (post.cover_image_url) score += 10;

  // Focus keyword defined (5 points)
  if (post.focus_keyword && post.focus_keyword.length > 0) score += 5;

  return Math.min(score, maxScore);
};

// Upload image to blog-images bucket
export const uploadBlogImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('blog-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('blog-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Generate blog posts with AI
export const generateBlogPosts = async (params: {
  keywords: string[];
  audience: string;
  tone: string;
  wordCount: string;
  count?: number;
}) => {
  const { data, error } = await supabase.functions.invoke('generate-blog-posts', {
    body: {
      ...params,
      count: params.count ?? 5,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (data?.posts?.length === 0) {
    throw new Error('AI failed to generate posts. Please try again.');
  }
  return data;
};

// Research keywords with AI
export const researchKeywords = async () => {
  const { data, error } = await supabase.functions.invoke('research-blog-keywords', {
    body: {},
  });

  if (error) throw error;
  return data;
};

// Fix blog SEO issues with AI
export interface SEOFixInput {
  title: string;
  slug: string;
  content: string;
  focusKeyword: string;
  metaDescription: string;
  failedChecks: { label: string; info: string }[];
}

export interface SEOFixResult {
  title: string;
  slug: string;
  metaDescription: string;
  content: string;
}

export const fixBlogSEO = async (input: SEOFixInput): Promise<SEOFixResult> => {
  const { data, error } = await supabase.functions.invoke('fix-blog-seo', {
    body: input,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  
  return {
    title: data.title,
    slug: data.slug,
    metaDescription: data.metaDescription,
    content: data.content,
  };
};
