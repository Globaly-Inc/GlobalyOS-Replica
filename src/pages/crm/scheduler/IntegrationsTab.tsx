import { Calendar, Chrome, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IntegrationsTab() {
  return (
    <div className="space-y-4 max-w-2xl">
      {/* Google Calendar integration card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Google Calendar</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sync your availability and auto-create Google Meet links
                </p>
              </div>
              <Button variant="outline" disabled className="text-sm">
                Coming Soon
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-yellow-500" />
                Real-time availability sync across all your calendars
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Chrome className="h-4 w-4 text-blue-500" />
                Auto-generate Google Meet links for every booking
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                Add booked events directly to your Google Calendar
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Availability note */}
      <div className="bg-muted/40 border border-border rounded-xl p-5">
        <h4 className="font-medium text-foreground mb-1 text-sm">How availability works in Phase 1</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Until Google Calendar integration is available, your availability is driven by the working hours
          you configure per event type. Set your working hours, buffer times, and minimum notice in the
          event type settings — the booking page will only show slots within those windows, automatically
          excluding already-booked times.
        </p>
      </div>
    </div>
  );
}
