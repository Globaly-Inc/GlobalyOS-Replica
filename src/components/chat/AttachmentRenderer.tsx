import { useState } from "react";
import { FileIcon, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatAttachment } from "@/types/chat";
import ImageLightbox from "./ImageLightbox";

interface AttachmentRendererProps {
  attachments: ChatAttachment[];
  isOwn?: boolean;
}

const AttachmentRenderer = ({ attachments, isOwn }: AttachmentRendererProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  const isImage = (fileType: string | null) => {
    return fileType?.startsWith('image/');
  };

  const handleDownload = async (attachment: ChatAttachment) => {
    const url = getPublicUrl(attachment.file_path);
    window.open(url, '_blank');
  };

  // Collect all image attachments for lightbox navigation
  const imageAttachments = attachments
    .filter(a => isImage(a.file_type))
    .map(a => ({
      url: getPublicUrl(a.file_path),
      name: a.file_name,
    }));

  const handleImageClick = (attachment: ChatAttachment) => {
    const imageIndex = imageAttachments.findIndex(
      img => img.name === attachment.file_name
    );
    setLightboxIndex(imageIndex >= 0 ? imageIndex : 0);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-2 mt-2">
        {attachments.map((attachment) => {
          const publicUrl = getPublicUrl(attachment.file_path);
          
          if (isImage(attachment.file_type)) {
            return (
              <div key={attachment.id} className="relative group">
                <img
                  src={publicUrl}
                  alt={attachment.file_name}
                  loading="lazy"
                  className="max-w-full sm:max-w-[280px] max-h-[160px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity bg-muted"
                  onClick={() => handleImageClick(attachment)}
                />
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
              </div>
            );
          }

          return (
            <div
              key={attachment.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                isOwn ? 'bg-primary-foreground/10' : 'bg-background'
              }`}
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
          );
        })}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={imageAttachments}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
};

export default AttachmentRenderer;
