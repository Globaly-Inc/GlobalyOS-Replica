/**
 * Hook for fetching and caching link metadata
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LinkMetadata, LinkPlatform } from "@/types/linkPreview";
import { detectPlatform } from "@/types/linkPreview";

interface FetchedMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  type: string | null;
}

const LOCAL_CACHE_KEY = 'link_metadata_cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  metadata: LinkMetadata;
  timestamp: number;
}

/**
 * Get metadata from local storage cache
 */
function getFromLocalCache(url: string): LinkMetadata | null {
  try {
    const cache = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!cache) return null;
    
    const entries: Record<string, CacheEntry> = JSON.parse(cache);
    const entry = entries[url];
    
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.metadata;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Save metadata to local storage cache
 */
function saveToLocalCache(url: string, metadata: LinkMetadata): void {
  try {
    const cache = localStorage.getItem(LOCAL_CACHE_KEY);
    const entries: Record<string, CacheEntry> = cache ? JSON.parse(cache) : {};
    
    entries[url] = {
      metadata,
      timestamp: Date.now(),
    };
    
    // Limit cache size
    const keys = Object.keys(entries);
    if (keys.length > 100) {
      // Remove oldest entries
      const sorted = keys.sort((a, b) => entries[a].timestamp - entries[b].timestamp);
      sorted.slice(0, 20).forEach(key => delete entries[key]);
    }
    
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Convert content type to our type
 */
function mapContentType(type: string | null, platform: LinkPlatform): LinkMetadata['contentType'] {
  if (platform === 'youtube' || platform === 'loom' || platform === 'tiktok') return 'video';
  if (platform === 'spotify') return 'audio';
  if (platform === 'google-docs' || platform === 'google-sheets' || platform === 'google-slides' || platform === 'figma') return 'document';
  if (platform === 'instagram' || platform === 'facebook') return 'image';
  
  if (type) {
    if (type.includes('video')) return 'video';
    if (type.includes('audio') || type.includes('music')) return 'audio';
    if (type.includes('image')) return 'image';
    if (type.includes('article') || type.includes('blog')) return 'article';
  }
  
  return 'unknown';
}

/**
 * Fetch metadata from edge function
 */
async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const platform = detectPlatform(url);
  
  // Check local cache first
  const cached = getFromLocalCache(url);
  if (cached) return cached;
  
  try {
    const { data, error } = await supabase.functions.invoke('fetch-link-metadata', {
      body: { url },
    });
    
    if (error || !data?.success || !data?.data) {
      // Return basic metadata on failure
      return {
        url,
        platform,
        title: null,
        description: null,
        image: null,
        favicon: null,
        siteName: null,
        contentType: mapContentType(null, platform),
      };
    }
    
    const fetched = data.data as FetchedMetadata;
    
    const metadata: LinkMetadata = {
      url: fetched.url || url,
      platform,
      title: fetched.title,
      description: fetched.description,
      image: fetched.image,
      favicon: fetched.favicon,
      siteName: fetched.siteName,
      contentType: mapContentType(fetched.type, platform),
    };
    
    // Save to local cache
    saveToLocalCache(url, metadata);
    
    return metadata;
  } catch {
    return {
      url,
      platform,
      title: null,
      description: null,
      image: null,
      favicon: null,
      siteName: null,
      contentType: mapContentType(null, platform),
    };
  }
}

/**
 * Hook to fetch link metadata with caching
 */
export function useLinkMetadata(url: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['link-metadata', url],
    queryFn: () => fetchMetadata(url),
    enabled: enabled && !!url,
    staleTime: CACHE_TTL,
    gcTime: CACHE_TTL,
    retry: 1,
  });
}
