import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, User, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSchedulerBookings, useUpdateBookingStatus, type BookingStatusFilter } from '@/services/useScheduler';
import { BookingDetailsDrawer } from '@/components/crm/scheduler/BookingDetailsDrawer';
import type { SchedulerBookingRow } from '@/types/scheduler';
import { OrgLink } from '@/components/OrgLink';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  no_show: { label: 'No Show', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  canceled: { label: 'Canceled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function ScheduledEventsTab() {
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<SchedulerBookingRow | null>(null);
  const { data: bookings = [], isLoading } = useSchedulerBookings(statusFilter);

  const filterTabs: { key: BookingStatusFilter; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'canceled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/60 rounded-lg w-fit">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              statusFilter === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-px">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              No {statusFilter} meetings
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Event</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Invitee</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Host</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map(booking => {
                const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.scheduled;
                const StatusIcon = statusConfig.icon;
                const startDate = new Date(booking.start_at_utc);

                return (
                  <tr key={booking.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">
                        {format(startDate, 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(startDate, 'h:mm a')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-foreground">
                        {(booking.event_type as any)?.name || '—'}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {(booking.event_type as any)?.duration_minutes} min
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{booking.invitee_name}</div>
                      <div className="text-xs text-muted-foreground">{booking.invitee_email}</div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {booking.host_employee ? (
                        <span className="text-foreground">
                          {(booking.host_employee as any).first_name} {(booking.host_employee as any).last_name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <BookingDetailsDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
