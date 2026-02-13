import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SupabaseYjsProvider } from './SupabaseYjsProvider';

interface ActiveEditor {
  clientID: number;
  name: string;
  color: string;
}

interface WikiActiveEditorsProps {
  provider: SupabaseYjsProvider | null;
  currentClientId?: number;
}

export const WikiActiveEditors = ({ provider, currentClientId }: WikiActiveEditorsProps) => {
  const [editors, setEditors] = useState<ActiveEditor[]>([]);

  useEffect(() => {
    if (!provider) return;

    const updateEditors = () => {
      const states = provider.awareness.getStates();
      const active: ActiveEditor[] = [];

      states.forEach((state, clientID) => {
        if (clientID === currentClientId) return;
        const user = state.user as { name?: string; color?: string } | undefined;
        if (user?.name) {
          active.push({
            clientID,
            name: user.name,
            color: user.color || '#888',
          });
        }
      });

      setEditors(active);
    };

    // Listen for awareness changes
    provider.awareness.on('change', updateEditors);
    updateEditors();

    return () => {
      provider.awareness.off('change', updateEditors);
    };
  }, [provider, currentClientId]);

  if (editors.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {editors.slice(0, 5).map((editor) => {
          const initials = editor.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <Tooltip key={editor.clientID}>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 border-2 border-background ring-2 ring-transparent hover:ring-primary/20 transition-all cursor-default">
                  <AvatarFallback
                    className="text-[10px] font-medium text-white"
                    style={{ backgroundColor: editor.color }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {editor.name} is editing
              </TooltipContent>
            </Tooltip>
          );
        })}
        {editors.length > 5 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background">
                <AvatarFallback className="text-[10px] font-medium bg-muted text-muted-foreground">
                  +{editors.length - 5}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {editors.slice(5).map((e) => e.name).join(', ')}
            </TooltipContent>
          </Tooltip>
        )}
        <span className="text-xs text-muted-foreground pl-3">
          {editors.length} editing
        </span>
      </div>
    </TooltipProvider>
  );
};
