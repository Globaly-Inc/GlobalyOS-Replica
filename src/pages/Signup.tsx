import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Building2, 
  Users, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Zap,
  Shield,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { 
  GoogleAuthButton, 
  TrustedBySection, 
  SecurityBadges, 
  CustomerCount 
} from "@/components/onboarding";

// Validation schemas
const businessInfoSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  industry: z.string().min(1, "Please select an industry"),
  companySize: z.string().min(1, "Please select company size"),
  country: z.string().min(1, "Please select a country"),
});

const userDetailsSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+[1-9]\d{1,14}$/, "Please enter a valid phone number with country code (e.g., +1234567890)"),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

type Plan = 'starter' | 'growth' | 'enterprise';
type BillingCycle = 'monthly' | 'annual';

const PLANS = {
  starter: { monthly: 149, annual: 119, name: 'Starter' },
  growth: { monthly: 299, annual: 239, name: 'Growth' },
  enterprise: { monthly: 0, annual: 0, name: 'Enterprise' },
};

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance & Banking",
  "Retail & E-commerce",
  "Manufacturing",
  "Education",
  "Professional Services",
  "Real Estate",
  "Media & Entertainment",
  "Non-profit",
  "Other",
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "500+", label: "500+ employees" },
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "India",
  "Singapore",
  "Japan",
  "Other",
];

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Step 1: Plan selection
  const [selectedPlan, setSelectedPlan] = useState<Plan>('growth');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  
  // Step 2: Business info
  const [organizationName, setOrganizationName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("");
  
  // Step 3: User details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Pre-fill plan from URL if provided
  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam && ['starter', 'growth', 'enterprise'].includes(planParam)) {
      setSelectedPlan(planParam as Plan);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const validateStep2 = () => {
    try {
      businessInfoSchema.parse({ organizationName, industry, companySize, country });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const validateStep3 = () => {
    try {
      userDetailsSchema.parse({ fullName, email, phone, acceptTerms });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (selectedPlan === 'enterprise') {
        // For enterprise, redirect to contact
        window.location.href = 'mailto:sales@globalyos.com?subject=Enterprise%20Plan%20Inquiry';
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('signup-organization', {
        body: {
          organizationName,
          industry,
          companySize,
          country,
          ownerName: fullName,
          ownerEmail: email,
          ownerPhone: phone,
          plan: selectedPlan,
          billingCycle,
        },
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message || 'Failed to create organization');
      }

      toast({
        title: "Application submitted!",
        description: "Your organization is pending approval.",
      });

      navigate(`/pending-approval?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan: Plan) => {
    if (plan === 'enterprise') return 'Custom';
    return `$${PLANS[plan][billingCycle]}`;
  };

  const getAnnualSavings = (plan: Plan) => {
    if (plan === 'enterprise') return 0;
    return (PLANS[plan].monthly - PLANS[plan].annual) * 12;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Start Your Free Trial</h1>
          <p className="text-muted-foreground mt-2">7 days free, no credit card required</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "w-16 md:w-24 h-1 mx-2",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Plan Selection */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={cn("font-medium", billingCycle === 'monthly' ? "text-foreground" : "text-muted-foreground")}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className={cn(
                  "relative w-14 h-7 rounded-full transition-colors",
                  billingCycle === 'annual' ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute w-5 h-5 bg-white rounded-full top-1 transition-transform",
                    billingCycle === 'annual' ? "translate-x-8" : "translate-x-1"
                  )}
                />
              </button>
              <span className={cn("font-medium", billingCycle === 'annual' ? "text-foreground" : "text-muted-foreground")}>
                Annual
              </span>
              {billingCycle === 'annual' && (
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                  Save 20%
                </Badge>
              )}
            </div>

            {/* Plan Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Starter */}
              <Card
                className={cn(
                  "p-6 cursor-pointer transition-all hover:shadow-lg",
                  selectedPlan === 'starter' && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedPlan('starter')}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Starter</h3>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{getPrice('starter')}</span>
                  <span className="text-muted-foreground">/mo</span>
                  {billingCycle === 'annual' && (
                    <p className="text-sm text-success">Save ${getAnnualSavings('starter')}/year</p>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Unlimited users</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Team directory</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Leave management</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 5 GB storage</li>
                </ul>
              </Card>

              {/* Growth */}
              <Card
                className={cn(
                  "p-6 cursor-pointer transition-all hover:shadow-lg relative",
                  selectedPlan === 'growth' && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedPlan('growth')}
              >
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Growth</h3>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{getPrice('growth')}</span>
                  <span className="text-muted-foreground">/mo</span>
                  {billingCycle === 'annual' && (
                    <p className="text-sm text-success">Save ${getAnnualSavings('growth')}/year</p>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Everything in Starter</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Wiki & knowledge base</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 100 AI queries/mo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 50 GB storage</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Performance reviews</li>
                </ul>
              </Card>

              {/* Enterprise */}
              <Card
                className={cn(
                  "p-6 cursor-pointer transition-all hover:shadow-lg",
                  selectedPlan === 'enterprise' && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedPlan('enterprise')}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Enterprise</h3>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">Custom</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Everything in Growth</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Unlimited AI</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Unlimited storage</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Priority support</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Custom integrations</li>
                </ul>
              </Card>
            </div>

            {/* Trial Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium">7-day free trial included</p>
              <p className="text-sm text-muted-foreground">No credit card required. Cancel anytime.</p>
            </div>

            <Button onClick={handleNext} className="w-full" size="lg">
              {selectedPlan === 'enterprise' ? 'Contact Sales' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {/* Social Proof */}
            <div className="pt-6 space-y-6">
              <Separator />
              <CustomerCount />
              <SecurityBadges />
            </div>
          </div>
        )}

        {/* Step 2: Business Information */}
        {step === 2 && (
          <Card className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Business Information</h2>
                <p className="text-sm text-muted-foreground">Tell us about your organization</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <Input
                  id="orgName"
                  placeholder="Acme Inc."
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
                {errors.organizationName && (
                  <p className="text-sm text-destructive">{errors.organizationName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.industry && (
                  <p className="text-sm text-destructive">{errors.industry}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size *</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.companySize && (
                  <p className="text-sm text-destructive">{errors.companySize}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-sm text-destructive">{errors.country}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: User Details */}
        {step === 3 && (
          <Card className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Your Details</h2>
                <p className="text-sm text-muted-foreground">Create your account</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Include country code (e.g., +1 for US, +44 for UK)</p>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-sm text-destructive">{errors.acceptTerms}</p>
              )}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Order Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{PLANS[selectedPlan].name} Plan ({billingCycle})</span>
                <span className="font-medium">{getPrice(selectedPlan)}/mo</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">7-day free trial</span>
                <span className="text-success font-medium">Included</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
                {loading ? "Submitting..." : "Start Free Trial"}
              </Button>
            </div>
          </Card>
        )}

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/auth" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
