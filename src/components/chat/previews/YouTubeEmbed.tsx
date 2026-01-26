/**
 * YouTube Embed Component
 * Renders an inline YouTube video player
 */

import { useState } from "react";
import { Play } from "lucide-react";
import type { LinkMetadata } from "@/types/linkPreview";

interface YouTubeEmbedProps {
  url: string;
  metadata?: LinkMetadata;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

const YouTubeEmbed = ({ url, metadata }: YouTubeEmbedProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    return null;
  }
  
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  
  if (isPlaying) {
    return (
      <div className="mt-2 max-w-lg rounded-lg overflow-hidden border bg-card">
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            title={metadata?.title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    );
  }
  
  return (
    <button
      onClick={() => setIsPlaying(true)}
      className="mt-2 max-w-lg rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors block text-left group"
    >
      <div className="aspect-video relative bg-muted">
        <img
          src={thumbnailUrl}
          alt={metadata?.title || 'YouTube video thumbnail'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fall back to default thumbnail
            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </div>
        </div>
      </div>
      {metadata?.title && (
        <div className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>YouTube</span>
          </div>
          <h4 className="font-medium text-sm line-clamp-2">{metadata.title}</h4>
        </div>
      )}
    </button>
  );
};

export default YouTubeEmbed;
