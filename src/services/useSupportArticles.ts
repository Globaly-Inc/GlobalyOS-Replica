/**
 * Support Articles Service
 * Hooks for fetching and managing support documentation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupportCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportArticle {
  id: string;
  category_id: string | null;
  module: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  screenshots: string[];
  sort_order: number;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  helpful_yes: number;
  helpful_no: number;
  target_roles: string[] | null;
  created_at: string;
  updated_at: string;
  category?: SupportCategory;
}

export interface SupportScreenshot {
  id: string;
  article_id: string | null;
  route_path: string;
  description: string | null;
  storage_path: string | null;
  status: 'pending' | 'capturing' | 'completed' | 'failed';
  error_message: string | null;
  captured_at: string | null;
  module: string | null;
  ai_description: string | null;
  ui_elements: string[] | null;
  feature_context: string | null;
  flow_group: string | null;
  flow_order: number | null;
  is_analyzed: boolean;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreenshotRoute {
  id: string;
  module: string;
  route_template: string;
  feature_name: string;
  description: string | null;
  is_flow_step: boolean;
  flow_name: string | null;
  flow_order: number | null;
  requires_auth: boolean;
  requires_data: boolean;
  sample_data_notes: string | null;
  highlight_selector: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiDocumentation {
  id: string;
  function_name: string;
  description: string | null;
  method: string;
  is_public: boolean;
  request_schema: Record<string, unknown> | null;
  response_schema: Record<string, unknown> | null;
  example_request: Record<string, unknown> | null;
  example_response: Record<string, unknown> | null;
  tags: string[];
  is_active: boolean;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

// Categories
export const useSupportCategories = () => {
  return useQuery({
    queryKey: ['support-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_categories')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as SupportCategory[];
    },
  });
};

// Articles
export const useSupportArticles = (options?: { 
  module?: string; 
  categorySlug?: string;
  featured?: boolean;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['support-articles', options],
    queryFn: async () => {
      let query = supabase
        .from('support_articles')
        .select('*, category:support_categories(*)');
      
      if (options?.module) {
        query = query.eq('module', options.module);
      }
      if (options?.featured) {
        query = query.eq('is_featured', true);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      query = query.order('sort_order');
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter by category slug if provided
      let articles = data as (SupportArticle & { category: SupportCategory | null })[];
      if (options?.categorySlug) {
        articles = articles.filter(a => a.category?.slug === options.categorySlug);
      }
      
      return articles;
    },
  });
};

export const useSupportArticle = (module: string, slug: string) => {
  return useQuery({
    queryKey: ['support-article', module, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_articles')
        .select('*, category:support_categories(*)')
        .eq('module', module)
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as SupportArticle & { category: SupportCategory | null };
    },
    enabled: !!module && !!slug,
  });
};

export const useSearchSupportArticles = (query: string) => {
  return useQuery({
    queryKey: ['support-articles-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const { data, error } = await supabase
        .from('support_articles')
        .select('*, category:support_categories(*)')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
        .limit(20);
      
      if (error) throw error;
      return data as (SupportArticle & { category: SupportCategory | null })[];
    },
    enabled: query.length >= 2,
  });
};

// Screenshots
export const useSupportScreenshots = (articleId?: string) => {
  return useQuery({
    queryKey: ['support-screenshots', articleId],
    queryFn: async () => {
      let query = supabase
        .from('support_screenshots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (articleId) {
        query = query.eq('article_id', articleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as SupportScreenshot[];
    },
  });
};

// API Documentation
export const useApiDocumentation = () => {
  return useQuery({
    queryKey: ['api-documentation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_documentation')
        .select('*')
        .order('function_name');
      
      if (error) throw error;
      return data as ApiDocumentation[];
    },
  });
};

// Admin Mutations
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: { name: string; slug: string; description?: string; icon?: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('support_categories')
        .insert([category])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-categories'] });
      toast.success('Category created');
    },
    onError: (error) => {
      toast.error('Failed to create category: ' + error.message);
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('support_categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-categories'] });
      toast.success('Category updated');
    },
    onError: (error) => {
      toast.error('Failed to update category: ' + error.message);
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-categories'] });
      toast.success('Category deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete category: ' + error.message);
    },
  });
};

export const useCreateArticle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (article: { 
      module: string; 
      title: string; 
      slug: string; 
      content?: string; 
      excerpt?: string; 
      category_id?: string; 
      is_published?: boolean;
      suggested_screenshots?: Array<{
        route?: string;
        description: string;
        highlight_selector?: string;
        annotation?: string;
      }>;
    }) => {
      // Extract suggested screenshots before insert
      const { suggested_screenshots, ...articleData } = article;
      
      const { data, error } = await supabase
        .from('support_articles')
        .insert([articleData])
        .select()
        .single();
      
      if (error) throw error;
      
      // If there are suggested screenshots, create screenshot records
      if (suggested_screenshots && suggested_screenshots.length > 0 && data?.id) {
        const screenshotRecords = suggested_screenshots.map((ss) => ({
          article_id: data.id,
          route_path: ss.route || `/support/features/${article.module}/${article.slug}`,
          description: ss.description,
          status: 'pending' as const,
        }));
        
        await supabase
          .from('support_screenshots')
          .insert(screenshotRecords);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-articles'] });
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      toast.success('Article created');
    },
    onError: (error) => {
      toast.error('Failed to create article: ' + error.message);
    },
  });
};

export const useUpdateArticle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportArticle> & { id: string }) => {
      const { data, error } = await supabase
        .from('support_articles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-articles'] });
      queryClient.invalidateQueries({ queryKey: ['support-article'] });
      toast.success('Article updated');
    },
    onError: (error) => {
      toast.error('Failed to update article: ' + error.message);
    },
  });
};

export const useDeleteArticle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_articles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-articles'] });
      toast.success('Article deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete article: ' + error.message);
    },
  });
};

export const useCreateScreenshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (screenshot: { route_path: string; article_id?: string; description?: string }) => {
      const { data, error } = await supabase
        .from('support_screenshots')
        .insert([screenshot])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      toast.success('Screenshot route added');
    },
    onError: (error) => {
      toast.error('Failed to add screenshot: ' + error.message);
    },
  });
};

export const useDeleteScreenshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_screenshots')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      toast.success('Screenshot deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete screenshot: ' + error.message);
    },
  });
};

export const useCaptureScreenshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (screenshotId: string) => {
      const { data, error } = await supabase.functions.invoke('capture-doc-screenshot', {
        body: { screenshotId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      toast.success('Screenshot capture started');
    },
    onError: (error) => {
      toast.error('Failed to capture screenshot: ' + error.message);
    },
  });
};

export const useScanApiDocumentation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('scan-api-documentation');
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-documentation'] });
      toast.success('API documentation scan completed');
    },
    onError: (error) => {
      toast.error('Failed to scan API documentation: ' + error.message);
    },
  });
};

export const useUpdateApiDoc = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, description, is_active, tags }: { id: string; description?: string; is_active?: boolean; tags?: string[] }) => {
      const { data, error } = await supabase
        .from('api_documentation')
        .update({ description, is_active, tags, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-documentation'] });
      toast.success('API documentation updated');
    },
    onError: (error) => {
      toast.error('Failed to update API doc: ' + error.message);
    },
  });
};

// Track article view - uses direct update instead of RPC
export const useTrackArticleView = () => {
  return useMutation({
    mutationFn: async (articleId: string) => {
      // Get current view count and increment
      const { data: article } = await supabase
        .from('support_articles')
        .select('view_count')
        .eq('id', articleId)
        .single();
      
      if (article) {
        await supabase
          .from('support_articles')
          .update({ view_count: (article.view_count || 0) + 1 })
          .eq('id', articleId);
      }
    },
  });
};

// Track article helpfulness
export const useTrackArticleHelpfulness = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ articleId, helpful }: { articleId: string; helpful: boolean }) => {
      const column = helpful ? 'helpful_yes' : 'helpful_no';
      const { data: article } = await supabase
        .from('support_articles')
        .select('helpful_yes, helpful_no')
        .eq('id', articleId)
        .single();
      
      if (article) {
        const currentValue = helpful ? article.helpful_yes : article.helpful_no;
        await supabase
          .from('support_articles')
          .update({ [column]: (currentValue || 0) + 1 })
          .eq('id', articleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-article'] });
      toast.success('Thanks for your feedback!');
    },
  });
};

// Auto-capture all screenshots for an article
export const useAutoCaptureArticleScreenshots = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (articleId: string) => {
      // Get all pending screenshots for this article
      const { data: screenshots, error } = await supabase
        .from('support_screenshots')
        .select('*')
        .eq('article_id', articleId)
        .eq('status', 'pending');
      
      if (error) throw error;
      if (!screenshots || screenshots.length === 0) {
        return { message: 'No pending screenshots to capture' };
      }
      
      // Invoke the auto-capture function for each screenshot
      const capturePromises = screenshots.map(async (screenshot) => {
        try {
          await supabase.functions.invoke('capture-doc-screenshot', {
            body: { screenshotId: screenshot.id },
          });
          return { id: screenshot.id, success: true };
        } catch (e) {
          return { id: screenshot.id, success: false, error: e };
        }
      });
      
      const results = await Promise.all(capturePromises);
      return { 
        total: screenshots.length,
        captured: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      if (data.total > 0) {
        toast.success(`Started capturing ${data.total} screenshots`);
      }
    },
    onError: (error) => {
      toast.error('Failed to capture screenshots: ' + error.message);
    },
  });
};

// Bulk create screenshots for an article
export const useBulkCreateScreenshots = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ articleId, screenshots }: { 
      articleId: string; 
      screenshots: Array<{ description: string; route_path?: string }>;
    }) => {
      const screenshotRecords = screenshots.map((ss) => ({
        article_id: articleId,
        route_path: ss.route_path || '',
        description: ss.description,
        status: 'pending' as const,
      }));
      
      const { data, error } = await supabase
        .from('support_screenshots')
        .insert(screenshotRecords)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      toast.success('Screenshot placeholders created');
    },
    onError: (error) => {
      toast.error('Failed to create screenshots: ' + error.message);
    },
  });
};

// Screenshot Routes (registry)
export const useScreenshotRoutes = (module?: string) => {
  return useQuery({
    queryKey: ['screenshot-routes', module],
    queryFn: async () => {
      let query = supabase
        .from('support_screenshot_routes')
        .select('*')
        .eq('is_active', true)
        .order('module')
        .order('flow_order', { nullsFirst: true });
      
      if (module) {
        query = query.eq('module', module);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ScreenshotRoute[];
    },
  });
};

// Capture all screenshots for a module
export const useCaptureModuleScreenshots = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      module, 
      orgSlug = 'globalyhub',
      captureAll = false,
      analyzeAfterCapture = true,
    }: { 
      module?: string; 
      orgSlug?: string;
      captureAll?: boolean;
      analyzeAfterCapture?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('capture-module-screenshots', {
        body: { module, orgSlug, captureAll, analyzeAfterCapture },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      queryClient.invalidateQueries({ queryKey: ['screenshot-routes'] });
      
      if (data?.summary) {
        const { created, skipped, captured, captureFailed } = data.summary;
        if (created > 0) {
          toast.success(`Created ${created} screenshots, ${captured} captured, ${skipped} skipped`);
        } else if (skipped > 0) {
          toast.info(`All ${skipped} routes already have screenshots`);
        }
        if (captureFailed > 0) {
          toast.warning(`${captureFailed} captures failed`);
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to capture module screenshots: ' + error.message);
    },
  });
};

// Analyze a screenshot with AI vision
export const useAnalyzeScreenshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (screenshotId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-analyze-screenshot', {
        body: { screenshotId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      toast.success('Screenshot analyzed');
    },
    onError: (error) => {
      toast.error('Failed to analyze screenshot: ' + error.message);
    },
  });
};

// Analyze all unanalyzed screenshots
export const useAnalyzeAllScreenshots = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (module?: string) => {
      // Get all completed but not analyzed screenshots
      let query = supabase
        .from('support_screenshots')
        .select('id')
        .eq('status', 'completed')
        .eq('is_analyzed', false);
      
      if (module) {
        query = query.eq('module', module);
      }
      
      const { data: screenshots, error } = await query;
      if (error) throw error;
      
      if (!screenshots || screenshots.length === 0) {
        return { analyzed: 0, total: 0 };
      }
      
      let analyzedCount = 0;
      for (const screenshot of screenshots) {
        try {
          await supabase.functions.invoke('ai-analyze-screenshot', {
            body: { screenshotId: screenshot.id },
          });
          analyzedCount++;
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (err) {
          console.warn(`Failed to analyze screenshot ${screenshot.id}:`, err);
        }
      }
      
      return { analyzed: analyzedCount, total: screenshots.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      if (data.total > 0) {
        toast.success(`Analyzed ${data.analyzed} of ${data.total} screenshots`);
      } else {
        toast.info('No screenshots need analysis');
      }
    },
    onError: (error) => {
      toast.error('Failed to analyze screenshots: ' + error.message);
    },
  });
};

// Module definitions with metadata
export const SUPPORT_MODULES = [
  { id: 'general', name: 'General', icon: 'Info', description: 'General platform guides' },
  { id: 'team', name: 'Team Management', icon: 'Users', description: 'Managing employees and team structure' },
  { id: 'leave', name: 'Leave Requests', icon: 'Calendar', description: 'Leave management and policies' },
  { id: 'attendance', name: 'Attendance', icon: 'Clock', description: 'Time tracking and attendance' },
  { id: 'calendar', name: 'Calendar', icon: 'CalendarDays', description: 'Events and holidays' },
  { id: 'kpi', name: 'KPIs & OKRs', icon: 'Target', description: 'Performance metrics and goals' },
  { id: 'reviews', name: 'Performance Reviews', icon: 'Star', description: 'Employee performance reviews' },
  { id: 'wiki', name: 'Knowledge Base', icon: 'BookOpen', description: 'Wiki and documentation' },
  { id: 'chat', name: 'Chat', icon: 'MessageSquare', description: 'Team messaging' },
  { id: 'tasks', name: 'Tasks', icon: 'CheckSquare', description: 'Task management' },
  { id: 'crm', name: 'CRM', icon: 'Briefcase', description: 'Customer relationship management' },
  { id: 'payroll', name: 'Payroll', icon: 'DollarSign', description: 'Payroll and compensation' },
  { id: 'settings', name: 'Settings', icon: 'Settings', description: 'Organization settings' },
] as const;
