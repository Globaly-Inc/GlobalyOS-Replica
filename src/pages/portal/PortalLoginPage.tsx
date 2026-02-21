import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

const RESEND_COOLDOWN_SECONDS = 60;

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
  const [cooldown, setCooldown] = useState(0);
  const submittingRef = useRef(false);

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

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendOtp = useCallback(async () => {
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
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success('Verification code sent to your email');
    } catch {
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  }, [email, orgCode, supabaseUrl]);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp();
  };

  const handleVerifyOTP = useCallback(async (code: string) => {
    if (code.length !== 6 || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/portal-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgSlug: orgCode, email: email.trim(), code }),
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
      submittingRef.current = false;
    }
  }, [email, orgCode, supabaseUrl, setSession, navigate]);

  useEffect(() => {
    if (otp.length === 6) handleVerifyOTP(otp);
  }, [otp, handleVerifyOTP]);

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
                onClick={sendOtp}
                disabled={loading || cooldown > 0}
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalLoginPage;
