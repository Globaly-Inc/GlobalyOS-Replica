/**
 * Wiki domain service hooks
 * Handles all wiki-related data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    staleTime: 60 * 1000, // 1 minute
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

      // Check for existing folder with same name at same level (case-insensitive)
      let checkQuery = supabase
        .from('wiki_folders')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .ilike('name', name.trim());
      
      if (parentId === null) {
        checkQuery = checkQuery.is('parent_id', null);
      } else {
        checkQuery = checkQuery.eq('parent_id', parentId);
      }

      const { data: existing } = await checkQuery.maybeSingle();

      if (existing) {
        throw new Error('A folder with this name already exists in this location');
      }

      // Note: created_by is set/overridden server-side by trigger (set_wiki_folder_created_by_trigger)
      // We still pass it here for TypeScript type compliance (column is non-nullable)
      const { error } = await supabase
        .from('wiki_folders')
        .insert({
          name: name.trim(),
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
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create folder');
      toast.error(message);
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

      // Note: created_by is set/overridden server-side by trigger (set_wiki_page_created_by_trigger)
      // We still pass it here for TypeScript type compliance (column is non-nullable)
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
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create page');
      toast.error(message);
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
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to save page');
      toast.error(message);
    },
  });
};

// Get folder contents count
export const useWikiFolderContentsCount = (folderId: string | null) => {
  return useQuery({
    queryKey: ['wiki-folder-contents-count', folderId],
    queryFn: async () => {
      if (!folderId) return null;

      const { data, error } = await supabase
        .rpc('get_wiki_folder_contents_count', { _folder_id: folderId });

      if (error) throw error;
      return data?.[0] as { folder_count: number; page_count: number; file_count: number } | null;
    },
    enabled: !!folderId,
  });
};

// Delete folder (recursive)
export const useDeleteWikiFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .rpc('delete_wiki_folder_recursive', { _folder_id: folderId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-folders'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      toast.success('Folder and contents deleted');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to delete folder');
      toast.error(message);
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
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to delete page');
      toast.error(message);
    },
  });
};

// Rename folder
export const useRenameWikiFolder = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({ folderId, name }: { folderId: string; name: string }) => {
      if (!currentOrg?.id) {
        throw new Error('Not authenticated');
      }

      // Get current folder's parent_id to check for duplicates at the same level
      const { data: currentFolder, error: fetchError } = await supabase
        .from('wiki_folders')
        .select('parent_id')
        .eq('id', folderId)
        .single();

      if (fetchError || !currentFolder) throw fetchError || new Error('Folder not found');

      // Check for existing folder with same name at same level (case-insensitive)
      let checkQuery = supabase
        .from('wiki_folders')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .ilike('name', name.trim())
        .neq('id', folderId); // Exclude current folder

      if (currentFolder.parent_id === null) {
        checkQuery = checkQuery.is('parent_id', null);
      } else {
        checkQuery = checkQuery.eq('parent_id', currentFolder.parent_id);
      }

      const { data: existing } = await checkQuery.maybeSingle();

      if (existing) {
        throw new Error('A folder with this name already exists in this location');
      }

      const { error } = await supabase
        .from('wiki_folders')
        .update({ name: name.trim() })
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-folders'] });
      toast.success('Folder renamed');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to rename folder');
      toast.error(message);
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
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to rename page');
      toast.error(message);
    },
  });
};

// Move folder
export const useMoveWikiFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) => {
      const { error } = await supabase
        .from('wiki_folders')
        .update({ parent_id: newParentId })
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-folders'] });
      toast.success('Folder moved');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to move folder');
      toast.error(message);
    },
  });
};

// Move page
export const useMoveWikiPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, newFolderId }: { pageId: string; newFolderId: string | null }) => {
      const { error } = await supabase
        .from('wiki_pages')
        .update({ folder_id: newFolderId })
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-page', variables.pageId] });
      toast.success('Page moved');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to move page');
      toast.error(message);
    },
  });
};

// Duplicate page
export const useDuplicateWikiPage = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ pageId }: { pageId: string }) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      // Fetch original page
      const { data: originalPage, error: fetchError } = await supabase
        .from('wiki_pages')
        .select('title, content, folder_id')
        .eq('id', pageId)
        .single();

      if (fetchError || !originalPage) throw fetchError || new Error('Page not found');

      // Create duplicate - created_by is set/overridden server-side by trigger
      // We still pass it here for TypeScript type compliance (column is non-nullable)
      const { data, error } = await supabase
        .from('wiki_pages')
        .insert({
          title: `${originalPage.title} (Copy)`,
          content: originalPage.content,
          folder_id: originalPage.folder_id,
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
      toast.success('Page duplicated');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to duplicate page');
      toast.error(message);
    },
  });
};

// Restore page version
export const useRestoreWikiPageVersion = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      pageId, 
      versionTitle, 
      versionContent 
    }: { 
      pageId: string; 
      versionTitle: string; 
      versionContent: string | null;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      // Save current version to history before restoring
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

      // Restore the old version
      const { error } = await supabase
        .from('wiki_pages')
        .update({
          title: versionTitle,
          content: versionContent,
          updated_by: currentEmployee.id,
        })
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wiki-page', variables.pageId] });
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-page-versions', variables.pageId] });
      toast.success('Version restored');
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to restore version');
      toast.error(message);
    },
  });
};

// Transfer ownership
export const useTransferWikiOwnership = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      itemType, 
      itemId, 
      newOwnerId,
      itemName 
    }: { 
      itemType: 'folder' | 'page'; 
      itemId: string; 
      newOwnerId: string;
      itemName?: string;
    }) => {
      const { data, error } = await supabase.rpc('transfer_wiki_ownership', {
        _item_type: itemType,
        _item_id: itemId,
        _new_owner_id: newOwnerId,
      });

      if (error) throw error;
      
      // Create notification for the new owner
      if (currentOrg?.id && currentEmployee?.id) {
        // Get the new owner's user_id
        const { data: newOwnerData } = await supabase
          .from('employees')
          .select('user_id')
          .eq('id', newOwnerId)
          .single();
        
        if (newOwnerData?.user_id) {
          // Get current user's name for the notification message
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentEmployee.user_id)
            .single();
          
          const senderName = currentUserProfile?.full_name || 'Someone';
          const itemTypeName = itemType === 'folder' ? 'folder' : 'page';
          
          await supabase.from('notifications').insert({
            user_id: newOwnerData.user_id,
            organization_id: currentOrg.id,
            type: 'wiki_transfer',
            title: `You are now the owner of a wiki ${itemTypeName}`,
            message: `${senderName} transferred ownership of "${itemName || 'Untitled'}" to you`,
            reference_type: `wiki_${itemType}`,
            reference_id: itemId,
            actor_id: currentEmployee.id,
          });
        }
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wiki-folders'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-pages'] });
      if (variables.itemType === 'page') {
        queryClient.invalidateQueries({ queryKey: ['wiki-page', variables.itemId] });
      }
      toast.success('Ownership transferred successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to transfer ownership');
    },
  });
};
