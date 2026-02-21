import { useState, useEffect, useCallback } from 'react';
import { usePortalApi } from '@/hooks/usePortalApi';
import { Bell, MessageSquare, FolderOpen, FileText, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  message: MessageSquare,
  status_change: FolderOpen,
  task: CheckCircle,
  document: FileText,
  system: Info,
};

export const PortalNotifications = () => {
  const { portalFetch } = usePortalApi();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await portalFetch('notifications');
      setNotifications(result.notifications || []);
    } catch {}
  }, [portalFetch]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const handleMarkRead = async (notificationId?: string) => {
    try {
      await portalFetch('mark-notification-read', undefined, {
        notificationId: notificationId || undefined,
      });
      setNotifications(prev =>
        notificationId
          ? prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
          : prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch {}
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => handleMarkRead()}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.slice(0, 20).map(n => {
                const Icon = typeIcons[n.type] || Info;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.read_at) handleMarkRead(n.id);
                      if (n.link) window.location.href = n.link;
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3',
                      !n.read_at && 'bg-primary/5'
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !n.read_at ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(n.created_at)}</p>
                    </div>
                    {!n.read_at && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
