import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users, Mail, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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

  useEffect(() => {
    // Pre-fill email from URL params
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
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
  }, [navigate, searchParams]);

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
    
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('verify-otp', {
        body: { email: email.toLowerCase().trim(), code: inviteCode }
      });

      if (response.error) {
        toast({
          title: "Verification failed",
          description: response.error.message || "Please try again",
          variant: "destructive",
        });
      } else if (response.data?.error) {
        toast({
          title: "Verification failed",
          description: response.data.error,
          variant: "destructive",
        });
      } else if (response.data?.session) {
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });
        
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark mb-4">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Join GlobalyOS</h1>
          <p className="text-muted-foreground mt-2">Enter the code from your invitation email</p>
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

          <Button type="submit" className="w-full" disabled={loading || inviteCode.length !== 6}>
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