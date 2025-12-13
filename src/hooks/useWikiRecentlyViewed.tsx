import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "./useOrganization";

export interface RecentItem {
  id: string;
  type: "folder" | "page";
  name: string;
  viewedAt: number;
}

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY_PREFIX = "wiki_recently_viewed_";

export const useWikiRecentlyViewed = () => {
  const { currentOrg } = useOrganization();
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  const storageKey = currentOrg?.id 
    ? `${STORAGE_KEY_PREFIX}${currentOrg.id}` 
    : null;

  // Load from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setRecentItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recently viewed items:", e);
    }
  }, [storageKey]);

  // Save to localStorage when items change
  const saveToStorage = useCallback((items: RecentItem[]) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save recently viewed items:", e);
    }
  }, [storageKey]);

  const addRecentItem = useCallback((id: string, type: "folder" | "page", name: string) => {
    if (!storageKey || !name) return;

    setRecentItems(prev => {
      // Remove existing entry if present
      const filtered = prev.filter(item => !(item.id === id && item.type === type));
      
      // Add new entry at the beginning
      const newItem: RecentItem = {
        id,
        type,
        name,
        viewedAt: Date.now()
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
