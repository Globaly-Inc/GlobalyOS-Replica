/**
 * useRecentEmojis Hook
 * Tracks and persists recently used emojis per organization
 * Stored in localStorage for fast access
 */

import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';

interface RecentEmojiEntry {
  emoji: string;
  count: number;
  lastUsed: string; // ISO timestamp
}

const MAX_RECENT_EMOJIS = 20;
const STORAGE_KEY_PREFIX = 'globalyos_recent_emojis_';

export const useRecentEmojis = () => {
  const { currentOrg } = useOrganization();
  const [recentEmojis, setRecentEmojis] = useState<RecentEmojiEntry[]>([]);

  const getStorageKey = useCallback(() => {
    return `${STORAGE_KEY_PREFIX}${currentOrg?.id || 'default'}`;
  }, [currentOrg?.id]);

  // Load from localStorage on mount or org change
  useEffect(() => {
    const key = getStorageKey();
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentEmojiEntry[];
        // Sort by count desc, then by lastUsed desc
        const sorted = parsed.sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        });
        setRecentEmojis(sorted.slice(0, MAX_RECENT_EMOJIS));
      } else {
        setRecentEmojis([]);
      }
    } catch (error) {
      console.error('Error loading recent emojis:', error);
      setRecentEmojis([]);
    }
  }, [getStorageKey]);

  // Save to localStorage
  const saveToStorage = useCallback((entries: RecentEmojiEntry[]) => {
    const key = getStorageKey();
    try {
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving recent emojis:', error);
    }
  }, [getStorageKey]);

  // Add or update a recent emoji
  const addRecentEmoji = useCallback((emoji: string) => {
    setRecentEmojis(prev => {
      const now = new Date().toISOString();
      const existingIndex = prev.findIndex(e => e.emoji === emoji);
      
      let updated: RecentEmojiEntry[];
      
      if (existingIndex >= 0) {
        // Update existing entry
        updated = prev.map((entry, index) => {
          if (index === existingIndex) {
            return {
              ...entry,
              count: entry.count + 1,
              lastUsed: now,
            };
          }
          return entry;
        });
      } else {
        // Add new entry
        updated = [
          { emoji, count: 1, lastUsed: now },
          ...prev,
        ];
      }
      
      // Sort by count desc, then by lastUsed desc
      updated.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      });
      
      // Limit to max entries
      const limited = updated.slice(0, MAX_RECENT_EMOJIS);
      
      // Persist to storage
      saveToStorage(limited);
      
      return limited;
    });
  }, [saveToStorage]);

  // Clear recent emojis
  const clearRecent = useCallback(() => {
    const key = getStorageKey();
    try {
      localStorage.removeItem(key);
      setRecentEmojis([]);
    } catch (error) {
      console.error('Error clearing recent emojis:', error);
    }
  }, [getStorageKey]);

  // Get just the emoji strings (most frequently used first)
  const recentEmojiList = recentEmojis.map(e => e.emoji);

  return {
    recentEmojis: recentEmojiList,
    recentEmojiEntries: recentEmojis,
    addRecentEmoji,
    clearRecent,
  };
};
