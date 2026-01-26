/**
 * TikTok Preview Component
 * Renders a rich preview card for TikTok videos
 */

import { ExternalLink, Play } from "lucide-react";
import type { LinkMetadata } from "@/types/linkPreview";

interface TikTokPreviewProps {
  url: string;
  metadata?: LinkMetadata;
}

/**
 * Extract TikTok video info from URL
 */
function extractTikTokInfo(url: string): { username?: string; videoId?: string } {
  const patterns = [
    /tiktok\.com\/@([^\/]+)\/video\/(\d+)/,
    /tiktok\.com\/t\/([a-zA-Z0-9]+)/,
    /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      if (pattern.source.includes('@')) {
        return { username: match[1], videoId: match[2] };
      }
      return { videoId: match[1] };
    }
  }
  
  return {};
}

const TikTokPreview = ({ url, metadata }: TikTokPreviewProps) => {
  const info = extractTikTokInfo(url);
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 max-w-sm rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors block group"
    >
      {metadata?.image ? (
        <div className="aspect-[9/16] max-h-80 relative bg-muted">
          <img
            src={metadata.image}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center">
              <Play className="h-7 w-7 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-pink-500 via-red-500 to-cyan-500 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/30 flex items-center justify-center">
            <Play className="h-7 w-7 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
      
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
          <span>TikTok</span>
          {info.username && (
            <span className="text-muted-foreground">@{info.username}</span>
          )}
        </div>
        
        {metadata?.title && (
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{metadata.title}</h4>
        )}
        
        {metadata?.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        )}
        
        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
          <span>Watch on TikTok</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
};

export default TikTokPreview;
