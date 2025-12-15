import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "./useOrganization";
import { supabase } from "@/integrations/supabase/client";

export interface RecentItem {
  id: string;
  type: "folder" | "page";
  name: string;
  viewedAt: number;
  is_file?: boolean;
  file_type?: string;
  file_url?: string;
}

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY_PREFIX = "wiki_recently_viewed_";

export const useWikiRecentlyViewed = () => {
  const { currentOrg } = useOrganization();
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  const storageKey = currentOrg?.id 
    ? `${STORAGE_KEY_PREFIX}${currentOrg.id}` 
    : null;

  // Load from localStorage on mount and clean up stale items
  useEffect(() => {
    if (!storageKey || !currentOrg?.id) return;
    
    const loadAndCleanup = async () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return;
        
        const items: RecentItem[] = JSON.parse(stored);
        if (items.length === 0) return;

        // Get all page and folder IDs to verify they still exist
        const pageIds = items.filter(i => i.type === "page").map(i => i.id);
        const folderIds = items.filter(i => i.type === "folder").map(i => i.id);

        const validIds = new Set<string>();

        // Check which pages still exist and get file info
        if (pageIds.length > 0) {
          const { data: pages } = await supabase
            .from("wiki_pages")
            .select("id, is_file, file_type, file_url")
            .in("id", pageIds)
            .eq("organization_id", currentOrg.id);
          pages?.forEach(p => {
            validIds.add(p.id);
            // Update file info in items
            const item = items.find(i => i.id === p.id && i.type === "page");
            if (item) {
              item.is_file = p.is_file || false;
              item.file_type = p.file_type || undefined;
              item.file_url = p.file_url || undefined;
            }
          });
        }

        // Check which folders still exist
        if (folderIds.length > 0) {
          const { data: folders } = await supabase
            .from("wiki_folders")
            .select("id")
            .in("id", folderIds)
            .eq("organization_id", currentOrg.id);
          folders?.forEach(f => validIds.add(f.id));
        }

        // Filter out stale items
        const validItems = items.filter(item => validIds.has(item.id));
        
        // Update storage if items were removed
        if (validItems.length !== items.length) {
          localStorage.setItem(storageKey, JSON.stringify(validItems));
        }

        setRecentItems(validItems);
      } catch (e) {
        console.error("Failed to load recently viewed items:", e);
      }
    };

    loadAndCleanup();
  }, [storageKey, currentOrg?.id]);

  // Save to localStorage when items change
  const saveToStorage = useCallback((items: RecentItem[]) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save recently viewed items:", e);
    }
  }, [storageKey]);

  const addRecentItem = useCallback((
    id: string, 
    type: "folder" | "page", 
    name: string,
    options?: { is_file?: boolean; file_type?: string; file_url?: string }
  ) => {
    if (!storageKey || !name) return;

    setRecentItems(prev => {
      // Remove existing entry if present
      const filtered = prev.filter(item => !(item.id === id && item.type === type));
      
      // Add new entry at the beginning
      const newItem: RecentItem = {
        id,
        type,
        name,
        viewedAt: Date.now(),
        is_file: options?.is_file,
        file_type: options?.file_type,
        file_url: options?.file_url,
      };
      
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
      saveToStorage(updated);
      return updated;
    });
  }, [storageKey, saveToStorage]);

  const removeRecentItem = useCallback((id: string, type: "folder" | "page") => {
    setRecentItems(prev => {
      const updated = prev.filter(item => !(item.id === id && item.type === type));
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    recentItems,
    addRecentItem,
    removeRecentItem,
    clearRecentItems
  };
};
