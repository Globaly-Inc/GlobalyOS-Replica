import { useRef } from 'react';
import { Paperclip, Download, Trash2, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTaskAttachments, useUploadTaskAttachment, useDeleteTaskAttachment } from '@/services/useTaskAttachments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TaskAttachmentsProps {
  taskId: string;
  organizationId: string;
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const TaskAttachments = ({ taskId, organizationId }: TaskAttachmentsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments = [] } = useTaskAttachments(taskId);
  const upload = useUploadTaskAttachment();
  const deleteAttachment = useDeleteTaskAttachment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 20MB limit`);
        continue;
      }
      try {
        await upload.mutateAsync({ taskId, organizationId, file });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (filePath: string, fileName: string) => {
    const { data } = supabase.storage.from('task-attachments').getPublicUrl(filePath);
    const a = document.createElement('a');
    a.href = data.publicUrl;
    a.download = fileName;
    a.target = '_blank';
    a.click();
  };

  const handleDelete = async (id: string, filePath: string, fileName?: string) => {
    try {
      await deleteAttachment.mutateAsync({ id, taskId, filePath, fileName });
      toast.success('Attachment deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium">Attachments</h3>
        <span className="text-xs text-muted-foreground">{attachments.length}</span>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
        >
          <Paperclip className="h-3 w-3" />
          {upload.isPending ? 'Uploading...' : 'Attach'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((att: any) => (
            <div key={att.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-md hover:bg-muted/50 text-xs">
              <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{att.file_name}</span>
              <span className="text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5"
                onClick={() => handleDownload(att.file_path, att.file_name)}
              >
                <Download className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5"
                onClick={() => handleDelete(att.id, att.file_path, att.file_name)}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
