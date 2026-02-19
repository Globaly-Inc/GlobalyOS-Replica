import { useState } from 'react';
import { Calendar, Chrome, Zap, Mail, CheckCircle, XCircle, Info, Settings, Loader2, ExternalLink, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useIntegrationSettings, useUpdateIntegrationSettings } from '@/services/useScheduler';
import { useGoogleCalendarConnect, useGoogleCalendarDisconnect } from '@/services/useGoogleCalendar';

export function IntegrationsTab() {
  const [calendarInfoOpen, setCalendarInfoOpen] = useState(false);
  const { data: settings, isLoading } = useIntegrationSettings();
  const updateSettings = useUpdateIntegrationSettings();
  const connectGoogle = useGoogleCalendarConnect();
  const disconnectGoogle = useGoogleCalendarDisconnect();

  const isGoogleMeetEnabled = settings?.is_google_meet_enabled ?? false;
  const isGoogleConnected = settings?.google_calendar_connected ?? false;
  const googleEmail = (settings as any)?.google_email ?? null;

  const handleToggleGoogleMeet = (value: boolean) => {
    updateSettings.mutate({ is_google_meet_enabled: value });
  };

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Email Notifications */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 shrink-0">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-foreground">Email Notifications</h3>
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                <CheckCircle className="h-4 w-4" />
                Active
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Confirmation and reminder emails are sent automatically to both the invitee and host for every booking.
            </p>
            <div className="space-y-2">
              {[
                '✓ Booking confirmation sent to invitee',
                '✓ Host notification on new booking',
                '✓ Cancellation notifications',
                '✓ Reschedule notifications',
              ].map(item => (
                <div key={item} className="text-sm text-muted-foreground">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 shrink-0">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Google Calendar</h3>
              </div>
              {isGoogleConnected ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Connected{googleEmail ? ` · ${googleEmail}` : ''}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                  Not connected
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isGoogleConnected
                ? 'Your Google Calendar is synced. Availability is checked in real time and events are created for every booking.'
                : 'Connect your Google Calendar to automatically sync availability and create Google Meet links for every booking.'}
            </p>

            <div className="flex items-center gap-2 mb-4">
              {isGoogleConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => disconnectGoogle.mutate()}
                  disabled={disconnectGoogle.isPending}
                >
                  {disconnectGoogle.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => connectGoogle.mutate()}
                  disabled={connectGoogle.isPending}
                >
                  {connectGoogle.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Connect Google Calendar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setCalendarInfoOpen(true)}
              >
                <Info className="h-4 w-4" />
                Learn more
              </Button>
            </div>

            <div className="space-y-2 pl-0.5">
              {[
                { icon: Zap, color: 'text-amber-500', text: 'Real-time availability sync across all your calendars' },
                { icon: Chrome, color: 'text-blue-500', text: 'Auto-generate Google Meet links for every booking' },
                { icon: Calendar, color: 'text-primary', text: 'Add booked events directly to your Google Calendar' },
              ].map(({ icon: Icon, color, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className={`h-4 w-4 ${color} shrink-0`} />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Preferences */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-muted">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Booking Preferences</h3>
            <p className="text-xs text-muted-foreground">Stored per user</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isGoogleMeetEnabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
            <div className="flex-1">
              <Label htmlFor="gmeet-toggle" className="font-medium text-foreground cursor-pointer">
                Auto-create Google Meet links
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isGoogleConnected
                  ? (isGoogleMeetEnabled
                    ? 'A unique Google Meet link will be added to every booking'
                    : 'Enable to automatically add Google Meet links to bookings')
                  : 'Connect Google Calendar first to use this feature'}
              </p>
            </div>
            <Switch
              id="gmeet-toggle"
              checked={isGoogleMeetEnabled}
              onCheckedChange={handleToggleGoogleMeet}
              disabled={updateSettings.isPending || isLoading || !isGoogleConnected}
            />
          </div>
        </div>
      </div>

      {/* Availability note */}
      <div className="bg-muted/40 border border-border rounded-xl p-5">
        <h4 className="font-medium text-foreground mb-1 text-sm">How availability works</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isGoogleConnected
            ? 'Your availability combines your working hours configuration with real-time Google Calendar data. Slots that conflict with existing calendar events are automatically hidden.'
            : 'Your availability is driven by the working hours you configure per event type. Connect Google Calendar above to also block out times from your personal calendar.'}
        </p>
      </div>

      {/* Google Calendar Info Modal */}
      <Dialog open={calendarInfoOpen} onOpenChange={setCalendarInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Calendar Integration
            </DialogTitle>
            <DialogDescription>
              How Google Calendar sync works
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              {[
                { icon: '📅', title: 'Live availability sync', desc: 'Your Google Calendar events are checked in real time, so invitees only see truly open slots.' },
                { icon: '🔗', title: 'Auto Google Meet links', desc: 'Every new booking automatically gets a unique Google Meet link in the confirmation email.' },
                { icon: '➕', title: 'Calendar events created', desc: 'Bookings are added directly to your Google Calendar so you never miss a meeting.' },
                { icon: '🔄', title: 'Two-way sync', desc: 'Cancellations and reschedules are reflected immediately in your Google Calendar.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <div className="font-medium text-sm text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
