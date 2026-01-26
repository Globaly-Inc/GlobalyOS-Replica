
# Comprehensive Link Sharing Implementation Plan for Team Chat

## Overview

This plan implements a complete link sharing system for Team Chat that includes:
- Auto-link detection and rendering
- Rich link preview cards with OpenGraph metadata
- Platform-specific embeds (YouTube, TikTok, Instagram, Facebook, Twitter/X, Spotify, Loom)
- Document previews (Google Docs, Figma)
- Caching for performance

---

## Architecture Overview

```text
+------------------+      +-------------------------+      +--------------------+
|   RichTextMessage|----->|   LinkPreviewRenderer   |----->|  Platform-Specific |
|   (enhanced)     |      |   (orchestrator)        |      |  Components        |
+------------------+      +-------------------------+      +--------------------+
                                    |                              |
                                    v                              v
                          +------------------+          +--------------------+
                          | fetch-link-meta  |          | YouTubeEmbed      |
                          | (edge function)  |          | TwitterEmbed      |
                          +------------------+          | TikTokPreview     |
                                    |                   | InstagramPreview  |
                                    v                   | SpotifyEmbed      |
                          +------------------+          | LoomEmbed         |
                          | link_metadata_   |          | GoogleDocPreview  |
                          | cache (DB)       |          | FigmaPreview      |
                          +------------------+          | GenericLinkCard   |
                                                        +--------------------+
```

---

## Phase 1: Auto-Link Detection & Clickable Links

**Goal**: Convert plain URLs in messages to clickable, styled links

### File: `src/components/chat/RichTextMessage.tsx`

**Changes Required:**

1. Add URL detection regex (similar to WikiRichEditor):
```typescript
const urlPattern = /(?:https?:\/\/|www\.)[^\s<]+[^\s<.,!?;:'")\]]/g;
```

2. Modify `formattedContent` logic to:
   - Detect URLs in text
   - Render as clickable `<a>` tags with proper styling
   - Truncate long URLs for display (show domain + path preview)
   - Add external link indicator icon

**New URL Rendering:**
```tsx
<a 
  href={fullUrl}
  target="_blank"
  rel="noopener noreferrer"
  className="text-primary underline hover:no-underline inline-flex items-center gap-0.5"
>
  {truncatedUrl}
  <ExternalLink className="h-3 w-3 inline-block" />
</a>
```

---

## Phase 2: Link Preview Orchestrator Component

**Goal**: Create a component that detects link types and renders appropriate previews

### New File: `src/components/chat/LinkPreviewRenderer.tsx`

**Responsibilities:**
- Parse message content for URLs
- Determine platform type for each URL
- Render appropriate preview component
- Handle loading and error states

**Platform Detection Logic:**
```typescript
const detectPlatform = (url: string): Platform => {
  const domain = new URL(url).hostname;
  
  if (/youtube\.com|youtu\.be/.test(domain)) return 'youtube';
  if (/twitter\.com|x\.com/.test(domain)) return 'twitter';
  if (/tiktok\.com/.test(domain)) return 'tiktok';
  if (/instagram\.com/.test(domain)) return 'instagram';
  if (/facebook\.com|fb\.watch/.test(domain)) return 'facebook';
  if (/spotify\.com/.test(domain)) return 'spotify';
  if (/loom\.com/.test(domain)) return 'loom';
  if (/docs\.google\.com|slides\.google\.com|sheets\.google\.com/.test(domain)) return 'google-docs';
  if (/figma\.com/.test(domain)) return 'figma';
  
  return 'generic';
};
```

**Props Interface:**
```typescript
interface LinkPreviewRendererProps {
  content: string;
  messageId: string;
}
```

---

## Phase 3: Edge Function for Link Metadata

**Goal**: Fetch OpenGraph metadata for links server-side

### New File: `supabase/functions/fetch-link-metadata/index.ts`

**Features:**
- Fetch HTML from URL
- Parse OpenGraph meta tags
- Extract: title, description, image, favicon, site_name
- Handle errors gracefully
- Return structured metadata

