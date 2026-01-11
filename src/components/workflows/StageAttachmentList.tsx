import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileIcon, Download, Trash2, Image as ImageIcon, FileText, Film, Music } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { getSignedAttachmentUrl, type StageAttachment } from "@/services/useWorkflowStageNotes";
import { cn } from "@/lib/utils";

interface StageAttachmentListProps {
  attachments: StageAttachment[];
  currentEmployeeId: string | undefined;
  onDelete: (attachmentId: string, filePath: string) => void;
  isDeleting?: boolean;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return FileIcon;
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType.startsWith("video/")) return Film;
  if (fileType.startsWith("audio/")) return Music;
  if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("text")) return FileText;
  return FileIcon;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StageAttachmentList({
  attachments,
  currentEmployeeId,
  onDelete,
  isDeleting,
}: StageAttachmentListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<StageAttachment | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (attachment: StageAttachment) => {
    setDownloading(attachment.id);
    try {
      const signedUrl = await getSignedAttachmentUrl(attachment.file_path);
      if (signedUrl) {
        // Open in new tab or trigger download
        const link = document.createElement("a");
        link.href = signedUrl;
        link.download = attachment.file_name;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteClick = (attachment: StageAttachment) => {
    setAttachmentToDelete(attachment);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (attachmentToDelete) {
      onDelete(attachmentToDelete.id, attachmentToDelete.file_path);
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  if (attachments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">No attachments yet</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const IconComponent = getFileIcon(attachment.file_type);
          const isOwnAttachment = attachment.employee_id === currentEmployeeId;
          const uploaderName = attachment.employee?.profiles?.full_name || "Unknown";
          const isImage = attachment.file_type?.startsWith("image/");

          return (
            <div
              key={attachment.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md border bg-muted/30",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <div className={cn(
                "shrink-0 h-10 w-10 rounded flex items-center justify-center",
                isImage ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"
              )}>
                <IconComponent className={cn(
                  "h-5 w-5",
                  isImage ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={attachment.file_name}>
                  {attachment.file_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>·</span>
                  <span>by {uploaderName}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(attachment.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDownload(attachment)}
                  disabled={downloading === attachment.id}
                >
                  <Download className="h-4 w-4" />
                </Button>

                {isOwnAttachment && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(attachment)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{attachmentToDelete?.file_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
