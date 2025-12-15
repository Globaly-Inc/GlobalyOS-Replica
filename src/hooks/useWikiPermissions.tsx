import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";

interface WikiItemPermissions {
  canView: boolean;
  canEdit: boolean;
}

interface PermissionsCache {
  [key: string]: WikiItemPermissions;
}

export const useWikiPermissions = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { isAdmin, isHR, isOwner } = useUserRole();
  const [permissionsCache, setPermissionsCache] = useState<PermissionsCache>({});

  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee-wiki"],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Admins, HR, and Owners have full access
  const hasGlobalEditAccess = isAdmin || isHR || isOwner;

  // Check if current user can edit a specific item
  const checkCanEdit = useCallback(async (
    itemType: "folder" | "page",
    itemId: string
  ): Promise<boolean> => {
    if (!user || !currentOrg?.id) return false;
    
    // Admins, HR, and Owners can edit everything
    if (hasGlobalEditAccess) return true;

    const cacheKey = `edit_${itemType}_${itemId}`;
    if (permissionsCache[cacheKey] !== undefined) {
      return permissionsCache[cacheKey].canEdit;
    }

    try {
      const { data, error } = await supabase.rpc('can_edit_wiki_item', {
        _item_type: itemType,
        _item_id: itemId,
        _user_id: user.id,
      });

      if (error) {
        console.error("Error checking edit permission:", error);
        return false;
      }

      setPermissionsCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], canEdit: data }
      }));

      return data;
    } catch (error) {
      console.error("Error checking edit permission:", error);
      return false;
    }
  }, [user, currentOrg?.id, hasGlobalEditAccess, permissionsCache]);

  // Check if user is the creator/owner of an item
  const checkIsOwner = useCallback(async (
    itemType: "folder" | "page",
    itemId: string
  ): Promise<boolean> => {
    if (!currentEmployee?.id) return false;
    
    // Admins, HR, and Owners are treated as owners for all items
    if (hasGlobalEditAccess) return true;

    try {
      if (itemType === "folder") {
        const { data, error } = await supabase
          .from("wiki_folders")
          .select("created_by")
          .eq("id", itemId)
          .single();
        
        if (error) return false;
        return data?.created_by === currentEmployee.id;
      } else {
        const { data, error } = await supabase
          .from("wiki_pages")
          .select("created_by")
          .eq("id", itemId)
          .single();
        
        if (error) return false;
        return data?.created_by === currentEmployee.id;
      }
    } catch (error) {
      console.error("Error checking ownership:", error);
      return false;
    }
  }, [currentEmployee?.id, hasGlobalEditAccess]);

  // Check if user can edit the current folder (for creating items in it)
  const checkCanEditFolder = useCallback(async (
    folderId: string | null
  ): Promise<boolean> => {
    if (!user || !currentOrg?.id) return false;
    
    // Admins, HR, and Owners can edit everywhere
    if (hasGlobalEditAccess) return true;

    // For root level (null folderId), all org members can create
    if (folderId === null) return true;

    return await checkCanEdit("folder", folderId);
  }, [user, currentOrg?.id, hasGlobalEditAccess, checkCanEdit]);

  // Clear cache when org changes
  useEffect(() => {
    setPermissionsCache({});
  }, [currentOrg?.id]);

  return {
    checkCanEdit,
    checkIsOwner,
    checkCanEditFolder,
    hasGlobalEditAccess,
    currentEmployeeId: currentEmployee?.id,
  };
};

// Hook to get permissions for a batch of items
export const useWikiItemPermissions = (
  items: Array<{ type: "folder" | "page"; id: string; created_by?: string }>
) => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { isAdmin, isHR, isOwner } = useUserRole();
  const hasGlobalEditAccess = isAdmin || isHR || isOwner;

  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee-wiki-batch"],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch permissions for all items in batch
  const { data: permissions = {} } = useQuery({
    queryKey: ["wiki-item-permissions", items.map(i => `${i.type}_${i.id}`).join(","), currentEmployee?.id, hasGlobalEditAccess],
    queryFn: async () => {
      if (!user || !currentOrg?.id) return {};
      
      const result: Record<string, { canEdit: boolean; isOwner: boolean }> = {};
      
      // If user has global access, all items are editable
      if (hasGlobalEditAccess) {
        items.forEach(item => {
          result[`${item.type}_${item.id}`] = { canEdit: true, isOwner: true };
        });
        return result;
      }

      // Check each item
      await Promise.all(items.map(async (item) => {
        const key = `${item.type}_${item.id}`;
        
        // Check if user is the creator
        const isOwner = item.created_by === currentEmployee?.id;
        
        // Check can_edit via RPC
        let canEdit = isOwner; // Owners can always edit
        
        if (!isOwner) {
          try {
            const { data } = await supabase.rpc('can_edit_wiki_item', {
              _item_type: item.type,
              _item_id: item.id,
              _user_id: user.id,
            });
            canEdit = data === true;
          } catch {
            canEdit = false;
          }
        }
        
        result[key] = { canEdit, isOwner };
      }));

      return result;
    },
    enabled: !!user && !!currentOrg?.id && items.length > 0 && !!currentEmployee?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  const getItemPermissions = useCallback((type: "folder" | "page", id: string) => {
    const key = `${type}_${id}`;
    return permissions[key] || { canEdit: hasGlobalEditAccess, isOwner: hasGlobalEditAccess };
  }, [permissions, hasGlobalEditAccess]);

  return {
    getItemPermissions,
    hasGlobalEditAccess,
    currentEmployeeId: currentEmployee?.id,
  };
};
