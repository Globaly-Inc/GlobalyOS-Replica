import { useState } from 'react';
import { Copy, ExternalLink, MoreHorizontal, Pencil, Power, Trash2, Users, UserCheck, Users2, Shuffle, Clock, MapPin, Video, Phone, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSchedulerEventTypes, useToggleEventTypeActive, useDeleteEventType } from '@/services/useScheduler';
import { useOrganization } from '@/hooks/useOrganization';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { SchedulerEventTypeRow } from '@/types/scheduler';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EVENT_TYPE_ICONS = {
  one_on_one: UserCheck,
  group: Users,
  collective: Users2,
  round_robin: Shuffle,
};

const EVENT_TYPE_LABELS = {
  one_on_one: 'One-on-One',
  group: 'Group',
  collective: 'Collective',
  round_robin: 'Round Robin',
};

const EVENT_TYPE_COLORS = {
  one_on_one: 'bg-blue-100 text-blue-700',
  group: 'bg-green-100 text-green-700',
  collective: 'bg-purple-100 text-purple-700',
  round_robin: 'bg-orange-100 text-orange-700',
};

const LOCATION_ICON = {
  google_meet: Video,
  phone: Phone,
  in_person: Building,
  custom: ExternalLink,
};

const LOCATION_LABEL = {
  google_meet: 'Google Meet',
  phone: 'Phone Call',
  in_person: 'In Person',
  custom: 'Custom',
};

interface Props {
  onEdit: (id: string) => void;
  onNew: () => void;
}

export function EventTypesTab({ onEdit, onNew }: Props) {
  const { data: eventTypes = [], isLoading } = useSchedulerEventTypes();
  const { currentOrg } = useOrganization();
  const { orgCode } = useParams<{ orgCode: string }>();
  const toggleActive = useToggleEventTypeActive();
  const deleteEvent = useDeleteEventType();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const siteUrl = window.location.origin;

  const getBookingLink = (slug: string) =>
    `${siteUrl}/s/${orgCode}/scheduler/${slug}`;

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(getBookingLink(slug));
    toast.success('Booking link copied!');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No event types yet</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          Create your first event type to start accepting bookings from customers and prospects.
        </p>
        <Button onClick={onNew} className="gap-2">
          Create Event Type
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventTypes.map((et) => (
          <EventTypeCard
            key={et.id}
            eventType={et}
            bookingLink={getBookingLink(et.slug)}
            onEdit={() => onEdit(et.id)}
            onCopyLink={() => copyLink(et.slug)}
            onToggleActive={() => toggleActive.mutate({ id: et.id, is_active: !et.is_active })}
            onDelete={() => setDeleteId(et.id)}
          />
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event Type</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this event type and all associated booking history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteEvent.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface CardProps {
  eventType: SchedulerEventTypeRow;
  bookingLink: string;
  onEdit: () => void;
  onCopyLink: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function EventTypeCard({ eventType, bookingLink, onEdit, onCopyLink, onToggleActive, onDelete }: CardProps) {
  const TypeIcon = EVENT_TYPE_ICONS[eventType.type] || UserCheck;
  const LocationIcon = LOCATION_ICON[eventType.location_type] || Video;
  const typeLabel = EVENT_TYPE_LABELS[eventType.type] || eventType.type;
  const typeColor = EVENT_TYPE_COLORS[eventType.type] || 'bg-muted text-muted-foreground';
  const locationLabel = LOCATION_LABEL[eventType.location_type] || eventType.location_type;
  const hosts = eventType.hosts || [];

  return (
    <div className={`relative bg-card border border-border rounded-xl p-5 flex flex-col gap-4 transition-all hover:shadow-md ${!eventType.is_active ? 'opacity-60' : ''}`}>
      {/* Status dot */}
      <div className={`absolute top-4 right-14 w-2 h-2 rounded-full ${eventType.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />

      {/* Menu */}
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyLink}>
              <Copy className="h-4 w-4 mr-2" /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(bookingLink, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" /> Preview page
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleActive}>
              <Power className="h-4 w-4 mr-2" />
              {eventType.is_active ? 'Disable' : 'Enable'}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <TypeIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{eventType.name}</h3>
          {eventType.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{eventType.description}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className={`text-xs px-2 py-0.5 ${typeColor}`}>
          {typeLabel}
        </Badge>
        <Badge variant="outline" className="text-xs px-2 py-0.5 gap-1">
          <Clock className="h-3 w-3" />
          {eventType.duration_minutes} min
        </Badge>
        <Badge variant="outline" className="text-xs px-2 py-0.5 gap-1">
          <LocationIcon className="h-3 w-3" />
          {locationLabel}
        </Badge>
      </div>

      {/* Hosts */}
      {hosts.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            {hosts.slice(0, 2).map(h => (h.employee as any)?.profiles?.full_name || (h.employee as any)?.position || 'Host').join(', ')}
            {hosts.length > 2 && ` +${hosts.length - 2} more`}
          </span>
        </div>
      )}

      {/* Copy link */}
      <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={onCopyLink}>
        <Copy className="h-3.5 w-3.5" />
        Copy booking link
      </Button>
    </div>
  );
}
