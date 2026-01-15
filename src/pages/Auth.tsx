import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, AlertCircle, UserX, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import TurnstileWidget from "@/components/TurnstileWidget";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleAuthButton, SecurityBadges } from "@/components/onboarding";
import globalyosIcon from "@/assets/globalyos-icon.png";
const otpEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters")
});
const Auth = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState<boolean | null>(null);

  // Fetch Turnstile site key and auth providers on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [turnstileRes, providersRes] = await Promise.all([supabase.functions.invoke('get-turnstile-config'), supabase.functions.invoke('get-auth-providers')]);
        if (turnstileRes.data?.siteKey) {
          setTurnstileSiteKey(turnstileRes.data.siteKey);
        }
        setGoogleAuthEnabled(providersRes.data?.providers?.google ?? false);
      } catch (error) {
        console.error('Failed to fetch config:', error);
        setGoogleAuthEnabled(false);
      }
    };
    fetchConfig();
  }, []);
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);
  // Check onboarding status and redirect accordingly
  const checkOnboardingAndRedirect = async (userId: string) => {
    try {
      // Get user's organization and onboarding status
      const { data: memberData } = await supabase
        .from('organization_members')
        .select(`
          organization:organizations (
            slug,
            org_onboarding_completed,
            org_onboarding_step
          )
        `)
        .eq('user_id', userId)
        .single();

      const org = memberData?.organization as { 
        slug: string; 
        org_onboarding_completed: boolean; 
        org_onboarding_step: number;
      } | null;
      
      if (org && !org.org_onboarding_completed) {
        // Redirect to onboarding page - will resume from current step
        navigate(`/org/${org.slug}/onboarding`);
      } else if (org) {
        // Onboarding complete - go to dashboard
        navigate(`/org/${org.slug}`);
      } else {
        // No organization - go to landing
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      navigate('/');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({
      data: {
        session
      }
    }) => {
      if (session) {
        await checkOnboardingAndRedirect(session.user.id);
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await checkOnboardingAndRedirect(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  // Helper to parse error from edge function response (handles non-2xx)
  const parseFunctionError = async (response: any): Promise<{ error?: string; data?: any }> => {
    // If we got data directly, use it
    if (response.data) {
      return { data: response.data };
    }
    
    // If there's an error, try to extract the JSON body from the response
    if (response.error) {
      try {
        // The actual response body is in response (the Response object)
        if (response.error.context?.body) {
          const body = JSON.parse(response.error.context.body);
          return { data: body };
        }
      } catch {
        // Fallback to error message
      }
      return { error: response.error.message };
    }
    
    return {};
  };

  const sendOtpRequest = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await supabase.functions.invoke('send-otp', {
      body: {
        email: normalizedEmail
      }
    });
    
    const parsed = await parseFunctionError(response);
    
    if (parsed.data?.error || parsed.error) {
      toast({
        title: "Failed to send OTP",
        description: parsed.data?.error || parsed.error || "Please try again",
        variant: "destructive"
      });
      return false;
    }
    
    toast({
      title: "OTP Sent!",
      description: "Check your email for the 6-digit code."
    });
    return true;
  };
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      const validated = otpEmailSchema.parse({
        email: otpEmail
      });
      setLoading(true);
      const success = await sendOtpRequest(validated.email);
      if (success) {
        setOtpSent(true);
        setResendCooldown(60);
        setFailedAttempts(0);
        setShowCaptcha(false);
        setTurnstileToken(null);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({
          otpEmail: error.errors[0]?.message || "Invalid email"
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    const success = await sendOtpRequest(otpEmail);
    if (success) {
      setResendCooldown(60);
      setOtpCode("");
      setFailedAttempts(0);
      setShowCaptcha(false);
      setTurnstileToken(null);
    }
    setLoading(false);
  };
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrors({
        otpCode: "Please enter the 6-digit code"
      });
      return;
    }

    // Check if CAPTCHA is required but not completed
    if (showCaptcha && !turnstileToken) {
      setErrors({
        otpCode: "Please complete the security verification"
      });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const normalizedEmail = otpEmail.trim().toLowerCase();
      const normalizedCode = otpCode.trim();
      
      const response = await supabase.functions.invoke('verify-otp', {
        body: {
          email: normalizedEmail,
          code: normalizedCode,
          turnstileToken: turnstileToken
        }
      });

      // Parse the response - handles both 2xx and non-2xx responses
      const parsed = await parseFunctionError(response);
      const responseData = parsed.data || {};
      const errorMessage = responseData.error || parsed.error;

      if (errorMessage) {
        // Check if this is an "account not found" error
        const isAccountNotFound = responseData.accountNotFound || 
          errorMessage.toLowerCase().includes('no account found') || 
          errorMessage.toLowerCase().includes('user not found');
        
        if (isAccountNotFound) {
          setAccountNotFound(true);
        } else {
          // Check if CAPTCHA is now required
          if (responseData.captchaRequired) {
            setShowCaptcha(true);
            setTurnstileToken(null);
          }
          if (responseData.failedAttempts !== undefined) {
            setFailedAttempts(responseData.failedAttempts);
          }
          toast({
            title: "Verification failed",
            description: errorMessage,
            variant: "destructive"
          });
        }
      } else if (responseData.session) {
        await supabase.auth.setSession({
          access_token: responseData.session.access_token,
          refresh_token: responseData.session.refresh_token
        });
        toast({
          title: "Success!",
          description: "You have been signed in."
        });
        // Redirect based on onboarding status
        const userId = responseData.session.user?.id;
        if (userId) {
          await checkOnboardingAndRedirect(userId);
        }
      } else {
        toast({
          title: "Verified!",
          description: "Your email has been verified. Please sign in."
        });
        resetOtpFlow();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const resetOtpFlow = () => {
    setOtpSent(false);
    setOtpCode("");
    setErrors({});
    setResendCooldown(0);
    setFailedAttempts(0);
    setShowCaptcha(false);
    setTurnstileToken(null);
    setAccountNotFound(false);
  };
  const AccountNotFoundMessage = () => (
    <div className="space-y-4">
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <UserX className="h-5 w-5" />
        <AlertTitle className="font-semibold">Account Not Found</AlertTitle>
        <AlertDescription className="mt-2 text-sm">
          We couldn't find an account associated with <strong>{otpEmail}</strong>
        </AlertDescription>
      </Alert>
      
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-foreground">What you can do:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>
              <strong>New organization?</strong> Create your account first
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>
              <strong>Already signed up?</strong> Check your email for approval status
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            <span>
              <strong>Team member?</strong> Contact your HR admin to be added to the system
            </span>
          </li>
        </ul>
      </div>

      <Button className="w-full" onClick={() => navigate('/signup')}>
        <Building2 className="mr-2 h-4 w-4" />
        Sign up for free
      </Button>
      
      <Button variant="outline" className="w-full" onClick={resetOtpFlow}>
        Try a different email
      </Button>
    </div>
  );
  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
  };
  const handleTurnstileError = () => {
    setTurnstileToken(null);
    toast({
      title: "Verification failed",
      description: "Security verification failed. Please try again.",
      variant: "destructive"
    });
  };
  const handleTurnstileExpire = () => {
    setTurnstileToken(null);
  };
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <img src={globalyosIcon} alt="GlobalyOS" className="w-24 h-24" style={{ minWidth: '96px', minHeight: '96px' }} />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to GlobalyOS</h1>
          <p className="text-muted-foreground mt-2">Operating System for Ambitious Teams</p>
        </div>

        {!otpSent ? <div className="space-y-4">
            {/* Google SSO Button - only show if enabled */}
            {googleAuthEnabled && <>
                <GoogleAuthButton mode="signin" className="w-full" />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>
              </>}

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="text-center mb-4">
                <Mail className="h-10 w-10 mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  Sign in with a 6-digit code sent to your email
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp-email">Email</Label>
                <Input id="otp-email" type="email" placeholder="you@example.com" value={otpEmail} onChange={e => setOtpEmail(e.target.value)} required autoFocus />
                {errors.otpEmail && <p className="text-sm text-destructive">{errors.otpEmail}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </form>

            {/* Sign up link */}
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Sign up for free
                </Link>
              </p>
            </div>

            {/* Security badges */}
            <div className="pt-4">
              <SecurityBadges />
            </div>
          </div> : accountNotFound ? <AccountNotFoundMessage /> : <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-4">
              <Mail className="h-10 w-10 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <strong>{otpEmail}</strong>
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={value => setOtpCode(value)}>
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
            {errors.otpCode && <p className="text-sm text-destructive text-center">{errors.otpCode}</p>}
            
            {/* Show Turnstile CAPTCHA after 2 failed attempts */}
            {showCaptcha && turnstileSiteKey && <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Please complete the security verification
                </p>
                <TurnstileWidget siteKey={turnstileSiteKey} onVerify={handleTurnstileVerify} onError={handleTurnstileError} onExpire={handleTurnstileExpire} />
                {turnstileToken && <p className="text-sm text-green-600 text-center">✓ Verified</p>}
              </div>}

            <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6 || showCaptcha && !turnstileToken}>
              {loading ? "Verifying..." : "Verify & Sign In"}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleResendOtp} disabled={loading || resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend in ${formatCooldown(resendCooldown)}` : "Resend Code"}
              </Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={resetOtpFlow}>
                Different email
              </Button>
            </div>
          </form>}
      </Card>
    </div>;
};
export default Auth;