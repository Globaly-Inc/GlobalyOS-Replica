import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function UnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }

    supabase.functions.invoke('campaign-unsubscribe', {
      body: { token },
    }).then(({ data, error }) => {
      if (error || !data?.success) { setStatus('error'); return; }
      setEmail(data.email ?? '');
      setStatus('success');
    });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="p-4 rounded-full bg-muted inline-flex">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>

        {status === 'loading' && (
          <div>
            <h1 className="text-xl font-semibold text-foreground">Processing…</h1>
            <p className="text-sm text-muted-foreground mt-1">Unsubscribing you from this mailing list.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">You're unsubscribed</h1>
            {email && <p className="text-sm text-muted-foreground"><strong>{email}</strong> has been removed from this mailing list.</p>}
            <p className="text-xs text-muted-foreground">You won't receive any more emails from this campaign. If this was a mistake, please contact the sender.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link may be invalid or already used. Please contact the sender directly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
