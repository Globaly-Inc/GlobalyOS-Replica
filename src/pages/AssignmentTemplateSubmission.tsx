/**
 * Public Assignment Submission Page (Template-based)
 * Candidates access this via a per-template public token.
 * Email + OTP verification, then loads the candidate's specific assignment instance.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Lock,
  Mail,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type GateState = 'email_entry' | 'otp_entry' | 'redirecting';

export default function AssignmentTemplateSubmission() {
  const { templateToken, orgCode, assignmentSlug } = useParams<{ templateToken?: string; orgCode?: string; assignmentSlug?: string }>();
  const navigate = useNavigate();

  const [gateState, setGateState] = useState<GateState>('email_entry');
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [gateError, setGateError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendCooldown = () => {
    setResendCooldown(60);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setGateError('Please enter your email address.');
      return;
    }
    setGateError('');
    setIsSendingOtp(true);
    try {
      const body = templateToken
        ? { template_token: templateToken, email: email.trim() }
        : { org_slug: orgCode, assignment_slug: assignmentSlug, email: email.trim() };
      const { data, error } = await supabase.functions.invoke('send-assignment-otp', {
        body,
      });
      if (error) throw error;
      if (data?.notAssigned) {
        setGateError('No assignment found for this email. Please check your email and try again.');
        return;
      }
      if (data?.error) {
        setGateError(data.error);
        return;
      }
      setMaskedEmail(data.maskedEmail || email);
      setGateState('otp_entry');
      startResendCooldown();
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err?.message || '{}');
        if (parsed.notAssigned) {
          setGateError('No assignment found for this email. Please check your email and try again.');
          return;
        }
        setGateError(parsed.error || 'Failed to send verification code.');
      } catch {
        setGateError(err?.message || 'Failed to send verification code.');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setGateError('Please enter the full 6-digit code.');
      return;
    }
    setGateError('');
    setIsVerifyingOtp(true);
    try {
      const verifyBody = templateToken
        ? { template_token: templateToken, email: email.trim(), code: otpValue }
        : { org_slug: orgCode, assignment_slug: assignmentSlug, email: email.trim(), code: otpValue };
      const { data, error } = await supabase.functions.invoke('verify-assignment-otp', {
        body: verifyBody,
      });
      if (error) throw error;
      if (data?.error) {
        setGateError(data.error);
        setOtpValue('');
        return;
      }
      if (data?.verified && data?.instance_token) {
        setGateState('redirecting');
        toast.success('Identity verified! Loading your assignment…');
        // Redirect to the per-instance page which already handles verified state
        navigate(`/assignment/${data.instance_token}`, { replace: true });
      }
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err?.message || '{}');
        setGateError(parsed.error || 'Verification failed. Please try again.');
      } catch {
        setGateError('Verification failed. Please try again.');
      }
      setOtpValue('');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setGateError('');
    setOtpValue('');
    setIsSendingOtp(true);
    try {
      const resendBody = templateToken
        ? { template_token: templateToken, email: email.trim() }
        : { org_slug: orgCode, assignment_slug: assignmentSlug, email: email.trim() };
      const { data, error } = await supabase.functions.invoke('send-assignment-otp', {
        body: resendBody,
      });
      if (error) throw error;
      if (data?.error) {
        setGateError(data.error);
        return;
      }
      toast.success('A new code has been sent to your email.');
      startResendCooldown();
    } catch {
      setGateError('Failed to resend code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  if (gateState === 'redirecting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your assignment…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gateState === 'otp_entry') {
    return (
      <HelmetProvider>
        <Helmet><title>Verify Your Identity</title></Helmet>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Check your email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to <strong>{maskedEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(val) => { setOtpValue(val); setGateError(''); }}
                  disabled={isVerifyingOtp}
                >
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
              {gateError && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{gateError}</p>
                </div>
              )}
              <Button className="w-full" onClick={handleVerifyOtp} disabled={isVerifyingOtp || otpValue.length !== 6}>
                {isVerifyingOtp ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</> : 'Verify Code'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button variant="ghost" size="sm" onClick={() => { setGateState('email_entry'); setGateError(''); setOtpValue(''); }} disabled={isVerifyingOtp} className="gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back
                </Button>
                <Button variant="ghost" size="sm" onClick={handleResendOtp} disabled={isSendingOtp || resendCooldown > 0} className="gap-1 text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get it? Resend"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </HelmetProvider>
    );
  }

  // email_entry state
  return (
    <HelmetProvider>
      <Helmet><title>Assignment Verification</title></Helmet>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verify your identity</CardTitle>
            <CardDescription>
              Enter the email address this assignment was sent to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="candidate-email">Email address</Label>
              <Input
                id="candidate-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                disabled={isSendingOtp}
                autoFocus
              />
            </div>
            {gateError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{gateError}</p>
              </div>
            )}
            <Button className="w-full" onClick={handleSendOtp} disabled={isSendingOtp || !email.trim()}>
              {isSendingOtp ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending code…</> : 'Send Verification Code'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </HelmetProvider>
  );
}
