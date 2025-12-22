/**
 * Post Media Gallery Component
 * Displays images and videos in a responsive grid
 */

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  media_type: string;
  file_url: string;
  thumbnail_url: string | null;
}

interface PostMediaProps {
  media: MediaItem[];
}

export const PostMedia = ({ media }: PostMediaProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!media || media.length === 0) return null;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const getGridClass = () => {
    switch (media.length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-2';
      case 4:
        return 'grid-cols-2';
      case 5:
        return 'grid-cols-3';
      case 6:
        return 'grid-cols-3';
      default:
        return 'grid-cols-3';
    }
  };

  const renderMediaItem = (item: MediaItem, index: number, isInLightbox = false) => {
    const isGif = item.media_type === 'gif' || item.file_url.toLowerCase().endsWith('.gif');
    
    if (item.media_type === 'video') {
      return (
        <div className="relative w-full h-full">
          {isInLightbox ? (
            <video
              src={item.file_url}
              controls
              className="max-w-full max-h-[80vh] mx-auto rounded-lg"
            />
          ) : (
            <div 
              className="relative w-full h-full cursor-pointer group"
              onClick={() => openLightbox(index)}
            >
              <video
                src={item.file_url}
                className="w-full h-full object-cover"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-foreground ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        <img
          src={item.file_url}
          alt=""
          className={cn(
            "object-cover",
            isInLightbox 
              ? "max-w-full max-h-[80vh] mx-auto rounded-lg" 
              : "w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
          )}
          onClick={isInLightbox ? undefined : () => openLightbox(index)}
        />
        {isGif && !isInLightbox && (
          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/70 text-white rounded">
            GIF
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={cn(
        "grid gap-1 px-4 pb-3",
        getGridClass()
      )}>
        {media.slice(0, 6).map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "relative overflow-hidden rounded-lg bg-muted",
              media.length === 1 && "aspect-video",
              media.length === 2 && "aspect-square",
              media.length === 3 && index === 0 && "row-span-2 aspect-auto h-full",
              media.length === 3 && index > 0 && "aspect-square",
              media.length === 4 && "aspect-square",
              media.length === 5 && index < 3 && "aspect-square",
              media.length === 5 && index >= 3 && "aspect-[4/3]",
              media.length >= 6 && "aspect-square"
            )}
          >
            {renderMediaItem(item, index)}
            
            {/* More indicator - show on 6th item if there are more */}
            {index === 5 && media.length > 6 && (
              <div 
                className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
                onClick={() => openLightbox(5)}
              >
                <span className="text-white text-2xl font-semibold">
                  +{media.length - 6}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation buttons */}
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Current media */}
            <div className="p-8">
              {renderMediaItem(media[currentIndex], currentIndex, true)}
            </div>

            {/* Dots indicator */}
            {media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {media.map((_, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      idx === currentIndex ? "bg-white" : "bg-white/40"
                    )}
                    onClick={() => setCurrentIndex(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
