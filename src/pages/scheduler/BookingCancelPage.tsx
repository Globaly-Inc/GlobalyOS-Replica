import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function BookingCancelPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'confirm' | 'canceled' | 'error'>('confirm');
  const [booking, setBooking] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [canceling, setCanceling] = useState(false);

  const handleCancel = async () => {
    if (!token) return;
    setCanceling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-scheduler-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token, action: 'cancel' }),
      });
      const data = await res.json();
      if (data.error) { setErrorMsg(data.error); setStatus('error'); return; }
      setBooking(data.booking);
      setStatus('canceled');
    } catch {
      setErrorMsg('Failed to cancel booking. Please try again.');
      setStatus('error');
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        {status === 'confirm' && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-5">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Cancel your meeting?</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to cancel this meeting? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.history.back()}
              >
                Keep Meeting
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancel}
                disabled={canceling}
              >
                {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Meeting'}
              </Button>
            </div>
          </>
        )}

        {status === 'canceled' && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-5">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Meeting Cancelled</h1>
            <p className="text-sm text-muted-foreground">
              Your meeting has been successfully cancelled. The host has been notified.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
}
