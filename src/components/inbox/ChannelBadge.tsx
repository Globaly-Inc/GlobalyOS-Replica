import { MessageCircle, Hash, Send, Instagram, Music, Mail, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboxChannelType } from '@/types/inbox';
import { CHANNEL_META } from '@/types/inbox';

interface ChannelBadgeProps {
  channel: InboxChannelType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const channelIcons: Record<InboxChannelType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  whatsapp: MessageCircle,
  telegram: Send,
  messenger: MessageCircle,
  instagram: Instagram,
  tiktok: Music,
  email: Mail,
  sms: Smartphone,
};

export const ChannelBadge = ({ channel, size = 'sm', showLabel = false, className }: ChannelBadgeProps) => {
  const Icon = channelIcons[channel];
  const meta = CHANNEL_META[channel];
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn('rounded-full flex items-center justify-center', {
          'p-0': size === 'xs',
          'p-0.5': size === 'sm',
          'p-1': size === 'md',
          'p-1.5': size === 'lg',
        })}
        style={{ backgroundColor: `${meta.color}20` }}
      >
        <Icon className={sizeClasses[size]} style={{ color: meta.color }} />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
      )}
    </div>
  );
};
