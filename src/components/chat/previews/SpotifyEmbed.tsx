/**
 * Spotify Embed Component
 * Renders an inline Spotify player for tracks, albums, playlists, and podcasts
 */

import type { LinkMetadata } from "@/types/linkPreview";

interface SpotifyEmbedProps {
  url: string;
  metadata?: LinkMetadata;
}

/**
 * Extract Spotify content type and ID from URL
 */
function extractSpotifyInfo(url: string): { type: string; id: string } | null {
  const patterns = [
    /open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/,
    /spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { type: match[1], id: match[2] };
    }
  }
  
  return null;
}

const SpotifyEmbed = ({ url, metadata }: SpotifyEmbedProps) => {
  const info = extractSpotifyInfo(url);
  
  if (!info) {
    return null;
  }
  
  const embedUrl = `https://open.spotify.com/embed/${info.type}/${info.id}?utm_source=generator&theme=0`;
  const height = info.type === 'track' || info.type === 'episode' ? 152 : 352;
  
  return (
    <div className="mt-2 max-w-lg rounded-lg overflow-hidden border bg-card">
      <iframe
        src={embedUrl}
        title={metadata?.title || 'Spotify content'}
        width="100%"
        height={height}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-lg"
      />
    </div>
  );
};

export default SpotifyEmbed;
