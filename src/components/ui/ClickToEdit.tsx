/**
 * Clickable Edit Wrapper
 * Makes content clickable to trigger an edit action
 * Shows subtle hover effect and pencil icon overlay
 */

import { ReactNode, useState } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClickToEditProps {
  children: ReactNode;
  canEdit: boolean;
  onEdit: () => void;
  className?: string;
  iconSize?: 'sm' | 'md';
  showIcon?: boolean;
}

export const ClickToEdit = ({
  children,
  canEdit,
  onEdit,
  className,
  iconSize = 'sm',
  showIcon = false,
}: ClickToEditProps) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!canEdit) {
    return <>{children}</>;
  }

  return (
    <button
      type="button"
      className={cn(
        'group/edit relative inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-all cursor-pointer',
        'hover:bg-muted/50',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {showIcon && (
        <Pencil 
          className={cn(
            'text-muted-foreground transition-opacity shrink-0',
            iconSize === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
            isHovered ? 'opacity-100' : 'opacity-0'
          )} 
        />
      )}
    </button>
  );
};
