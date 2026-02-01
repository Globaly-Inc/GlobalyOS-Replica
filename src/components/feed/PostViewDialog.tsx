/**
 * Post View Dialog
 * Displays a full post in a dialog with all functionality
 */

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Post } from '@/services/useSocialFeed';
import { PostCard } from './PostCard';

interface PostViewDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (post: Post) => void;
}

export const PostViewDialog = ({ 
  post, 
  open, 
  onOpenChange,
  onEdit 
}: PostViewDialogProps) => {
  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <VisuallyHidden>
          <DialogTitle>View Post</DialogTitle>
        </VisuallyHidden>
        <div className="p-1">
          <PostCard post={post} onEdit={onEdit} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
