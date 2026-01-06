/**
 * Role Badge Component
 * Displays a styled, colored badge for user roles
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type UserRole = 'owner' | 'admin' | 'hr' | 'user';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: string; className: string }> = {
  owner: {
    label: 'Owner',
    icon: '👑',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  },
  admin: {
    label: 'Admin',
    icon: '⚙️',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  hr: {
    label: 'HR',
    icon: '📋',
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  },
  user: {
    label: 'Member',
    icon: '👤',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-2.5 py-1',
};

export const RoleBadge = ({ role, size = 'md', className }: RoleBadgeProps) => {
  const config = ROLE_CONFIG[role];
  
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border inline-flex items-center gap-1',
        config.className,
        SIZE_CLASSES[size],
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
  );
};

interface RoleBadgesProps {
  roles: UserRole[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RoleBadges = ({ roles, size = 'md', className }: RoleBadgesProps) => {
  const validRoles = roles.filter(role => ROLE_CONFIG[role]);
  
  if (validRoles.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {validRoles.map(role => (
        <RoleBadge key={role} role={role} size={size} />
      ))}
    </div>
  );
};

// Export config for use in markdown parsing
export { ROLE_CONFIG };
