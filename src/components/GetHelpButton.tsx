import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { GetHelpDialog } from './dialogs/GetHelpDialog';

export const GetHelpButton = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setDialogOpen(true)}
          >
            <LifeBuoy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Get Help</p>
        </TooltipContent>
      </Tooltip>

      <GetHelpDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};
