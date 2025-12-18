import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Image, FileText, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { KpiAttachment } from '@/types/kpi';

interface KpiAttachmentUploadProps {
  attachments: KpiAttachment[];
  onChange: (attachments: KpiAttachment[]) => void;
  organizationId: string;
  kpiId: string;
  maxFiles?: number;
}

export const KpiAttachmentUpload = ({
  attachments,
  onChange,
  organizationId,
  kpiId,
  maxFiles = 5,
}: KpiAttachmentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const remainingSlots = maxFiles - attachments.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const newAttachments: KpiAttachment[] = [];

      for (const file of filesToUpload) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Invalid file type`);
          continue;
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: File too large (max 10MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${organizationId}/${kpiId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('kpi-attachments')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('kpi-attachments')
          .getPublicUrl(fileName);

        newAttachments.push({
          url: urlData.publicUrl,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }

      if (newAttachments.length > 0) {
        onChange([...attachments, ...newAttachments]);
        toast.success(`${newAttachments.length} file(s) uploaded`);
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [attachments, onChange, organizationId, kpiId, maxFiles]);

  const handleRemove = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    onChange(newAttachments);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="kpi-attachment-input"
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <label
          htmlFor="kpi-attachment-input"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? 'Uploading...' : 'Drop files or click to upload'}
          </span>
          <span className="text-xs text-muted-foreground">
            Images, PDF, Word (max 10MB, {maxFiles - attachments.length} remaining)
          </span>
        </label>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                getFileIcon(file.type)
              )}
              <div className="flex flex-col">
                <span className="truncate max-w-[120px] text-xs font-medium">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
