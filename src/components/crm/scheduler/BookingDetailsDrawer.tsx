import { format } from 'date-fns';
import { X, Clock, MapPin, User, Mail, Calendar, CheckCircle, XCircle, AlertCircle, Video, Phone, Building, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useUpdateBookingStatus } from '@/services/useScheduler';
import type { SchedulerBookingRow } from '@/types/scheduler';
import { OrgLink } from '@/components/OrgLink';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  no_show: { label: 'No Show', className: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  canceled: { label: 'Canceled', className: 'bg-red-100 text-red-700', icon: XCircle },
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
  booking: SchedulerBookingRow | null;
  onClose: () => void;
}

export function BookingDetailsDrawer({ booking, onClose }: Props) {
  const updateStatus = useUpdateBookingStatus();

  if (!booking) return null;

  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = statusConfig.icon;
  const eventType = booking.event_type as any;
  const host = booking.host_employee as any;
  const locType = (eventType?.location_type || 'google_meet') as keyof typeof LOCATION_ICON;
  const LocIcon = LOCATION_ICON[locType] || Video;
  const locLabel = LOCATION_LABEL[locType] || locType;

  const startDate = new Date(booking.start_at_utc);
  const endDate = new Date(booking.end_at_utc);
  const isPast = startDate < new Date();
  const isUpcoming = booking.status === 'scheduled' && !isPast;

  return (
    <Sheet open={!!booking} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">Booking Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.className}`}>
              <StatusIcon className="h-4 w-4" />
              {statusConfig.label}
            </span>
            {eventType?.name && (
              <Badge variant="outline">{eventType.name}</Badge>
            )}
          </div>

          {/* Date & Time */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(startDate, 'h:mm a')} – {format(endDate, 'h:mm a')} ({booking.invitee_timezone})
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground">{eventType?.duration_minutes || 30} minutes</span>
            </div>
            <div className="flex items-center gap-3">
              <LocIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground">{locLabel}</span>
            </div>
          </div>

          <Separator />

          {/* Invitee */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Invitee</h4>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">{booking.invitee_name}</div>
                <a href={`mailto:${booking.invitee_email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {booking.invitee_email}
                </a>
              </div>
            </div>
            {booking.invitee_contact_id && (
              <OrgLink to={`/crm/contacts/${booking.invitee_contact_id}`} className="text-xs text-primary hover:underline ml-12">
                View CRM contact →
              </OrgLink>
            )}
          </div>

          {/* Host */}
          {host && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Host</h4>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="font-medium text-foreground">
                    {host.first_name} {host.last_name}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Custom answers */}
          {booking.answers_json && Object.keys(booking.answers_json).length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Invitee Answers</h4>
                {Object.entries(booking.answers_json).map(([q, a]) => (
                  <div key={q}>
                    <div className="text-xs text-muted-foreground">{q}</div>
                    <div className="text-sm text-foreground">{a as string}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          {isUpcoming && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Actions</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { updateStatus.mutate({ id: booking.id, status: 'completed' }); onClose(); }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />
                    Mark Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => { updateStatus.mutate({ id: booking.id, status: 'canceled' }); onClose(); }}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Cancel
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => { updateStatus.mutate({ id: booking.id, status: 'no_show' }); onClose(); }}
                >
                  <AlertCircle className="h-4 w-4 mr-1.5 text-yellow-600" />
                  Mark No Show
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
