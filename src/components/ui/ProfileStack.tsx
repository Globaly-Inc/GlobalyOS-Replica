/**
 * ProfileStack Component
 * Reusable stacked avatar display with overflow popover and optional profile linking
 * Used for reactions, tagged members, KPI owners, direct reports, etc.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrgLink } from '@/components/OrgLink';
import { cn } from '@/lib/utils';

export interface ProfileStackUser {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ProfileStackProps {
  users: ProfileStackUser[];
  
  // Display options
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  
  // Behavior options
  showPopover?: boolean;
  linkToProfile?: boolean;
  highlightUserId?: string;
  
  // Popover customization
  popoverHeader?: React.ReactNode;
  popoverTitle?: string;
  
  // Mobile behavior
  mobileShowCount?: boolean;
  
  // Styling
  className?: string;
}

const SIZE_CONFIG = {
  xs: {
    avatar: 'h-4 w-4',
    fallbackText: 'text-[6px]',
    border: 'border',
    spacing: '-space-x-1',
    popoverAvatar: 'h-6 w-6',
    popoverFallbackText: 'text-[9px]',
    overflowText: 'text-[10px]',
    overflowSize: 'h-4 w-4',
  },
  sm: {
    avatar: 'h-5 w-5',
    fallbackText: 'text-[8px]',
    border: 'border-2',
    spacing: '-space-x-1.5',
    popoverAvatar: 'h-7 w-7',
    popoverFallbackText: 'text-[10px]',
    overflowText: 'text-xs',
    overflowSize: 'h-5 w-5',
  },
  md: {
    avatar: 'h-6 w-6',
    fallbackText: 'text-xs',
    border: 'border-2',
    spacing: '-space-x-1.5',
    popoverAvatar: 'h-7 w-7',
    popoverFallbackText: 'text-[10px]',
    overflowText: 'text-xs',
    overflowSize: 'h-6 w-6',
  },
  lg: {
    avatar: 'h-8 w-8',
    fallbackText: 'text-xs',
    border: 'border-2',
    spacing: '-space-x-2',
    popoverAvatar: 'h-8 w-8',
    popoverFallbackText: 'text-xs',
    overflowText: 'text-xs',
    overflowSize: 'h-8 w-8',
  },
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function ProfileStack({
  users,
  maxVisible = 5,
  size = 'sm',
  showPopover = true,
  linkToProfile = false,
  highlightUserId,
  popoverHeader,
  popoverTitle,
  mobileShowCount = true,
  className,
}: ProfileStackProps) {
  const config = SIZE_CONFIG[size];
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = users.length - maxVisible;

  if (users.length === 0) {
    return null;
  }

  const renderAvatar = (user: ProfileStackUser, index: number) => {
    const isHighlighted = user.id === highlightUserId;
    
    const avatar = (
      <Avatar
        key={user.id}
        className={cn(
          config.avatar,
          config.border,
          'border-background',
          isHighlighted && 'ring-1 ring-primary'
        )}
        style={{ zIndex: maxVisible - index }}
      >
        <AvatarImage src={user.avatar || undefined} alt={user.name} />
        <AvatarFallback className={cn(config.fallbackText, 'bg-muted')}>
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
    );

    if (linkToProfile) {
      return (
        <OrgLink
          key={user.id}
          to={`/team/${user.id}`}
          className="hover:z-20 transition-transform hover:scale-110"
          style={{ zIndex: maxVisible - index }}
          onClick={(e) => e.stopPropagation()}
        >
          {avatar}
        </OrgLink>
      );
    }

    return avatar;
  };

  const stackContent = (
    <>
      {/* Mobile: Show count only */}
      {mobileShowCount && (
        <span className="md:hidden text-xs font-medium text-muted-foreground">
          +{users.length}
        </span>
      )}
      
      {/* Desktop: Stacked avatars */}
      <div className={cn('hidden md:flex', config.spacing, !mobileShowCount && 'flex')}>
        {visibleUsers.map((user, index) => renderAvatar(user, index))}
      </div>
      
      {/* Desktop: Overflow indicator */}
      {overflowCount > 0 && (
        <span className={cn(
          'hidden md:inline font-medium text-muted-foreground ml-0.5',
          config.overflowText
        )}>
          +{overflowCount}
        </span>
      )}
    </>
  );

  const popoverContent = (
    <PopoverContent className="w-56 p-3" align="start">
      {/* Header */}
      <div className="text-sm font-medium mb-2 flex items-center gap-2 pb-2 border-b border-border">
        {popoverHeader}
        <span className="text-muted-foreground">
          {popoverTitle || `${users.length} member${users.length !== 1 ? 's' : ''}`}
        </span>
      </div>
      
      {/* User list */}
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-0.5 pr-3">
          {users.map(user => {
            const isCurrentUser = user.id === highlightUserId;
            const content = (
              <div className="flex items-center gap-2.5 py-1.5 px-1.5 rounded-md hover:bg-muted/80 transition-colors">
                <Avatar className={config.popoverAvatar}>
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className={cn(config.popoverFallbackText, 'bg-muted')}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate flex-1">
                  {isCurrentUser ? 'You' : user.name}
                </span>
              </div>
            );

            if (linkToProfile) {
              return (
                <OrgLink
                  key={user.id}
                  to={`/team/${user.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block"
                >
                  {content}
                </OrgLink>
              );
            }

            return <div key={user.id}>{content}</div>;
          })}
        </div>
      </ScrollArea>
    </PopoverContent>
  );

  if (!showPopover) {
    return (
      <div className={cn('flex items-center', className)}>
        <div className={cn('flex', config.spacing)}>
          {visibleUsers.map((user, index) => renderAvatar(user, index))}
        </div>
        {overflowCount > 0 && (
          <div className={cn(
            'rounded-full bg-muted flex items-center justify-center ml-0.5',
            config.border,
            config.overflowSize,
            'border-background'
          )}>
            <span className={cn('font-medium text-muted-foreground', config.overflowText)}>
              +{overflowCount}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('flex items-center gap-0.5 cursor-pointer', className)}
          onClick={(e) => e.stopPropagation()}
        >
          {stackContent}
        </button>
      </PopoverTrigger>
      {popoverContent}
    </Popover>
  );
}

export default ProfileStack;
