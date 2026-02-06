import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Home } from 'lucide-react';

interface CheckInMethodChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (method: 'qr' | 'remote') => void;
}

export const CheckInMethodChooser = ({ open, onOpenChange, onChoose }: CheckInMethodChooserProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose Check-In Method</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-24"
            onClick={() => { onChoose('qr'); onOpenChange(false); }}
          >
            <Camera className="h-6 w-6" />
            <span className="text-sm font-medium">QR Code</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-24"
            onClick={() => { onChoose('remote'); onOpenChange(false); }}
          >
            <Home className="h-6 w-6" />
            <span className="text-sm font-medium">Remote</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
