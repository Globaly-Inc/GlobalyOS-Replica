/**
 * GIF Picker Component
 * Search and select GIFs using Tenor API (no API key required for basic usage)
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tenor API key (free tier, limited usage)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const TENOR_CLIENT_KEY = 'globalyos_web';

interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    tinygif: { url: string };
    gif: { url: string };
  };
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  triggerClassName?: string;
}

export const GifPicker = ({ onSelect, triggerClassName }: GifPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingGifs, setTrendingGifs] = useState<TenorGif[]>([]);

  // Fetch trending GIFs on mount
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch(
          `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`
        );
        const data = await response.json();
        if (data.results) {
          setTrendingGifs(data.results);
        }
      } catch (error) {
        console.error('Failed to fetch trending GIFs:', error);
      }
    };

    if (open && trendingGifs.length === 0) {
      fetchTrending();
    }
  }, [open, trendingGifs.length]);

  // Debounced search
  const searchGifs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&q=${encodeURIComponent(query)}&limit=30`
      );
      const data = await response.json();
      if (data.results) {
        setGifs(data.results);
      }
    } catch (error) {
      console.error('Failed to search GIFs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchGifs(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, searchGifs]);

  const handleSelect = (gif: TenorGif) => {
    const gifUrl = gif.media_formats.gif?.url || gif.media_formats.tinygif?.url;
    onSelect(gifUrl);
    setOpen(false);
    setSearch('');
  };

  const displayGifs = search.trim() ? gifs : trendingGifs;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-9 gap-2", triggerClassName)}
        >
          <Smile className="h-4 w-4 text-yellow-500" />
          <span className="hidden sm:inline">GIF</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GIFs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayGifs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {search.trim() ? 'No GIFs found' : 'Loading...'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 p-2">
              {displayGifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  className="relative aspect-square overflow-hidden rounded-md hover:ring-2 hover:ring-primary transition-all"
                >
                  <img
                    src={gif.media_formats.tinygif?.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <span className="text-xs text-muted-foreground">Powered by Tenor</span>
        </div>
      </PopoverContent>
    </Popover>
  );
};
