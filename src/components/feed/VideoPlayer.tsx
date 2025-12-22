/**
 * Video Player Component with Auto-play on Viewport Visibility
 * - Uses IntersectionObserver to detect visibility
 * - Auto-plays when in view, pauses when out of view
 * - Starts muted, with mute/unmute toggle
 * - Expand button to open in lightbox
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Maximize2, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  onExpand: () => void;
  className?: string;
}

export const VideoPlayer = ({ src, onExpand, className }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayPauseIndicator, setShowPlayPauseIndicator] = useState(false);
  const [progress, setProgress] = useState(0);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // IntersectionObserver to detect when video is in viewport
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is in view - attempt to play
            video.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              // Auto-play was prevented, keep muted and try again
              video.muted = true;
              setIsMuted(true);
              video.play().then(() => {
                setIsPlaying(true);
              }).catch(() => {
                // Still failed, just show as paused
                setIsPlaying(false);
              });
            });
          } else {
            // Video is out of view - pause
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: 0.5, // 50% of video must be visible
        rootMargin: '0px',
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Update progress bar
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // Toggle mute
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  // Toggle play/pause with indicator
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Play was prevented
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }

    // Show play/pause indicator briefly
    setShowPlayPauseIndicator(true);
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    indicatorTimeoutRef.current = setTimeout(() => {
      setShowPlayPauseIndicator(false);
    }, 600);
  }, []);

  // Handle expand click
  const handleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Pause the inline video when opening lightbox
    const video = videoRef.current;
    if (video) {
      video.pause();
      setIsPlaying(false);
    }
    onExpand();
  }, [onExpand]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={cn("relative w-full h-full group", className)}
    >
      <video
        ref={videoRef}
        src={src}
        loop
        muted={isMuted}
        playsInline
        className="w-full h-full object-cover cursor-pointer"
        onClick={togglePlayPause}
      />

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls overlay - always visible on mobile, show on hover for desktop */}
      <div className="absolute bottom-1 left-0 right-0 px-2 pb-1 pt-8 bg-gradient-to-t from-black/60 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          {/* Mute/Unmute button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          {/* Expand button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleExpand}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Play/Pause indicator overlay */}
      {showPlayPauseIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center animate-ping-once">
            {isPlaying ? (
              <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
            ) : (
              <Pause className="h-8 w-8 text-white" fill="currentColor" />
            )}
          </div>
        </div>
      )}

      {/* Muted indicator in corner when sound is off */}
      {isMuted && !showPlayPauseIndicator && (
        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <VolumeX className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
};
