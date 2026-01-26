/**
 * Link Preview Renderer
 * Orchestrates link detection and renders appropriate preview components
 */

import { useMemo } from "react";
import { extractLinks, type ExtractedLink } from "@/types/linkPreview";
import { useLinkMetadata } from "@/hooks/useLinkMetadata";

// Platform-specific preview components
import YouTubeEmbed from "./previews/YouTubeEmbed";
import SpotifyEmbed from "./previews/SpotifyEmbed";
import LoomEmbed from "./previews/LoomEmbed";
import TwitterEmbed from "./previews/TwitterEmbed";
import TikTokPreview from "./previews/TikTokPreview";
import InstagramPreview from "./previews/InstagramPreview";
import FacebookPreview from "./previews/FacebookPreview";
import GoogleDocPreview from "./previews/GoogleDocPreview";
import FigmaPreview from "./previews/FigmaPreview";
import GenericLinkCard from "./previews/GenericLinkCard";

interface LinkPreviewRendererProps {
  content: string;
  messageId: string;
  maxPreviews?: number;
}

/**
 * Individual link preview with metadata fetching
 */
const LinkPreview = ({ link }: { link: ExtractedLink }) => {
  const { data: metadata, isLoading } = useLinkMetadata(link.url, true);
  
  switch (link.platform) {
    case 'youtube':
      return <YouTubeEmbed url={link.url} metadata={metadata || undefined} />;
    
    case 'spotify':
      return <SpotifyEmbed url={link.url} metadata={metadata || undefined} />;
    
    case 'loom':
      return <LoomEmbed url={link.url} metadata={metadata || undefined} />;
    
    case 'twitter':
      return <TwitterEmbed url={link.url} metadata={metadata || undefined} />;
    
    case 'tiktok':
      return <TikTokPreview url={link.url} metadata={metadata || undefined} />;
    
    case 'instagram':
      return <InstagramPreview url={link.url} metadata={metadata || undefined} />;
    
    case 'facebook':
      return <FacebookPreview url={link.url} metadata={metadata || undefined} />;
    
    case 'google-docs':
    case 'google-sheets':
    case 'google-slides':
      return <GoogleDocPreview url={link.url} metadata={metadata || undefined} platform={link.platform} />;
    
    case 'figma':
      return <FigmaPreview url={link.url} metadata={metadata || undefined} />;
    
    default:
      return <GenericLinkCard url={link.url} metadata={metadata || undefined} isLoading={isLoading} />;
  }
};

const LinkPreviewRenderer = ({ content, messageId, maxPreviews = 3 }: LinkPreviewRendererProps) => {
  // Extract all unique links from content
  const links = useMemo(() => {
    const extracted = extractLinks(content);
    // Deduplicate by URL
    const seen = new Set<string>();
    return extracted.filter(link => {
      if (seen.has(link.url)) return false;
      seen.add(link.url);
      return true;
    }).slice(0, maxPreviews);
  }, [content, maxPreviews]);
  
  if (links.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <LinkPreview key={`${messageId}-${link.url}-${index}`} link={link} />
      ))}
    </div>
  );
};

export default LinkPreviewRenderer;
