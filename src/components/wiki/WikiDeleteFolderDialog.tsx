import { useEffect } from "react";
import { Folder, FileText, File, AlertTriangle } from "lucide-react";
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
import { useWikiFolderContentsCount } from "@/services/useWiki";
import { Skeleton } from "@/components/ui/skeleton";

interface WikiDeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  onConfirm: () => void;
}

export const WikiDeleteFolderDialog = ({
  open,
  onOpenChange,
  folderId,
  folderName,
  onConfirm,
}: WikiDeleteFolderDialogProps) => {
  const { data: counts, isLoading, refetch } = useWikiFolderContentsCount(open ? folderId : null);

  // Refetch when dialog opens
  useEffect(() => {
    if (open && folderId) {
      refetch();
    }
  }, [open, folderId, refetch]);

  const hasContents = counts && (counts.folder_count > 0 || counts.page_count > 0 || counts.file_count > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Folder
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete "<span className="font-medium text-foreground">{folderName}</span>"?
              </p>
              
              {isLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ) : hasContents ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    This will permanently delete:
                  </p>
                  <ul className="space-y-1.5">
                    {counts.folder_count > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <Folder className="h-4 w-4 text-amber-500" />
                        <span>{counts.folder_count} subfolder{counts.folder_count !== 1 ? 's' : ''}</span>
                      </li>
                    )}
                    {counts.page_count > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>{counts.page_count} page{counts.page_count !== 1 ? 's' : ''}</span>
                      </li>
                    )}
                    {counts.file_count > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <span>{counts.file_count} file{counts.file_count !== 1 ? 's' : ''}</span>
                      </li>
                    )}
                  </ul>
                </div>
              ) : null}
              
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete{hasContents ? ' All' : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
