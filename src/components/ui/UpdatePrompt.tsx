import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpdatePromptProps {
  onUpdate: () => void;
  isUpdating?: boolean;
}

export const UpdatePrompt = ({ onUpdate, isUpdating }: UpdatePromptProps) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg">
        <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">
          {isUpdating ? 'Updating...' : 'A new version is available'}
        </span>
        {!isUpdating && (
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={onUpdate}
            className="h-7 px-3 text-xs"
          >
            Update Now
          </Button>
        )}
      </div>
    </div>
  );
};