**Request/Response:**
```typescript
// Request
{ url: string }

// Response
{
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
```

**Implementation Notes:**
- Set reasonable timeout (5 seconds)
- Respect robots.txt where possible
- Handle redirects
- Limit image size checks
- CORS headers for frontend access

---

## Phase 4: Database Cache for Link Metadata (Optional but Recommended)

**Goal**: Cache fetched metadata to avoid repeated API calls

### New Migration: `link_metadata_cache` table

```sql
CREATE TABLE link_metadata_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url_hash TEXT NOT NULL, -- SHA256 hash of URL
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  favicon_url TEXT,
  site_name TEXT,
  content_type TEXT, -- 'video', 'article', 'image', etc.
  platform TEXT, -- 'youtube', 'twitter', etc.
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, url_hash)
);

-- RLS Policy
ALTER TABLE link_metadata_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read link metadata for their org"
ON link_metadata_cache FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert link metadata for their org"
ON link_metadata_cache FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM employees WHERE user_id = auth.uid()
  )
);
```

---

## Phase 5: Platform-Specific Preview Components

### 5.1 YouTube Embed
**File:** `src/components/chat/previews/YouTubeEmbed.tsx`

**Features:**
- Extract video ID from various URL formats
- Inline iframe player (16:9 aspect ratio)
- Click-to-play thumbnail mode (optional for performance)
- Show video title if available

```tsx
interface YouTubeEmbedProps {
  url: string;
  metadata?: LinkMetadata;
}
```

**URL Patterns:**
- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/embed/VIDEO_ID`
- `youtube.com/shorts/VIDEO_ID`

---

### 5.2 TikTok Preview
**File:** `src/components/chat/previews/TikTokPreview.tsx`

**Features:**
- Rich preview card (not inline embed due to TikTok API restrictions)
- Show thumbnail, caption preview, username
- TikTok logo/branding
- Click to open in new tab

**Note:** TikTok doesn't allow easy embedding, so we use a rich preview card approach.

---

### 5.3 Instagram Preview
**File:** `src/components/chat/previews/InstagramPreview.tsx`

**Features:**
- Preview card with Instagram branding
- Show post type icon (photo, video, reel)
- Username display
- Click to open in new tab

**Supported URL Patterns:**
- `instagram.com/p/POST_ID`
- `instagram.com/reel/REEL_ID`
- `instagram.com/stories/USERNAME/STORY_ID`

---

### 5.4 Facebook Preview
**File:** `src/components/chat/previews/FacebookPreview.tsx`

**Features:**
- Preview card with Facebook branding
- Support video links (fb.watch)
- Show preview image if available
- Click to open

---

### 5.5 Twitter/X Embed
**File:** `src/components/chat/previews/TwitterEmbed.tsx`

**Features:**
- Rich tweet preview card
- Show tweet text, author, avatar
- Media thumbnails if present
- Engagement stats (optional)
- Proper X branding

**URL Patterns:**
- `twitter.com/USER/status/TWEET_ID`
- `x.com/USER/status/TWEET_ID`

---

### 5.6 Spotify Embed
**File:** `src/components/chat/previews/SpotifyEmbed.tsx`

**Features:**
- Compact inline player (Spotify's embed widget)
- Support tracks, albums, playlists, podcasts
- 80px height compact mode

**URL Patterns:**
- `open.spotify.com/track/ID`
- `open.spotify.com/album/ID`
- `open.spotify.com/playlist/ID`
- `open.spotify.com/episode/ID`

**Embed Format:**
```html
<iframe 
  src="https://open.spotify.com/embed/track/ID?utm_source=generator&theme=0" 
  width="100%" 
  height="80" 
  frameBorder="0" 
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
></iframe>
```

---

### 5.7 Loom Embed
**File:** `src/components/chat/previews/LoomEmbed.tsx`

**Features:**
- Inline video player
- 16:9 aspect ratio
- Uses Loom's embed URL format

**URL Pattern:**
- `loom.com/share/VIDEO_ID`

---

### 5.8 Google Docs/Slides/Sheets Preview
**File:** `src/components/chat/previews/GoogleDocPreview.tsx`

**Features:**
- Document type icon (Docs blue, Sheets green, Slides yellow)
- Document title from metadata
- "View document" CTA
- Google branding

**URL Patterns:**
- `docs.google.com/document/d/DOC_ID`
- `docs.google.com/spreadsheets/d/SHEET_ID`
- `docs.google.com/presentation/d/SLIDE_ID`

---

### 5.9 Figma Preview
**File:** `src/components/chat/previews/FigmaPreview.tsx`

**Features:**
- Figma logo/branding
- File name from URL
- Preview thumbnail if available
- "Open in Figma" CTA

**URL Patterns:**
- `figma.com/file/FILE_ID`
- `figma.com/design/FILE_ID`

---

### 5.10 Generic Link Preview Card
**File:** `src/components/chat/previews/GenericLinkCard.tsx`

**Features:**
- Favicon display
- Title (from OG or page title)
- Description (truncated)
- Preview image (if available)
- Domain display
- Click to open

**Component Structure:**
```tsx
<div className="border rounded-lg overflow-hidden max-w-md hover:bg-muted/50 transition-colors">
  {/* Preview image */}
  {metadata.image && (
    <div className="aspect-video bg-muted">
      <img src={metadata.image} alt="" className="w-full h-full object-cover" />
    </div>
  )}
  
  <div className="p-3">
    {/* Favicon + domain */}
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      {metadata.favicon && <img src={metadata.favicon} className="w-4 h-4" />}
      <span>{domain}</span>
    </div>
    
    {/* Title */}
    <h4 className="font-medium text-sm line-clamp-2">{metadata.title}</h4>
    
    {/* Description */}
    {metadata.description && (
      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
        {metadata.description}
      </p>
    )}
  </div>
