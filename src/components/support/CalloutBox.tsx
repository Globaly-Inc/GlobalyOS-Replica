/**
 * Callout Box Component
 * Styled callout for tips, warnings, notes, and prerequisites
 */

import { AlertCircle, Lightbulb, Info, CheckSquare, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export type CalloutType = 'tip' | 'warning' | 'note' | 'prerequisites' | 'important';

interface CalloutBoxProps {
  type: CalloutType;
  title?: string;
  children: ReactNode;
  className?: string;
}

const CALLOUT_CONFIG: Record<CalloutType, { 
  icon: typeof Lightbulb; 
  title: string; 
  className: string;
  iconClassName: string;
}> = {
  tip: {
    icon: Lightbulb,
    title: 'Pro Tip',
    className: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    iconClassName: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    title: 'Warning',
    className: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    iconClassName: 'text-amber-600 dark:text-amber-400',
  },
  note: {
    icon: Info,
    title: 'Note',
    className: 'bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-700',
    iconClassName: 'text-slate-600 dark:text-slate-400',
  },
  prerequisites: {
    icon: CheckSquare,
    title: 'Prerequisites',
    className: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
    iconClassName: 'text-purple-600 dark:text-purple-400',
  },
  important: {
    icon: AlertCircle,
    title: 'Important',
    className: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
    iconClassName: 'text-rose-600 dark:text-rose-400',
  },
};

export const CalloutBox = ({ type, title, children, className }: CalloutBoxProps) => {
  const config = CALLOUT_CONFIG[type];
  
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Card className={cn(
      'p-4 my-4 border-l-4',
      config.className,
      className
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconClassName)} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">
            {title || config.title}
          </h4>
          <div className="text-sm text-muted-foreground prose-sm [&>ul]:mt-1 [&>ul]:mb-0 [&>ul]:pl-4 [&>li]:my-0.5">
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Export config for markdown parsing
export { CALLOUT_CONFIG };
