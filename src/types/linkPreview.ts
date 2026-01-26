/**
 * Link Preview Types
 * Type definitions for link sharing and preview system
 */

export type LinkPlatform = 
  | 'youtube' 
  | 'twitter' 
  | 'tiktok' 
  | 'instagram' 
  | 'facebook' 
  | 'spotify' 
  | 'loom' 
  | 'google-docs' 
  | 'google-sheets'
  | 'google-slides'
  | 'figma' 
  | 'generic';

export type ContentType = 'video' | 'article' | 'image' | 'audio' | 'document' | 'unknown';

export interface LinkMetadata {
  url: string;
  platform: LinkPlatform;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  contentType: ContentType;
  embedUrl?: string;
  author?: string;
  publishedAt?: string;
}

export interface ExtractedLink {
  url: string;
  startIndex: number;
  endIndex: number;
  platform: LinkPlatform;
}

// URL pattern for extracting links from text
export const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+[^\s<.,!?;:'")\]]/gi;

/**
 * Detect the platform type from a URL
 */
export const detectPlatform = (url: string): LinkPlatform => {
  try {
    const urlObj = new URL(url.startsWith('www.') ? `https://${url}` : url);
    const domain = urlObj.hostname.toLowerCase();
    
    if (/youtube\.com|youtu\.be/.test(domain)) return 'youtube';
    if (/twitter\.com|x\.com/.test(domain)) return 'twitter';
    if (/tiktok\.com/.test(domain)) return 'tiktok';
    if (/instagram\.com/.test(domain)) return 'instagram';
    if (/facebook\.com|fb\.watch|fb\.com/.test(domain)) return 'facebook';
    if (/spotify\.com|open\.spotify\.com/.test(domain)) return 'spotify';
    if (/loom\.com/.test(domain)) return 'loom';
    if (/docs\.google\.com/.test(domain)) {
      if (urlObj.pathname.includes('/spreadsheets/')) return 'google-sheets';
      if (urlObj.pathname.includes('/presentation/')) return 'google-slides';
      return 'google-docs';
    }
    if (/figma\.com/.test(domain)) return 'figma';
    
    return 'generic';
  } catch {
    return 'generic';
  }
};

/**
 * Extract all URLs from text content
 */
export const extractLinks = (content: string): ExtractedLink[] => {
  const links: ExtractedLink[] = [];
  let match;
  
  const pattern = new RegExp(URL_PATTERN.source, 'gi');
  
  while ((match = pattern.exec(content)) !== null) {
    const url = match[0];
    links.push({
      url: url.startsWith('www.') ? `https://${url}` : url,
      startIndex: match.index,
      endIndex: match.index + url.length,
      platform: detectPlatform(url),
    });
  }
  
  return links;
};

/**
 * Truncate URL for display
 */
export const truncateUrl = (url: string, maxLength: number = 50): string => {
  try {
    const urlObj = new URL(url);
    const display = urlObj.hostname + urlObj.pathname;
    if (display.length <= maxLength) return display;
    return display.slice(0, maxLength - 3) + '...';
  } catch {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength - 3) + '...';
  }
};

/**
 * Get domain from URL
 */
export const getDomain = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('www.') ? `https://${url}` : url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
