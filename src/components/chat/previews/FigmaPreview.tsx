/**
 * Figma Preview Component
 * Renders a preview card for Figma files and designs
 */

import { ExternalLink, Figma } from "lucide-react";
import type { LinkMetadata } from "@/types/linkPreview";

interface FigmaPreviewProps {
  url: string;
  metadata?: LinkMetadata;
}

/**
 * Extract Figma file info from URL
 */
function extractFigmaInfo(url: string): { type: 'file' | 'design' | 'prototype' | 'board'; fileId?: string } {
  if (/figma\.com\/file\/([a-zA-Z0-9]+)/.test(url)) {
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    return { type: 'file', fileId: match?.[1] };
  }
  if (/figma\.com\/design\/([a-zA-Z0-9]+)/.test(url)) {
    const match = url.match(/figma\.com\/design\/([a-zA-Z0-9]+)/);
    return { type: 'design', fileId: match?.[1] };
  }
  if (/figma\.com\/proto\/([a-zA-Z0-9]+)/.test(url)) {
    const match = url.match(/figma\.com\/proto\/([a-zA-Z0-9]+)/);
    return { type: 'prototype', fileId: match?.[1] };
  }
  if (/figma\.com\/board\/([a-zA-Z0-9]+)/.test(url)) {
    const match = url.match(/figma\.com\/board\/([a-zA-Z0-9]+)/);
    return { type: 'board', fileId: match?.[1] };
  }
  return { type: 'file' };
}

const FigmaPreview = ({ url, metadata }: FigmaPreviewProps) => {
  const info = extractFigmaInfo(url);
  
  const typeLabels: Record<string, string> = {
    file: 'Figma File',
    design: 'Figma Design',
    prototype: 'Figma Prototype',
    board: 'FigJam Board',
  };
  
  // Extract file name from URL or metadata
  const getFileName = () => {
    if (metadata?.title && !metadata.title.toLowerCase().includes('figma')) {
      return metadata.title;
    }
    // Try to extract from URL
    const urlMatch = url.match(/\/(?:file|design|proto|board)\/[^\/]+\/([^\/?]+)/);
    if (urlMatch) {
      return decodeURIComponent(urlMatch[1].replace(/-/g, ' '));
    }
    return 'Figma File';
  };
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 max-w-md rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors block group"
    >
      {metadata?.image && (
        <div className="aspect-video bg-muted">
          <img
            src={metadata.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" fill="#F24E1E"/>
            <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" fill="#FF7262"/>
            <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" fill="#1ABCFE"/>
            <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" fill="#0ACF83"/>
            <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" fill="#A259FF"/>
          </svg>
          <span>{typeLabels[info.type]}</span>
        </div>
        
        <h4 className="font-medium text-sm line-clamp-2 mb-1">{getFileName()}</h4>
        
        {metadata?.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        )}
        
        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
          <span>Open in Figma</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
};

export default FigmaPreview;
