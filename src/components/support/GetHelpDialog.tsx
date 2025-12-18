/**
 * Get Help Dialog for Support Pages
 * Re-exports the existing help dialog for use in support context
 */

import { GetHelpDialog as BaseGetHelpDialog } from '@/components/dialogs/GetHelpDialog';

interface GetHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GetHelpDialog = ({ open, onOpenChange }: GetHelpDialogProps) => {
  return <BaseGetHelpDialog open={open} onOpenChange={onOpenChange} />;
};
