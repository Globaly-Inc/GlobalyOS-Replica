/**
 * Twitter/X Embed Component
 * Renders a rich tweet preview card
 */

import { ExternalLink } from "lucide-react";
import type { LinkMetadata } from "@/types/linkPreview";
import { getDomain } from "@/types/linkPreview";

interface TwitterEmbedProps {
  url: string;
  metadata?: LinkMetadata;
}

/**
 * Extract tweet info from URL
 */
function extractTweetInfo(url: string): { username: string; tweetId: string } | null {
  const patterns = [
    /(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { username: match[1], tweetId: match[2] };
    }
  }
  
  return null;
}

const TwitterEmbed = ({ url, metadata }: TwitterEmbedProps) => {
  const tweetInfo = extractTweetInfo(url);
  const domain = getDomain(url);
  const isX = domain.includes('x.com');
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 max-w-lg rounded-lg overflow-hidden border bg-card hover:bg-accent/50 transition-colors block group"
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
          {isX ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#1DA1F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          )}
          <span>{isX ? 'X (Twitter)' : 'Twitter'}</span>
          {tweetInfo && (
            <span className="text-muted-foreground">@{tweetInfo.username}</span>
          )}
        </div>
        
        {metadata?.title && (
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{metadata.title}</h4>
        )}
        
        {metadata?.description && (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {metadata.description}
          </p>
        )}
        
        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
          <span>View on {isX ? 'X' : 'Twitter'}</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  );
};

export default TwitterEmbed;
