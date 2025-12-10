import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users, Mail, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const signupSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  orgName: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100),
});

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"details" | "otp">("details");
  
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);

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
  }, [navigate]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
  };

  const sendOtpRequest = async () => {
    const response = await supabase.functions.invoke('send-otp', {
      body: { email, isSignup: true, fullName }
    });

    if (response.error || response.data?.error) {
      toast({
        title: "Failed to send OTP",
        description: response.error?.message || response.data?.error || "Please try again",
        variant: "destructive",
      });
      return false;
    }
    
    toast({
      title: "OTP Sent!",
      description: "Check your email for the 6-digit code.",
    });
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      signupSchema.parse({ email, fullName, orgName });
      setLoading(true);

      const success = await sendOtpRequest();
      if (success) {
        setStep("otp");
        setResendCooldown(60);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrors({ otpCode: "Please enter the 6-digit code" });
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const response = await supabase.functions.invoke('verify-otp', {
        body: { email, code: otpCode }
      });

      if (response.error || response.data?.error) {
        toast({
          title: "Verification failed",
          description: response.error?.message || response.data?.error || "Please try again",
          variant: "destructive",
        });
        return;
      }

      if (response.data?.session) {
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });

        // Create organization
        const slug = generateSlug(orgName);
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .insert({ name: orgName, slug })
          .select()
          .single();

        if (orgError) {
          // Try with a unique slug
          const uniqueSlug = `${slug}-${Date.now()}`;
          const { data: org2, error: orgError2 } = await supabase
            .from("organizations")
            .insert({ name: orgName, slug: uniqueSlug })
            .select()
            .single();

          if (orgError2) {
            toast({
              title: "Error creating organization",
              description: orgError2.message,
              variant: "destructive",
            });
            return;
          }

          // Add user as owner
          await supabase.from("organization_members").insert({
            organization_id: org2.id,
            user_id: response.data.session.user.id,
            role: "owner",
          });
        } else {
          // Add user as owner
          await supabase.from("organization_members").insert({
            organization_id: org.id,
            user_id: response.data.session.user.id,
            role: "owner",
          });
        }

        toast({
          title: "Welcome to TeamHub!",
          description: "Your organization has been created.",
        });
        
        navigate("/onboarding");
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

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    const success = await sendOtpRequest();
    if (success) {
      setResendCooldown(60);
      setOtpCode("");
    }
    setLoading(false);
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
          <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-2">Start your 14-day free trial</p>
        </div>

        {step === "details" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Your Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
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
              <Label htmlFor="orgName">Organization Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="orgName"
                  type="text"
                  placeholder="Acme Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {errors.orgName && <p className="text-sm text-destructive">{errors.orgName}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/auth" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-4">
              <Mail className="h-10 w-10 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <strong>{email}</strong>
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
            <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
              {loading ? "Verifying..." : "Verify & Continue"}
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
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep("details")}>
                Go Back
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default Signup;
