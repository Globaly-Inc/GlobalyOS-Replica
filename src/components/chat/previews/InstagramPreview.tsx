/**
 * Instagram Preview Component
 * Renders a rich preview card for Instagram posts, reels, and stories
 */

import { ExternalLink, Image, Film, Clock } from "lucide-react";
import type { LinkMetadata } from "@/types/linkPreview";

interface InstagramPreviewProps {
  url: string;
  metadata?: LinkMetadata;
}

/**
 * Extract Instagram content type and info from URL
 */
function extractInstagramInfo(url: string): { type: 'post' | 'reel' | 'story' | 'profile'; id?: string; username?: string } {
  if (/instagram\.com\/p\/([a-zA-Z0-9_-]+)/.test(url)) {
    const match = url.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
    return { type: 'post', id: match?.[1] };
  }
  if (/instagram\.com\/reel\/([a-zA-Z0-9_-]+)/.test(url)) {
    const match = url.match(/instagram\.com\/reel\/([a-zA-Z0-9_-]+)/);
    return { type: 'reel', id: match?.[1] };
  }
  if (/instagram\.com\/stories\/([^\/]+)/.test(url)) {
    const match = url.match(/instagram\.com\/stories\/([^\/]+)/);
    return { type: 'story', username: match?.[1] };
  }
  if (/instagram\.com\/([^\/\?]+)/.test(url)) {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    return { type: 'profile', username: match?.[1] };
  }
  return { type: 'post' };
}

const InstagramPreview = ({ url, metadata }: InstagramPreviewProps) => {
  const info = extractInstagramInfo(url);
  
  const TypeIcon = info.type === 'reel' ? Film : info.type === 'story' ? Clock : Image;
  const typeLabel = info.type === 'reel' ? 'Reel' : info.type === 'story' ? 'Story' : info.type === 'profile' ? 'Profile' : 'Post';
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 max-w-md rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors block group"
    >
      {metadata?.image && (
        <div className="aspect-square max-h-80 bg-muted">
          <img
            src={metadata.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
          <span>Instagram {typeLabel}</span>
          <TypeIcon className="h-3 w-3" />
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
          <span>View on Instagram</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
};

export default InstagramPreview;
