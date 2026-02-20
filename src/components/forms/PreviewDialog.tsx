import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PublicFormRenderer } from './PublicFormRenderer';
import type { FormNode, FormTheme } from '@/types/forms';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: FormNode[];
  theme: FormTheme;
  formName: string;
}

export function PreviewDialog({ open, onOpenChange, nodes, theme, formName }: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Preview</DialogTitle>
        </DialogHeader>
        <PublicFormRenderer nodes={nodes} theme={theme} formName={formName} preview />
      </DialogContent>
    </Dialog>
  );
}
