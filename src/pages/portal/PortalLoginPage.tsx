import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

const PortalLoginPage = () => {
  const { orgCode } = useParams<{ orgCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, setSession } = usePortalAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<any>({});
  const [portalEnabled, setPortalEnabled] = useState<boolean | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(`/org/${orgCode}/portal/dashboard`, { replace: true });
    }
  }, [isAuthenticated, orgCode, navigate]);

  useEffect(() => {
    const checkPortal = async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/portal-api?action=check-portal&orgSlug=${orgCode}`);
        const data = await res.json();
        setPortalEnabled(data.enabled);
        if (data.branding) setBranding(data.branding);
      } catch {
        setPortalEnabled(false);
      }
    };
    checkPortal();
  }, [orgCode, supabaseUrl]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/portal-send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgSlug: orgCode, email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send code');
        return;
      }
      setStep('otp');
      toast.success('Verification code sent to your email');
    } catch {
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/portal-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgSlug: orgCode, email: email.trim(), code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
        setOtp('');
        return;
      }
      setSession(data.token, data.user);
      toast.success('Welcome back!');
      navigate(`/org/${orgCode}/portal/dashboard`, { replace: true });
    } catch {
      toast.error('Verification failed');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6) handleVerifyOTP();
  }, [otp]);

  if (portalEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!portalEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Portal Not Available</CardTitle>
            <CardDescription>The client portal is not enabled for this organization.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const companyName = branding.company_name || 'Client Portal';

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={companyName} className="h-16 w-16 rounded-2xl mx-auto object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-primary mx-auto flex items-center justify-center">
              <span className="text-primary-foreground text-2xl font-bold">{companyName.charAt(0)}</span>
            </div>
          )}
          <CardTitle className="text-xl">{companyName}</CardTitle>
          <CardDescription>
            {step === 'email' ? 'Sign in to your client portal' : 'Enter the verification code sent to your email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Verification Code
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => { setStep('email'); setOtp(''); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
              <p className="text-sm text-muted-foreground text-center">
                Code sent to <span className="font-medium text-foreground">{email}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={loading}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {loading && (
                <div className="flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={handleSendOTP}
                disabled={loading}
              >
                Resend Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalLoginPage;
