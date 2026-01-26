/**
 * Google Docs/Sheets/Slides Preview Component
 * Renders a preview card for Google Workspace documents
 */

import { ExternalLink, FileText, Table, Presentation } from "lucide-react";
import type { LinkMetadata, LinkPlatform } from "@/types/linkPreview";
import { getDomain } from "@/types/linkPreview";

interface GoogleDocPreviewProps {
  url: string;
  metadata?: LinkMetadata;
  platform: LinkPlatform;
}

const GoogleDocPreview = ({ url, metadata, platform }: GoogleDocPreviewProps) => {
  const getDocInfo = () => {
    switch (platform) {
      case 'google-sheets':
        return {
          icon: Table,
          label: 'Google Sheets',
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
        };
      case 'google-slides':
        return {
          icon: Presentation,
          label: 'Google Slides',
          color: 'text-amber-600',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        };
      default:
        return {
          icon: FileText,
          label: 'Google Docs',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        };
    }
  };
  
  const docInfo = getDocInfo();
  const Icon = docInfo.icon;
  
  // Extract document title from URL or metadata
  const getTitle = () => {
    if (metadata?.title && !metadata.title.includes('Google')) {
      return metadata.title;
    }
    // Try to extract from URL path
    const match = url.match(/\/d\/([^\/]+)/);
    if (match) {
      return 'Untitled document';
    }
    return metadata?.title || 'Google Document';
  };
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 max-w-md rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors flex items-center gap-3 p-3 group"
    >
      <div className={`shrink-0 w-12 h-12 rounded-lg ${docInfo.bgColor} flex items-center justify-center`}>
        <Icon className={`h-6 w-6 ${docInfo.color}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{docInfo.label}</span>
        </div>
        
        <h4 className="font-medium text-sm line-clamp-1">{getTitle()}</h4>
        
        {metadata?.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {metadata.description}
          </p>
        )}
      </div>
      
      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </a>
  );
};

export default GoogleDocPreview;
