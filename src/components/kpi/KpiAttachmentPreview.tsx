import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Image, FileText, Download, ExternalLink } from 'lucide-react';
import type { KpiAttachment } from '@/types/kpi';

interface KpiAttachmentPreviewProps {
  attachments: KpiAttachment[];
}

export const KpiAttachmentPreview = ({ attachments }: KpiAttachmentPreviewProps) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const imageAttachments = attachments.filter(a => a.type.startsWith('image/'));
  const otherAttachments = attachments.filter(a => !a.type.startsWith('image/'));

  return (
    <>
      <div className="mt-3 space-y-2">
        {/* Image thumbnails */}
        {imageAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageAttachments.map((file, index) => (
              <button
                key={index}
                onClick={() => setLightboxImage(file.url)}
                className="relative group rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
              >
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-16 w-16 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Other files */}
        {otherAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherAttachments.map((file, index) => (
              <a
                key={index}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-lg px-3 py-2 text-sm transition-colors"
              >
                {getFileIcon(file.type)}
                <div className="flex flex-col">
                  <span className="truncate max-w-[120px] text-xs font-medium">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </span>
                </div>
                <Download className="h-3 w-3 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {lightboxImage && (
            <div className="relative">
              <img
                src={lightboxImage}
                alt="Preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <a
                href={lightboxImage}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-4 right-4"
              >
                <Button size="sm" variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
