/**
 * Loom Embed Component
 * Renders an inline Loom video player
 */

import { useState } from "react";
import { Play, Video } from "lucide-react";
import type { LinkMetadata } from "@/types/linkPreview";

interface LoomEmbedProps {
  url: string;
  metadata?: LinkMetadata;
}

/**
 * Extract Loom video ID from URL
 */
function extractLoomId(url: string): string | null {
  const patterns = [
    /loom\.com\/share\/([a-zA-Z0-9]+)/,
    /loom\.com\/embed\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

const LoomEmbed = ({ url, metadata }: LoomEmbedProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = extractLoomId(url);
  
  if (!videoId) {
    return null;
  }
  
  const embedUrl = `https://www.loom.com/embed/${videoId}?autoplay=1`;
  const thumbnailUrl = `https://cdn.loom.com/sessions/thumbnails/${videoId}-with-play.gif`;
  
  if (isPlaying) {
    return (
      <div className="mt-2 max-w-lg rounded-lg overflow-hidden border bg-card">
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            title={metadata?.title || 'Loom video'}
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
        {metadata?.image ? (
          <img
            src={metadata.image}
            alt={metadata?.title || 'Loom video thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-800">
            <Video className="h-16 w-16 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.6 9.6 0 1 1 0-19.2 9.6 9.6 0 0 1 0 19.2zm-2.4-6V8.4l6 3.6-6 3.6z"/>
          </svg>
          <span>Loom</span>
        </div>
        {metadata?.title && (
          <h4 className="font-medium text-sm line-clamp-2">{metadata.title}</h4>
        )}
      </div>
    </button>
  );
};

export default LoomEmbed;