</div>
```

---

## Phase 6: Custom Hook for Link Metadata

### New File: `src/hooks/useLinkMetadata.ts`

**Features:**
- Fetch metadata for a URL
- Check cache first (localStorage + DB)
- Return loading/error states
- Deduplicate requests for same URL

```typescript
interface UseLinkMetadataResult {
  metadata: LinkMetadata | null;
  isLoading: boolean;
  error: Error | null;
}

export const useLinkMetadata = (url: string): UseLinkMetadataResult => {
  // 1. Check local storage cache
  // 2. Check React Query cache
  // 3. Fetch from edge function
  // 4. Cache result
};
```

---

## Phase 7: Integration with MessageBubble

### File: `src/components/chat/MessageBubble.tsx`

**Changes:**
1. Import `LinkPreviewRenderer`
2. Add link preview below message text (before attachments)

```tsx
{/* Message text */}
{message.content && (
  <div className="text-sm text-foreground leading-relaxed">
    <RichTextMessage content={message.content} />
    {message.updated_at !== message.created_at && (
      <span className="text-xs text-muted-foreground ml-1">(edited)</span>
    )}
  </div>
)}

{/* Link previews - NEW */}
{message.content && (
  <LinkPreviewRenderer 
    content={message.content} 
    messageId={message.id}
  />
)}

{/* Attachments */}
{message.attachments && message.attachments.length > 0 && (
  // ... existing code
)}
```

---

## Phase 8: Types and Constants

### New File: `src/types/linkPreview.ts`

```typescript
export type LinkPlatform = 
  | 'youtube' 
  | 'twitter' 
  | 'tiktok' 
  | 'instagram' 
  | 'facebook' 
  | 'spotify' 
  | 'loom' 
  | 'google-docs' 
  | 'figma' 
  | 'generic';

export interface LinkMetadata {
  url: string;
  platform: LinkPlatform;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
  contentType: 'video' | 'article' | 'image' | 'audio' | 'document' | 'unknown';
  embedUrl?: string; // For platforms that support embedding
  author?: string;
  publishedAt?: string;
}

