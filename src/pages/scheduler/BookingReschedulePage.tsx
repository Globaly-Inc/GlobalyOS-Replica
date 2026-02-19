import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BookingReschedulePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // Phase 1: Rescheduling requires showing the booking page again.
  // The full flow can be implemented in Phase 2 with pre-filled invitee data.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
          <RefreshCw className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Reschedule Meeting</h1>
        <p className="text-sm text-muted-foreground mb-6">
          To reschedule, please cancel this meeting and book a new time using the booking link provided by your host.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
          <a
            href={`/s/${token?.split('/')[0] || ''}`}
            className="flex-1"
          >
            <Button className="w-full">Book New Time</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
