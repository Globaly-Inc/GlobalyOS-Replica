import { useState } from "react";
import { FileIcon, Download, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/types/chat";
import { PDFViewer } from "@/components/feed/PDFViewer";
import { VideoPlayer } from "@/components/feed/VideoPlayer";

interface AttachmentRendererProps {
  attachments: ChatAttachment[];
  isOwn?: boolean;
}

const AttachmentRenderer = ({ attachments, isOwn }: AttachmentRendererProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!attachments || attachments.length === 0) return null;

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Media type detection helpers
  const isImage = (fileType: string | null) => {
    return fileType?.startsWith('image/');
  };

  const isPdf = (fileType: string | null, fileName?: string) => {
    return fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
  };

  const isGif = (fileType: string | null, fileName?: string) => {
    return fileType === 'image/gif' || fileName?.toLowerCase().endsWith('.gif');
  };

  const isVideo = (fileType: string | null) => {
    return fileType?.startsWith('video/');
  };

  // Separate media (images, videos, PDFs, GIFs) from other files
  const mediaAttachments = attachments.filter(a => 
    isImage(a.file_type) || isVideo(a.file_type) || isPdf(a.file_type, a.file_name)
  );
  const fileAttachments = attachments.filter(a => 
    !isImage(a.file_type) && !isVideo(a.file_type) && !isPdf(a.file_type, a.file_name)
  );

  const handleDownload = async (attachment: ChatAttachment) => {
    const url = getPublicUrl(attachment.file_path);
    window.open(url, '_blank');
  };

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaAttachments.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === mediaAttachments.length - 1 ? 0 : prev + 1));
  };

  // Grid class based on media count
  const getGridClass = () => {
    switch (mediaAttachments.length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
      case 4:
        return 'grid-cols-2';
      default:
        return 'grid-cols-3';
    }
  };

  // Check if single PDF for edge-to-edge display
  const isSinglePdf = mediaAttachments.length === 1 && isPdf(mediaAttachments[0].file_type, mediaAttachments[0].file_name);

  const renderMediaItem = (attachment: ChatAttachment, index: number, isInLightbox = false) => {
    const publicUrl = getPublicUrl(attachment.file_path);
    const attachmentIsGif = isGif(attachment.file_type, attachment.file_name);
    const attachmentIsPdf = isPdf(attachment.file_type, attachment.file_name);
    const attachmentIsVideo = isVideo(attachment.file_type);

    // PDF rendering
    if (attachmentIsPdf) {
      return (
        <div className="w-full h-full group">
          <PDFViewer
            fileUrl={publicUrl}
            mode={isInLightbox ? 'lightbox' : 'inline'}
            onExpand={isInLightbox ? undefined : () => openLightbox(index)}
            className={isInLightbox ? "min-h-[500px]" : "h-full"}
          />
        </div>
      );
    }

    // Video rendering
    if (attachmentIsVideo) {
      if (isInLightbox) {
        return (
          <video
            src={publicUrl}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] mx-auto rounded-lg"
          />
        );
      }
      return (
        <VideoPlayer
          src={publicUrl}
          onExpand={() => openLightbox(index)}
        />
      );
    }

    // Image/GIF rendering
    return (
      <div className="relative w-full h-full">
        <img
          src={publicUrl}
          alt={attachment.file_name}
          loading="eager"
          className={cn(
            "object-cover",
            isInLightbox
              ? "max-w-full max-h-[80vh] mx-auto rounded-lg"
              : "w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
          )}
          onClick={isInLightbox ? undefined : () => openLightbox(index)}
        />
        {/* GIF badge */}
        {attachmentIsGif && !isInLightbox && (
          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/70 text-white rounded">
            GIF
          </span>
        )}
        {/* Download button on hover */}
        {!isInLightbox && (
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(attachment);
              }}
              className="p-1 bg-background/80 rounded-full hover:bg-background"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Media Grid */}
      {mediaAttachments.length > 0 && (
        <div className={cn(
          "grid gap-1 mt-2",
          !isSinglePdf && "max-w-[320px]",
          getGridClass()
        )}>
          {mediaAttachments.slice(0, 6).map((attachment, index) => (
            <div
              key={attachment.id}
              className={cn(
                "relative overflow-hidden bg-muted group",
                // Single PDF: no fixed aspect ratio
                isSinglePdf && "rounded-lg",
                // Single non-PDF media
                mediaAttachments.length === 1 && !isSinglePdf && "aspect-video rounded-lg",
                // Multiple items
                mediaAttachments.length >= 2 && "rounded-lg",
                mediaAttachments.length === 2 && "aspect-square",
                mediaAttachments.length === 3 && index === 0 && "row-span-2 aspect-auto h-full",
                mediaAttachments.length === 3 && index > 0 && "aspect-square",
                mediaAttachments.length === 4 && "aspect-square",
                mediaAttachments.length === 5 && index < 3 && "aspect-square",
                mediaAttachments.length === 5 && index >= 3 && "aspect-[4/3]",
                mediaAttachments.length >= 6 && "aspect-square"
              )}
            >
              {renderMediaItem(attachment, index)}

              {/* More indicator - show on 6th item if there are more */}
              {index === 5 && mediaAttachments.length > 6 && (
                <div
                  className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
                  onClick={() => openLightbox(5)}
                >
                  <span className="text-white text-2xl font-semibold">
                    +{mediaAttachments.length - 6}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File attachments (non-media) */}
      {fileAttachments.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {fileAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity max-w-[280px]",
                isOwn ? 'bg-primary-foreground/10' : 'bg-background'
              )}
              onClick={() => handleDownload(attachment)}
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted">
                <FileIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

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
            {mediaAttachments.length > 1 && (
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
              {mediaAttachments[currentIndex] && renderMediaItem(mediaAttachments[currentIndex], currentIndex, true)}
            </div>

            {/* Dots indicator */}
            {mediaAttachments.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {mediaAttachments.map((_, idx) => (
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

export default AttachmentRenderer;
