/**
 * Screenshot Placeholder Component
 * Displays a placeholder or actual screenshot with status tracking
 */

import { Camera, Loader2, ImageOff, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ScreenshotStatus = 'pending' | 'capturing' | 'completed' | 'failed';

interface ScreenshotPlaceholderProps {
  description: string;
  screenshotId?: string;
  imageUrl?: string;
  status?: ScreenshotStatus;
  annotation?: string;
  onCapture?: () => void;
  isAdmin?: boolean;
  className?: string;
}

export const ScreenshotPlaceholder = ({
  description,
  screenshotId,
  imageUrl: initialImageUrl,
  status: initialStatus = 'pending',
  annotation,
  onCapture,
  isAdmin = false,
  className,
}: ScreenshotPlaceholderProps) => {
  const [status, setStatus] = useState<ScreenshotStatus>(initialStatus);
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl);

  // Subscribe to realtime updates if we have a screenshotId
  useEffect(() => {
    if (!screenshotId) return;

    const channel = supabase
      .channel(`screenshot-${screenshotId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_screenshots',
          filter: `id=eq.${screenshotId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.status) {
            setStatus(newData.status);
          }
          if (newData.storage_path) {
            // Get public URL for the storage path
            const { data } = supabase.storage
              .from('doc_screenshots')
              .getPublicUrl(newData.storage_path);
            setImageUrl(data.publicUrl);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [screenshotId]);

  // Completed state - show the actual image
  if (status === 'completed' && imageUrl) {
    return (
      <figure className={cn('my-6', className)}>
        <div className="rounded-lg overflow-hidden border shadow-sm">
          <img
            src={imageUrl}
            alt={description}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
        {(annotation || description) && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Camera className="h-3.5 w-3.5" />
            {annotation || description}
          </figcaption>
        )}
      </figure>
    );
  }

  // Capturing state
  if (status === 'capturing') {
    return (
      <Card className={cn(
        'my-6 p-8 flex flex-col items-center justify-center bg-muted/50 border-dashed',
        className
      )}>
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
        <p className="text-sm font-medium">Capturing screenshot...</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </Card>
    );
  }

  // Failed state
  if (status === 'failed') {
    return (
      <Card className={cn(
        'my-6 p-8 flex flex-col items-center justify-center bg-destructive/5 border-destructive/20 border-dashed',
        className
      )}>
        <ImageOff className="h-10 w-10 text-destructive/50 mb-3" />
        <p className="text-sm font-medium text-destructive">Screenshot capture failed</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {isAdmin && onCapture && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onCapture}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry Capture
          </Button>
        )}
      </Card>
    );
  }

  // Pending state - show placeholder
  return (
    <Card className={cn(
      'my-6 p-8 flex flex-col items-center justify-center bg-muted/30 border-dashed',
      className
    )}>
      <Camera className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Screenshot Placeholder</p>
      <p className="text-xs text-muted-foreground/80 mt-1 text-center max-w-xs">{description}</p>
      {isAdmin && onCapture && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onCapture}>
          <Camera className="h-3.5 w-3.5 mr-1.5" />
          Capture Screenshot
        </Button>
      )}
    </Card>
  );
};
