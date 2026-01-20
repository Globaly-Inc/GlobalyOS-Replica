import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import TurnstileWidget from "@/components/TurnstileWidget";
import globalyosIcon from "@/assets/globalyos-icon.png";

const emailSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
});

const Join = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orgName, setOrgName] = useState<string | null>(null);

  // CAPTCHA state
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);

  // Fetch Turnstile site key on mount
  useEffect(() => {
    const fetchTurnstileKey = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-turnstile-key');
        if (data?.siteKey) {
          setTurnstileSiteKey(data.siteKey);
        }
      } catch (err) {
        console.error('Failed to fetch Turnstile key:', err);
      }
    };
    fetchTurnstileKey();
  }, []);

  // Fetch organization name based on email
  const fetchOrgInfo = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck) {
      setOrgName(null);
      return;
    }
    
    try {
      const { data } = await supabase.functions.invoke('get-invite-org-info', {
        body: { email: emailToCheck.toLowerCase().trim() }
      });
      if (data?.organizationName) {
        setOrgName(data.organizationName);
      } else {
        setOrgName(null);
      }
    } catch (err) {
      console.error('Failed to fetch org info:', err);
      setOrgName(null);
    }
  }, []);

  useEffect(() => {
    // Pre-fill email from URL params
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      // Fetch org info immediately for pre-filled email
      fetchOrgInfo(emailParam);
    }

    // Check if user is already logged in
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
  }, [navigate, searchParams, fetchOrgInfo]);

  // Fetch org info when email changes (with debounce)
  useEffect(() => {
    // Only fetch if email looks valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      fetchOrgInfo(email);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [email, fetchOrgInfo]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate email
    try {
      emailSchema.parse({ email });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ email: error.errors[0]?.message || "Invalid email" });
        return;
      }
    }

    if (inviteCode.length !== 6) {
      setErrors({ inviteCode: "Please enter the 6-digit code" });
      return;
    }

    // If CAPTCHA is required but not completed, show error
    if (showCaptcha && !turnstileToken) {
      toast({
        title: "Verification required",
        description: "Please complete the security check",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('verify-otp', {
        body: { 
          email: email.toLowerCase().trim(), 
          code: inviteCode.trim(),
          turnstileToken: turnstileToken || undefined 
        }
      });

      if (response.error) {
        toast({
          title: "Verification failed",
          description: response.error.message || "Please try again",
          variant: "destructive",
        });
      } else if (response.data?.error) {
        // Check if CAPTCHA is now required
        if (response.data?.captchaRequired) {
          setShowCaptcha(true);
          setTurnstileToken(null); // Reset token for new attempt
          toast({
            title: "Security verification required",
            description: "Please complete the security check below",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Verification failed",
            description: response.data.error,
            variant: "destructive",
          });
        }
      } else if (response.data?.session) {
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });
        
        // Reset CAPTCHA state on success
        setShowCaptcha(false);
        setTurnstileToken(null);
        
        toast({
          title: "Welcome to GlobalyOS!",
          description: "You have successfully joined the team.",
        });
      } else {
        toast({
          title: "Error",
          description: "Unable to complete sign in. Please try again.",
          variant: "destructive",
        });
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

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
  };

  const handleTurnstileError = () => {
    setTurnstileToken(null);
    toast({
      title: "Verification failed",
      description: "Please try the security check again",
      variant: "destructive",
    });
  };

  const handleTurnstileExpire = () => {
    setTurnstileToken(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={globalyosIcon} 
              alt="GlobalyOS" 
              className="w-24 h-24" 
              style={{ minWidth: '96px', minHeight: '96px' }} 
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {orgName ? `Join ${orgName} Team` : 'Join Your Team'}
          </h1>
          <p className="text-muted-foreground mt-2">in GlobalyOS</p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-6">
          <div className="text-center mb-4">
            <KeyRound className="h-10 w-10 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">
              Enter your email and the 6-digit code from your invitation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="join-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="join-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label>Invitation Code</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={inviteCode}
                onChange={(value) => setInviteCode(value)}
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
            {errors.inviteCode && <p className="text-sm text-destructive text-center">{errors.inviteCode}</p>}
          </div>

          {/* CAPTCHA Widget - shown after failed attempts */}
          {showCaptcha && turnstileSiteKey && (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              onVerify={handleTurnstileVerify}
              onError={handleTurnstileError}
              onExpire={handleTurnstileExpire}
            />
          )}

          <Button type="submit" className="w-full" disabled={loading || inviteCode.length !== 6 || (showCaptcha && !turnstileToken)}>
            {loading ? "Verifying..." : "Join Team"}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have access?{" "}
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Join;
