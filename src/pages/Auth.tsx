import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import TurnstileWidget from "@/components/TurnstileWidget";

const otpEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  // Fetch Turnstile site key on mount
  useEffect(() => {
    const fetchTurnstileConfig = async () => {
      try {
        const response = await supabase.functions.invoke('get-turnstile-config');
        if (response.data?.siteKey) {
          setTurnstileSiteKey(response.data.siteKey);
        }
      } catch (error) {
        console.error('Failed to fetch Turnstile config:', error);
      }
    };
    fetchTurnstileConfig();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const sendOtpRequest = async (email: string) => {
    const response = await supabase.functions.invoke('send-otp', {
      body: { email }
    });

    if (response.error) {
      toast({
        title: "Failed to send OTP",
        description: response.error.message || "Please try again",
        variant: "destructive",
      });
      return false;
    } else if (response.data?.error) {
      toast({
        title: "Failed to send OTP",
        description: response.data.error,
        variant: "destructive",
      });
      return false;
    } else {
      toast({
        title: "OTP Sent!",
        description: "Check your email for the 6-digit code.",
      });
      return true;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      const validated = otpEmailSchema.parse({ email: otpEmail });
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
        setErrors({ otpEmail: error.errors[0]?.message || "Invalid email" });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
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
      setErrors({ otpCode: "Please enter the 6-digit code" });
      return;
    }

    // Check if CAPTCHA is required but not completed
    if (showCaptcha && !turnstileToken) {
      setErrors({ otpCode: "Please complete the security verification" });
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const response = await supabase.functions.invoke('verify-otp', {
        body: { 
          email: otpEmail, 
          code: otpCode,
          turnstileToken: turnstileToken 
        }
      });

      // Handle error responses - check data.error first since edge function returns errors in body
      const errorMessage = response.data?.error || response.error?.message;
      
      if (errorMessage) {
        // Check if CAPTCHA is now required
        if (response.data?.captchaRequired) {
          setShowCaptcha(true);
          setTurnstileToken(null);
        }
        if (response.data?.failedAttempts !== undefined) {
          setFailedAttempts(response.data.failedAttempts);
        }
        toast({
          title: "Verification failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (response.data?.session) {
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });
        
        toast({
          title: "Success!",
          description: "You have been signed in.",
        });
      } else {
        toast({
          title: "Verified!",
          description: "Your email has been verified. Please sign in.",
        });
        resetOtpFlow();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
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
  };

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
  };

  const handleTurnstileError = () => {
    setTurnstileToken(null);
    toast({
      title: "Verification failed",
      description: "Security verification failed. Please try again.",
      variant: "destructive",
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark mb-4">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to TeamHub</h1>
          <p className="text-muted-foreground mt-2">HRMS & Social Intranet</p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="text-center mb-4">
              <Mail className="h-10 w-10 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Sign in with a 6-digit code sent to your email
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otp-email">Email</Label>
              <Input
                id="otp-email"
                type="email"
                placeholder="you@example.com"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                required
              />
              {errors.otpEmail && <p className="text-sm text-destructive">{errors.otpEmail}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-4">
              <Mail className="h-10 w-10 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <strong>{otpEmail}</strong>
              </p>
            </div>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(value) => setOtpCode(value)}
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
            {errors.otpCode && <p className="text-sm text-destructive text-center">{errors.otpCode}</p>}
            
            {/* Show Turnstile CAPTCHA after 2 failed attempts */}
            {showCaptcha && turnstileSiteKey && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Please complete the security verification
                </p>
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onVerify={handleTurnstileVerify}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileExpire}
                />
                {turnstileToken && (
                  <p className="text-sm text-green-600 text-center">✓ Verified</p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || otpCode.length !== 6 || (showCaptcha && !turnstileToken)}
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </Button>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={handleResendOtp}
                disabled={loading || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${formatCooldown(resendCooldown)}` : "Resend Code"}
              </Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={resetOtpFlow}>
                Different email
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default Auth;