export interface ExtractedLink {
  url: string;
  startIndex: number;
  endIndex: number;
  platform: LinkPlatform;
}
```

---

## Implementation Order

| Phase | Component | Priority | Effort |
|-------|-----------|----------|--------|
| 1 | Auto-link detection in RichTextMessage | High | Low |
| 2 | LinkPreviewRenderer orchestrator | High | Medium |
| 3 | fetch-link-metadata edge function | High | Medium |
| 4 | Generic Link Preview Card | High | Low |
| 5 | YouTube Embed | High | Low |
| 6 | Loom Embed | Medium | Low |
| 7 | Spotify Embed | Medium | Low |
| 8 | Twitter/X Preview | Medium | Medium |
| 9 | Google Docs Preview | Medium | Low |
| 10 | Figma Preview | Low | Low |
| 11 | TikTok Preview | Low | Low |
| 12 | Instagram Preview | Low | Low |
| 13 | Facebook Preview | Low | Low |
| 14 | Database cache table | Low | Low |
| 15 | useLinkMetadata hook with caching | Medium | Medium |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/linkPreview.ts` | Type definitions |
| `src/components/chat/LinkPreviewRenderer.tsx` | Orchestrator component |
| `src/components/chat/previews/YouTubeEmbed.tsx` | YouTube player |
| `src/components/chat/previews/TwitterEmbed.tsx` | Twitter/X preview |
| `src/components/chat/previews/TikTokPreview.tsx` | TikTok preview card |
| `src/components/chat/previews/InstagramPreview.tsx` | Instagram preview |
| `src/components/chat/previews/FacebookPreview.tsx` | Facebook preview |
| `src/components/chat/previews/SpotifyEmbed.tsx` | Spotify player |
| `src/components/chat/previews/LoomEmbed.tsx` | Loom player |
| `src/components/chat/previews/GoogleDocPreview.tsx` | Google Docs preview |
| `src/components/chat/previews/FigmaPreview.tsx` | Figma preview |
| `src/components/chat/previews/GenericLinkCard.tsx` | Generic OpenGraph card |
| `src/hooks/useLinkMetadata.ts` | Metadata fetching hook |
| `supabase/functions/fetch-link-metadata/index.ts` | Edge function |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/chat/RichTextMessage.tsx` | Add URL detection and clickable link rendering |
| `src/components/chat/MessageBubble.tsx` | Add LinkPreviewRenderer below message text |
| `src/components/chat/ThreadView.tsx` | Add LinkPreviewRenderer for thread replies |

---

## Security Considerations

1. **URL Validation**: Validate all URLs before fetching metadata
2. **SSRF Prevention**: Edge function should not follow redirects to internal IPs
3. **Content-Type Checking**: Only fetch HTML content for metadata
4. **Rate Limiting**: Limit metadata fetch requests per user/org
5. **Sanitization**: Sanitize all metadata before rendering (especially descriptions)
6. **XSS Prevention**: Use DOMPurify for any HTML content

---

## Performance Optimizations

1. **Lazy Loading**: Only fetch metadata when link preview is in viewport
2. **Caching**: 
   - Local storage for recent previews
   - Database cache for org-wide sharing
   - React Query caching
3. **Thumbnail Optimization**: Use smaller thumbnail sizes where possible
4. **Debouncing**: Debounce metadata fetch requests
5. **Intersection Observer**: Only render embeds when visible
6. **Click-to-Load**: For heavy embeds (videos), show thumbnail first

---

## Testing Checklist

- [ ] YouTube video URLs (various formats)
- [ ] YouTube Shorts
- [ ] Twitter/X post URLs
- [ ] TikTok video URLs
- [ ] Instagram posts, reels, stories
- [ ] Facebook posts, videos
- [ ] Spotify tracks, albums, playlists
- [ ] Loom video URLs
- [ ] Google Docs, Sheets, Slides
- [ ] Figma file URLs
- [ ] Generic website URLs
- [ ] Broken/invalid URLs
- [ ] Private/restricted content
- [ ] URLs without OpenGraph tags
- [ ] Mixed content (text + multiple links)
- [ ] Mobile responsiveness
- [ ] Dark mode compatibility
