import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const POST_TYPE_LABELS: Record<string, string> = {
  win: 'Win',
  kudos: 'Kudos',
  announcement: 'Announcement',
  social: 'Post',
  update: 'Update',
  executive_message: 'Executive Message',
};

interface DeletePostDialogProps {
  postType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const DeletePostDialog = ({
  postType,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeletePostDialogProps) => {
  const label = POST_TYPE_LABELS[postType] || 'Post';

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Are you sure you want to delete this {label.toLowerCase()}?</p>
              <div className="rounded-md bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive mb-2">
                  This action cannot be undone.
                </p>
                <p className="text-muted-foreground mb-2">
                  The following will be permanently deleted:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>The post content</li>
                  <li>All media attachments (images, videos)</li>
                  <li>All reactions</li>
                  <li>All comments</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${label}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
