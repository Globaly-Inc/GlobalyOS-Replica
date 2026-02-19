import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Video, Phone, Building, Globe, User, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PublicEventType } from '@/types/scheduler';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const TIMEZONES = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo', 'America/Buenos_Aires',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Moscow', 'Europe/Istanbul', 'Europe/Stockholm',
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Pacific/Auckland',
];

const LOCATION_ICON = {
  google_meet: Video,
  phone: Phone,
  in_person: Building,
  custom: Globe,
};

const LOCATION_LABEL = {
  google_meet: 'Google Meet',
  phone: 'Phone Call',
  in_person: 'In Person',
  custom: 'Custom',
};

export default function BookingReschedulePage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [eventType, setEventType] = useState<PublicEventType | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [eventSlug, setEventSlug] = useState('');

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduled, setRescheduled] = useState(false);
  const [newBookingData, setNewBookingData] = useState<any>(null);

  // Fetch booking info by token
  useEffect(() => {
    if (!token) return;
    setLoading(true);

    // We call get-scheduler-slots with the token to fetch booking + event type info
    fetch(`${SUPABASE_URL}/functions/v1/cancel-scheduler-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token, preview_only: true }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error && !data.booking) {
          setError(data.error);
          return;
        }
        if (data.booking) {
          setBooking(data.booking);
          setEventType(data.event_type);
          setOrgName(data.org_name || '');
          setOrgCode(data.org_slug || '');
          setEventSlug(data.event_type?.slug || '');
        }
      })
      .catch(() => setError('Failed to load booking details'))
      .finally(() => setLoading(false));
  }, [token]);

  // Fetch slots
  const fetchSlots = useCallback(async (date: Date) => {
    if (!orgCode || !eventSlug) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const url = `${SUPABASE_URL}/functions/v1/get-scheduler-slots?orgCode=${orgCode}&slug=${eventSlug}&date=${dateStr}&timezone=${encodeURIComponent(timezone)}`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY } });
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [orgCode, eventSlug, timezone]);

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  const handleReschedule = async () => {
    if (!selectedSlot || !token) return;
    setRescheduling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/reschedule-scheduler-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token, new_start_at_utc: selectedSlot }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setNewBookingData(data);
      setRescheduled(true);
    } catch {
      toast.error('Failed to reschedule. Please try again.');
    } finally {
      setRescheduling(false);
    }
  };

  const today = startOfDay(new Date());
  const maxDate = eventType
    ? addDays(today, eventType.config_json?.availability?.max_days_in_advance || 60)
    : addDays(today, 60);

  const isDayAvailable = (date: Date) => {
    if (isPast(startOfDay(date)) && !isToday(date)) return false;
    if (date > maxDate) return false;
    if (!eventType) return false;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    const av = eventType.config_json?.availability?.[dayName as keyof typeof eventType.config_json.availability];
    return (av as any)?.enabled === true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !booking || !eventType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-5">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Booking not found</h1>
          <p className="text-sm text-muted-foreground">
            {error || 'This booking could not be found or has already been cancelled.'}
          </p>
        </div>
      </div>
    );
  }

  if (rescheduled && newBookingData) {
    const newStart = new Date(newBookingData.booking.start_at_utc);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-5">
            <RefreshCw className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Rescheduled!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            A confirmation email has been sent to {booking.invitee_email}
          </p>
          <div className="bg-muted/40 rounded-xl p-4 text-left mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium text-foreground">{format(newStart, 'EEEE, MMMM d, yyyy')}</div>
                <div className="text-muted-foreground">{format(newStart, 'h:mm a')} ({timezone})</div>
              </div>
            </div>
          </div>
          <a href={newBookingData.cancel_link} className="text-sm text-muted-foreground hover:text-foreground underline">
            Cancel this meeting
          </a>
        </div>
      </div>
    );
  }

  const LocIcon = LOCATION_ICON[eventType.location_type as keyof typeof LOCATION_ICON] || Video;
  const locLabel = LOCATION_LABEL[eventType.location_type as keyof typeof LOCATION_LABEL] || eventType.location_type;
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Reschedule Meeting</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Choose a new time for your <strong>{eventType.name}</strong> with {orgName}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left panel */}
            <div className="md:w-64 md:border-r border-border p-6 space-y-4 bg-muted/20">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Rescheduling</p>
                <h2 className="font-semibold text-foreground">{eventType.name}</h2>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {eventType.duration_minutes} min
                </div>
                <div className="flex items-center gap-2">
                  <LocIcon className="h-4 w-4" />
                  {locLabel}
                </div>
              </div>
              {/* Current time */}
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Current time</p>
                <p className="text-sm text-foreground line-through opacity-60">
                  {format(new Date(booking.start_at_utc), 'MMM d, h:mm a')}
                </p>
              </div>
              {/* New time preview */}
              {selectedSlot && (
                <div className="pt-2">
                  <p className="text-xs text-primary font-medium mb-1">New time</p>
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(selectedSlot), 'MMM d, h:mm a')}
                  </p>
                  <p className="text-xs text-muted-foreground">({timezone})</p>
                </div>
              )}
            </div>

            {/* Right panel — calendar */}
            <div className="flex-1 p-6">
              {/* Timezone selector */}
              <div className="flex items-center justify-end gap-2 mb-4">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-52 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz} className="text-xs">{tz.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Calendar */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(m => { const p = new Date(m); p.setMonth(p.getMonth() - 1); return p; })}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</span>
                <button
                  onClick={() => setCurrentMonth(m => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n; })}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
                {calendarDays.map(day => {
                  const available = isDayAvailable(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={day.toISOString()}
                      disabled={!available}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                        !available && 'text-muted-foreground/40 cursor-not-allowed',
                        available && !isSelected && 'hover:bg-primary/10 text-foreground cursor-pointer',
                        isSelected && 'bg-primary text-primary-foreground',
                        isToday(day) && !isSelected && 'font-bold text-primary'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="mt-6">
                  <h3 className="font-medium text-foreground mb-3 text-sm">{format(selectedDate, 'EEEE, MMMM d')}</h3>
                  {slotsLoading ? (
                    <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No available slots for this day.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            'px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors',
                            selectedSlot === slot
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                          )}
                        >
                          {format(new Date(slot), 'h:mm a')}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedSlot && (
                    <Button
                      className="mt-4 w-full gap-2"
                      onClick={handleReschedule}
                      disabled={rescheduling}
                    >
                      <RefreshCw className="h-4 w-4" />
                      {rescheduling ? 'Rescheduling...' : `Confirm Reschedule`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <a href="https://globalyos.com" className="hover:underline" target="_blank" rel="noopener noreferrer">GlobalyOS Scheduler</a>
        </p>
      </div>
    </div>
  );
}
