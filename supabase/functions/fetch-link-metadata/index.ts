import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkMetadataResponse {
  success: boolean;
  data?: {
    url: string;
    title: string | null;
    description: string | null;
    image: string | null;
    favicon: string | null;
    siteName: string | null;
    type: string | null;
  };
  error?: string;
}

/**
 * Extract content from meta tag
 */
function extractMetaContent(html: string, property: string): string | null {
  // Try og: properties first
  const ogPattern = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  const ogMatch = html.match(ogPattern);
  if (ogMatch) return ogMatch[1];

  // Try content first pattern
  const contentFirstPattern = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
    'i'
  );
  const contentFirstMatch = html.match(contentFirstPattern);
  if (contentFirstMatch) return contentFirstMatch[1];

  return null;
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string | null {
  // Try og:title first
  const ogTitle = extractMetaContent(html, 'og:title');
  if (ogTitle) return ogTitle;

  // Try twitter:title
  const twitterTitle = extractMetaContent(html, 'twitter:title');
  if (twitterTitle) return twitterTitle;

  // Fall back to <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();

  return null;
}

/**
 * Extract description from HTML
 */
function extractDescription(html: string): string | null {
  const ogDesc = extractMetaContent(html, 'og:description');
  if (ogDesc) return ogDesc;

  const twitterDesc = extractMetaContent(html, 'twitter:description');
  if (twitterDesc) return twitterDesc;

  const metaDesc = extractMetaContent(html, 'description');
  if (metaDesc) return metaDesc;

  return null;
}

/**
 * Extract image from HTML
 */
function extractImage(html: string, baseUrl: string): string | null {
  const ogImage = extractMetaContent(html, 'og:image');
  if (ogImage) {
    return ogImage.startsWith('http') ? ogImage : new URL(ogImage, baseUrl).href;
  }

  const twitterImage = extractMetaContent(html, 'twitter:image');
  if (twitterImage) {
    return twitterImage.startsWith('http') ? twitterImage : new URL(twitterImage, baseUrl).href;
  }

  return null;
}

/**
 * Extract favicon from HTML
 */
function extractFavicon(html: string, baseUrl: string): string {
  // Try various favicon link patterns
  const iconPatterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
  ];

  for (const pattern of iconPatterns) {
    const match = html.match(pattern);
    if (match) {
      const iconUrl = match[1];
      return iconUrl.startsWith('http') ? iconUrl : new URL(iconUrl, baseUrl).href;
    }
  }

  // Default to /favicon.ico
  try {
    return new URL('/favicon.ico', baseUrl).href;
  } catch {
    return '';
  }
}

/**
 * Validate URL to prevent SSRF
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Block internal IPs
    const hostname = urlObj.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.') ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' } as LinkMetadataResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    if (!isValidUrl(url)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL' } as LinkMetadataResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the URL with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch URL: ${response.status}` 
        } as LinkMetadataResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      // For non-HTML content, return basic metadata
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            url,
            title: url.split('/').pop() || url,
            description: null,
            image: null,
            favicon: null,
            siteName: new URL(url).hostname,
            type: contentType.split('/')[0] || 'unknown',
          },
        } as LinkMetadataResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const baseUrl = response.url || url;

    const metadata: LinkMetadataResponse = {
      success: true,
      data: {
        url: baseUrl,
        title: extractTitle(html),
        description: extractDescription(html),
        image: extractImage(html, baseUrl),
        favicon: extractFavicon(html, baseUrl),
        siteName: extractMetaContent(html, 'og:site_name') || new URL(baseUrl).hostname,
        type: extractMetaContent(html, 'og:type') || 'website',
      },
    };

    return new Response(
      JSON.stringify(metadata),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching link metadata:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch metadata' 
      } as LinkMetadataResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
