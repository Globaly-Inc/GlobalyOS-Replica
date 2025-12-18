/**
 * Get Help Dialog for Support Pages
 * Re-exports the existing help dialog for use in support context
 */

import { GetHelpDialog as BaseGetHelpDialog } from '@/components/dialogs/GetHelpDialog';
import { SupportRequestType } from '@/types/support';

interface GetHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: SupportRequestType;
}

export const GetHelpDialog = ({ open, onOpenChange, defaultType }: GetHelpDialogProps) => {
  return <BaseGetHelpDialog open={open} onOpenChange={onOpenChange} defaultType={defaultType} />;
};
