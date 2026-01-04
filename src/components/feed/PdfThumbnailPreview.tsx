/**
 * PDF Thumbnail Preview Component
 * Renders a first-page thumbnail of a PDF file with loading and error states
 */

import { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { generatePdfThumbnail, generatePdfThumbnailFromUrl } from '@/lib/pdf/pdfThumbnail';
import { cn } from '@/lib/utils';

interface PdfThumbnailPreviewProps {
  /** PDF file object (for new uploads) */
  file?: File;
  /** PDF URL (for existing attachments) */
  url?: string;
  /** File name to display */
  fileName: string;
  /** Additional class names */
  className?: string;
}

export const PdfThumbnailPreview = ({
  file,
  url,
  fileName,
  className,
}: PdfThumbnailPreviewProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const generateThumbnail = async () => {
      setIsLoading(true);
      setHasError(false);
      setThumbnailUrl(null);

      try {
        let result;
        if (file) {
          result = await generatePdfThumbnail(file, 200);
        } else if (url) {
          result = await generatePdfThumbnailFromUrl(url, 200);
        } else {
          throw new Error('No file or URL provided');
        }

        if (!cancelled) {
          setThumbnailUrl(result.dataUrl);
        }
      } catch (error) {
        console.warn('Failed to generate PDF thumbnail:', error);
        if (!cancelled) {
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    generateThumbnail();

    return () => {
      cancelled = true;
    };
  }, [file, url]);

  // Clean up filename for display
  const displayName = fileName.length > 20 
    ? `${fileName.slice(0, 17)}...` 
    : fileName;

  return (
    <div
      className={cn(
        'relative w-full h-20 rounded-lg overflow-hidden border border-rose-200 dark:border-rose-800',
        'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30',
        className
      )}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <Loader2 className="h-5 w-5 text-rose-500 animate-spin" />
          <span className="text-[9px] text-rose-600 dark:text-rose-400">Loading...</span>
        </div>
      )}

      {/* Thumbnail image */}
      {!isLoading && thumbnailUrl && !hasError && (
        <img
          src={thumbnailUrl}
          alt={`Preview of ${fileName}`}
          className="w-full h-full object-cover"
        />
      )}

      {/* Fallback icon state */}
      {!isLoading && (hasError || !thumbnailUrl) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <FileText className="h-6 w-6 text-rose-500" />
          <span className="text-[10px] text-rose-600 dark:text-rose-400 text-center line-clamp-1 font-medium">
            {displayName}
          </span>
        </div>
      )}

      {/* PDF badge overlay (shown when thumbnail is visible) */}
      {!isLoading && thumbnailUrl && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white font-medium truncate">
              {displayName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
