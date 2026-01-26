/**
 * Generic Link Card Component
 * Renders a rich preview card for any website using OpenGraph metadata
 */

import { ExternalLink, Globe } from "lucide-react";
import type { LinkMetadata } from "@/types/linkPreview";
import { getDomain } from "@/types/linkPreview";

interface GenericLinkCardProps {
  url: string;
  metadata?: LinkMetadata;
  isLoading?: boolean;
}

const GenericLinkCard = ({ url, metadata, isLoading }: GenericLinkCardProps) => {
  const domain = getDomain(url);
  
  if (isLoading) {
    return (
      <div className="mt-2 max-w-md rounded-lg overflow-hidden border bg-card animate-pulse">
        <div className="aspect-video bg-muted" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }
  
  // If no metadata, show a simple link card
  if (!metadata || (!metadata.title && !metadata.image)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 max-w-md rounded-lg border bg-card hover:bg-accent/50 transition-colors flex items-center gap-3 p-3 group"
      >
        <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          {metadata?.favicon ? (
            <img 
              src={metadata.favicon} 
              alt="" 
              className="w-5 h-5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{domain}</p>
          <p className="text-xs text-muted-foreground truncate">{url}</p>
        </div>
        
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </a>
    );
  }
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 max-w-md rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors block group"
    >
      {metadata.image && (
        <div className="aspect-video bg-muted">
          <img
            src={metadata.image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {metadata.favicon ? (
            <img 
              src={metadata.favicon} 
              alt="" 
              className="w-4 h-4"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-4 h-4" />
          )}
          <span>{metadata.siteName || domain}</span>
        </div>
        
        {metadata.title && (
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{metadata.title}</h4>
        )}
        
        {metadata.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        )}
      </div>
    </a>
  );
};

export default GenericLinkCard;
