import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin, Video, Phone, Building, Globe, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PublicEventType, TimeSlot, CustomQuestion } from '@/types/scheduler';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

// Common timezones
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland',
];

type BookingStep = 'time' | 'details' | 'confirmed';

interface ConfirmedData {
  invitee_name: string;
  invitee_email: string;
  start_at_utc: string;
  event_name: string;
  host_name: string | null;
  org_name: string;
  duration_minutes: number;
  location_type: string;
  cancel_link: string;
  reschedule_link: string;
}

export default function PublicBookingPage() {
  const { orgCode, eventSlug } = useParams<{ orgCode: string; eventSlug: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<BookingStep>('time');
  const [eventType, setEventType] = useState<PublicEventType | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  // Form state
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedData | null>(null);

  // Fetch event type on mount
  useEffect(() => {
    if (!orgCode || !eventSlug) return;
    setLoading(true);
    const url = `${SUPABASE_URL}/functions/v1/get-scheduler-slots?orgCode=${orgCode}&slug=${eventSlug}&date=${format(new Date(), 'yyyy-MM-dd')}&timezone=${encodeURIComponent(timezone)}`;
    fetch(url, { headers: { apikey: SUPABASE_ANON_KEY } })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setEventType(data.event_type);
        setOrgName(data.org_name);
      })
      .catch(() => setError('Failed to load event details'))
      .finally(() => setLoading(false));
  }, [orgCode, eventSlug, timezone]);

  // Fetch slots when date selected
  const fetchSlots = useCallback(async (date: Date) => {
    if (!orgCode || !eventSlug) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
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

  const handleSelectSlot = (slot: string) => {
    setSelectedSlot(slot);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !inviteeName.trim() || !inviteeEmail.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-scheduler-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          org_code: orgCode,
          event_type_slug: eventSlug,
          invitee_name: inviteeName,
          invitee_email: inviteeEmail,
          invitee_timezone: timezone,
          start_at_utc: selectedSlot,
          answers_json: customAnswers,
        }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setConfirmed({
        invitee_name: data.booking.invitee_name,
        invitee_email: data.booking.invitee_email,
        start_at_utc: data.booking.start_at_utc,
        event_name: data.event_type.name,
        host_name: data.host?.name || null,
        org_name: data.org_name,
        duration_minutes: data.event_type.duration_minutes,
        location_type: data.event_type.location_type,
        cancel_link: data.cancel_link,
        reschedule_link: data.reschedule_link,
      });
      setStep('confirmed');
    } catch {
      alert('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Build calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay(); // 0 = Sunday

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

  if (error || !eventType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Event not found</h1>
          <p className="text-muted-foreground">{error || 'This booking page is not available.'}</p>
        </div>
      </div>
    );
  }

  const LocIcon = LOCATION_ICON[eventType.location_type] || Video;
  const locLabel = LOCATION_LABEL[eventType.location_type] || eventType.location_type;
  const primaryHost = eventType.hosts?.[0];

  // Confirmed page
  if (step === 'confirmed' && confirmed) {
    const startDate = new Date(confirmed.start_at_utc);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-5">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">You're scheduled!</h1>
          <p className="text-muted-foreground text-sm mb-6">
            A confirmation email has been sent to {confirmed.invitee_email}
          </p>

          <div className="bg-muted/40 rounded-xl p-5 text-left space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="text-muted-foreground">
                  {format(startDate, 'h:mm a')} ({timezone}) · {confirmed.duration_minutes} min
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <LocIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground">{LOCATION_LABEL[confirmed.location_type as keyof typeof LOCATION_LABEL] || confirmed.location_type}</span>
            </div>
            {confirmed.host_name && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">{confirmed.host_name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <a
              href={confirmed.reschedule_link}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Reschedule
            </a>
            <a
              href={confirmed.cancel_link}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 py-8">
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left panel — event info */}
            <div className="md:w-72 md:border-r border-border p-6 space-y-4 bg-muted/20">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{orgName}</p>
                <h1 className="text-xl font-bold text-foreground mt-1">{eventType.name}</h1>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>{eventType.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LocIcon className="h-4 w-4 flex-shrink-0" />
                  <span>{locLabel}</span>
                </div>
                {primaryHost && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span>{primaryHost.first_name} {primaryHost.last_name}</span>
                  </div>
                )}
              </div>

              {eventType.description && (
                <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                  {eventType.description}
                </p>
              )}

              {/* Selected time (when on details step) */}
              {step === 'details' && selectedSlot && (
                <div className="bg-primary/10 rounded-lg p-3 border-t border-border mt-4">
                  <div className="text-xs text-primary font-medium mb-1">Selected Time</div>
                  <div className="text-sm font-semibold text-foreground">
                    {format(new Date(selectedSlot), 'EEEE, MMM d')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selectedSlot), 'h:mm a')} ({timezone})
                  </div>
                  <button
                    className="text-xs text-primary mt-2 hover:underline"
                    onClick={() => setStep('time')}
                  >
                    Change time
                  </button>
                </div>
              )}
            </div>

            {/* Right panel — calendar / form */}
            <div className="flex-1 p-6">
              {step === 'time' && (
                <div>
                  {/* Timezone selector */}
                  <div className="flex items-center justify-end gap-2 mb-4">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="w-52 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz} value={tz} className="text-xs">{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Calendar */}
                  <div>
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCurrentMonth(m => {
                          const prev = new Date(m);
                          prev.setMonth(prev.getMonth() - 1);
                          return prev;
                        })}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-foreground">
                        {format(currentMonth, 'MMMM yyyy')}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(m => {
                          const next = new Date(m);
                          next.setMonth(next.getMonth() + 1);
                          return next;
                        })}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for start offset */}
                      {Array.from({ length: startDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {calendarDays.map(day => {
                        const available = isDayAvailable(day);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        return (
                          <button
                            key={day.toISOString()}
                            disabled={!available}
                            onClick={() => { setSelectedDate(day); }}
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
                  </div>

                  {/* Time slots */}
                  {selectedDate && (
                    <div className="mt-6">
                      <h3 className="font-medium text-foreground mb-3 text-sm">
                        {format(selectedDate, 'EEEE, MMMM d')}
                      </h3>
                      {slotsLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No available slots for this day.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {slots.map(slot => (
                            <button
                              key={slot}
                              onClick={() => handleSelectSlot(slot)}
                              className="px-3 py-2.5 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              {format(new Date(slot), 'h:mm a')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 'details' && (
                <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
                  <h2 className="font-semibold text-foreground text-lg">Enter your details</h2>

                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input
                      required
                      value={inviteeName}
                      onChange={e => setInviteeName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      required
                      value={inviteeEmail}
                      onChange={e => setInviteeEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  {/* Custom questions */}
                  {(eventType.config_json?.questions || []).map((q: CustomQuestion) => (
                    <div key={q.id} className="space-y-1.5">
                      <Label>{q.label}{q.required && ' *'}</Label>
                      {q.type === 'textarea' ? (
                        <Textarea
                          required={q.required}
                          value={customAnswers[q.label] || ''}
                          onChange={e => setCustomAnswers(a => ({ ...a, [q.label]: e.target.value }))}
                          rows={3}
                        />
                      ) : (
                        <Input
                          required={q.required}
                          value={customAnswers[q.label] || ''}
                          onChange={e => setCustomAnswers(a => ({ ...a, [q.label]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Scheduling...' : 'Schedule Event'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <a href="https://globalyos.com" className="hover:underline">GlobalyOS Scheduler</a>
        </p>
      </div>
    </div>
  );
}
