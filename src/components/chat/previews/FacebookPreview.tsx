/**
 * Facebook Preview Component
 * Renders a rich preview card for Facebook posts and videos
 */

import { ExternalLink, Play } from "lucide-react";
import type { LinkMetadata } from "@/types/linkPreview";

interface FacebookPreviewProps {
  url: string;
  metadata?: LinkMetadata;
}

/**
 * Detect if URL is a video
 */
function isVideoUrl(url: string): boolean {
  return /fb\.watch|facebook\.com\/.*\/videos\/|facebook\.com\/watch/.test(url);
}

const FacebookPreview = ({ url, metadata }: FacebookPreviewProps) => {
  const isVideo = isVideoUrl(url);
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 max-w-md rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors block group"
    >
      {metadata?.image && (
        <div className="aspect-video relative bg-muted">
          <img
            src={metadata.image}
            alt=""
            className="w-full h-full object-cover"
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-14 h-14 rounded-full bg-blue-600/90 flex items-center justify-center">
                <Play className="h-7 w-7 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <svg className="w-4 h-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span>Facebook{isVideo ? ' Video' : ''}</span>
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
          <span>View on Facebook</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
};

export default FacebookPreview;
