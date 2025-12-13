/**
 * Wiki domain service hooks
 * Handles all wiki-related data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import type { WikiFolder, WikiPage, WikiPageWithRelations } from '@/types';

// Fetch wiki folders
export const useWikiFolders = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['wiki-folders', currentOrg?.id],
    queryFn: async (): Promise<WikiFolder[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('wiki_folders')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('sort_order');

      if (error) throw error;

      return data as WikiFolder[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch wiki pages list
export const useWikiPages = (folderId?: string | null) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['wiki-pages', currentOrg?.id, folderId],
    queryFn: async (): Promise<WikiPage[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('wiki_pages')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('sort_order');

      if (folderId !== undefined) {
        query = folderId === null 
          ? query.is('folder_id', null)
          : query.eq('folder_id', folderId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as WikiPage[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch single wiki page with relations
export const useWikiPage = (pageId: string | undefined) => {
  return useQuery({
    queryKey: ['wiki-page', pageId],
    queryFn: async (): Promise<WikiPageWithRelations | null> => {
      if (!pageId) return null;

      const { data, error } = await supabase
        .from('wiki_pages')
        .select(`
          *,
          created_by_employee:employees!wiki_pages_created_by_fkey(
            id,
            profiles(full_name, avatar_url)
          ),
          updated_by_employee:employees!wiki_pages_updated_by_fkey(
            id,
            profiles(full_name, avatar_url)
          )
        `)
        .eq('id', pageId)
        .single();

      if (error) throw error;

      return data as unknown as WikiPageWithRelations;
    },
    enabled: !!pageId,
  });
};

// Create folder
export const useCreateWikiFolder = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('wiki_folders')
        .insert({
          name,
          parent_id: parentId,
          organization_id: currentOrg.id,
          created_by: currentEmployee.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-folders'] });
      toast.success('Folder created');
    },
    onError: () => {
      toast.error('Failed to create folder');
    },
  });
};

// Create page
export const useCreateWikiPage = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ title, folderId }: { title: string; folderId: string | null }) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('wiki_pages')
        .insert({
          title,
          folder_id: folderId,
          organization_id: currentOrg.id,
          created_by: currentEmployee.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      toast.success('Page created');
    },
    onError: () => {
      toast.error('Failed to create page');
    },
  });
};

// Update page content
export const useUpdateWikiPage = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      pageId, 
      title, 
      content 
    }: { 
      pageId: string; 
      title: string; 
      content: string;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      // First save current version to history
      const { data: currentPage } = await supabase
        .from('wiki_pages')
        .select('title, content')
        .eq('id', pageId)
        .single();

      if (currentPage) {
        await supabase.from('wiki_page_versions').insert({
          page_id: pageId,
          organization_id: currentOrg.id,
          title: currentPage.title,
          content: currentPage.content,
          edited_by: currentEmployee.id,
        });
      }

      // Update page
      const { error } = await supabase
        .from('wiki_pages')
        .update({
          title,
          content,
          updated_by: currentEmployee.id,
        })
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wiki-page', variables.pageId] });
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      toast.success('Page saved');
    },
    onError: () => {
      toast.error('Failed to save page');
    },
  });
};

// Delete folder
export const useDeleteWikiFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('wiki_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-folders'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      toast.success('Folder deleted');
    },
    onError: () => {
      toast.error('Failed to delete folder');
    },
  });
};

// Delete page
export const useDeleteWikiPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase
        .from('wiki_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      toast.success('Page deleted');
    },
    onError: () => {
      toast.error('Failed to delete page');
    },
  });
};

// Rename folder
export const useRenameWikiFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, name }: { folderId: string; name: string }) => {
      const { error } = await supabase
        .from('wiki_folders')
        .update({ name })
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-folders'] });
      toast.success('Folder renamed');
    },
    onError: () => {
      toast.error('Failed to rename folder');
    },
  });
};

// Rename page
export const useRenameWikiPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, title }: { pageId: string; title: string }) => {
      const { error } = await supabase
        .from('wiki_pages')
        .update({ title })
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wiki-page', variables.pageId] });
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      toast.success('Page renamed');
    },
    onError: () => {
      toast.error('Failed to rename page');
    },
  });
};
