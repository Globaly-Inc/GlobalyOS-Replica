import { useState, useEffect, useCallback } from "react";
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
import { StructuredAddressInput, type AddressValue, EMPTY_ADDRESS } from '@/components/ui/structured-address-input';
import { type AddressComponents } from '@/components/ui/address-autocomplete';
import { 
  Building2, 
  Users, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Zap,
  Shield,
  Crown,
  ChevronsUpDown,
  Loader2,
  // Category icons
  Monitor, Scale, GraduationCap, Plane, Heart, Landmark, 
  Home, ShoppingCart, Factory, Palette, Hotel,
  Leaf, Phone, Truck, Trophy, Church, HelpCircle,
  Briefcase, BookOpen, Stethoscope, DollarSign, Building, 
  Megaphone, Utensils, Calendar, Code, Database
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { 
  GoogleAuthButton, 
  TrustedBySection, 
  SecurityBadges, 
  CustomerCount 
} from "@/components/onboarding";

// Combined validation schema for step 2
const businessAndUserSchema = z.object({
  // Business info
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  industry: z.string().min(1, "Please select a business category"),
  companySize: z.string().min(1, "Please select company size"),
  businessAddress: z.string().min(1, "Please enter your business address"),
  country: z.string().min(1, "Business address must include a valid country"),
  // User details
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

const BUSINESS_CATEGORIES = [
  // Technology & IT
  { value: 'Technology', label: 'Technology', icon: Monitor },
  { value: 'IT Services & Consulting', label: 'IT Services & Consulting', icon: Monitor },
  { value: 'Software Development', label: 'Software Development', icon: Code },
  { value: 'Cybersecurity', label: 'Cybersecurity', icon: Shield },
  { value: 'Data & Analytics', label: 'Data & Analytics', icon: Database },
  
  // Professional Services
  { value: 'Professional Services', label: 'Professional Services', icon: Briefcase },
  { value: 'Legal Firm', label: 'Legal Firm', icon: Scale },
  { value: 'Tax & Accounting Firm', label: 'Tax & Accounting Firm', icon: DollarSign },
  { value: 'Management Consulting', label: 'Management Consulting', icon: Briefcase },
  { value: 'HR Consulting', label: 'HR Consulting', icon: Users },
  { value: 'Business Consulting', label: 'Business Consulting', icon: Briefcase },
  
  // Education
  { value: 'Education', label: 'Education', icon: GraduationCap },
  { value: 'Education Consultancy', label: 'Education Consultancy', icon: GraduationCap },
  { value: 'Training & Coaching', label: 'Training & Coaching', icon: BookOpen },
  { value: 'E-Learning', label: 'E-Learning', icon: Monitor },
  
  // Immigration & Legal
  { value: 'Migration Agency', label: 'Migration Agency', icon: Plane },
  { value: 'Immigration Services', label: 'Immigration Services', icon: Plane },
  
  // Healthcare
  { value: 'Healthcare', label: 'Healthcare', icon: Heart },
  { value: 'Medical Practice', label: 'Medical Practice', icon: Stethoscope },
  { value: 'Dental Practice', label: 'Dental Practice', icon: Heart },
  { value: 'Allied Health Services', label: 'Allied Health Services', icon: Heart },
  { value: 'Pharmacy', label: 'Pharmacy', icon: Heart },
  { value: 'Mental Health Services', label: 'Mental Health Services', icon: Heart },
  
  // Finance
  { value: 'Finance & Banking', label: 'Finance & Banking', icon: Landmark },
  { value: 'Insurance', label: 'Insurance', icon: Shield },
  { value: 'Financial Advisory', label: 'Financial Advisory', icon: DollarSign },
  { value: 'Wealth Management', label: 'Wealth Management', icon: DollarSign },
  { value: 'Fintech', label: 'Fintech', icon: Landmark },
  
  // Real Estate & Property
  { value: 'Real Estate', label: 'Real Estate', icon: Home },
  { value: 'Property Management', label: 'Property Management', icon: Building },
  { value: 'Construction', label: 'Construction', icon: Building },
  { value: 'Architecture & Design', label: 'Architecture & Design', icon: Palette },
  
  // Retail & Commerce
  { value: 'Retail & E-commerce', label: 'Retail & E-commerce', icon: ShoppingCart },
  { value: 'Wholesale & Distribution', label: 'Wholesale & Distribution', icon: ShoppingCart },
  
  // Manufacturing & Industry
  { value: 'Manufacturing', label: 'Manufacturing', icon: Factory },
  { value: 'Logistics & Supply Chain', label: 'Logistics & Supply Chain', icon: Truck },
  { value: 'Automotive', label: 'Automotive', icon: Truck },
  
  // Creative & Media
  { value: 'Media & Entertainment', label: 'Media & Entertainment', icon: Palette },
  { value: 'Advertising & Marketing', label: 'Advertising & Marketing', icon: Megaphone },
  { value: 'Design Agency', label: 'Design Agency', icon: Palette },
  { value: 'Digital Marketing', label: 'Digital Marketing', icon: Megaphone },
  
  // Hospitality & Travel
  { value: 'Hospitality', label: 'Hospitality', icon: Hotel },
  { value: 'Travel & Tourism', label: 'Travel & Tourism', icon: Plane },
  { value: 'Food & Beverage', label: 'Food & Beverage', icon: Utensils },
  { value: 'Event Management', label: 'Event Management', icon: Calendar },
  
  // Other Sectors
  { value: 'Non-profit', label: 'Non-profit', icon: Users },
  { value: 'Government', label: 'Government', icon: Landmark },
  { value: 'Agriculture', label: 'Agriculture', icon: Leaf },
  { value: 'Energy & Utilities', label: 'Energy & Utilities', icon: Zap },
  { value: 'Telecommunications', label: 'Telecommunications', icon: Phone },
  { value: 'Transportation', label: 'Transportation', icon: Truck },
  { value: 'Sports & Recreation', label: 'Sports & Recreation', icon: Trophy },
  { value: 'Religious Organization', label: 'Religious Organization', icon: Church },
  { value: 'Other', label: 'Other', icon: HelpCircle },
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "500+", label: "500+ employees" },
];

// Countries imported from shared module

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
  const [businessAddressValue, setBusinessAddressValue] = useState<AddressValue>(EMPTY_ADDRESS);
  const [businessAddressComponents, setBusinessAddressComponents] = useState<AddressComponents | null>(null);
  const [businessCategoryOpen, setBusinessCategoryOpen] = useState(false);

  // Handle address change from StructuredAddressInput
  const handleAddressChange = (addressValue: AddressValue) => {
    setBusinessAddressValue(addressValue);
    
    // Build address components for backend
    const components: AddressComponents = {
      locality: addressValue.city,
      administrative_area_level_1: addressValue.state,
      postal_code: addressValue.postcode,
      country: addressValue.country,
      country_code: addressValue.country,
      lat: addressValue.lat,
      lng: addressValue.lng,
      place_id: addressValue.place_id,
      google_maps_url: addressValue.google_maps_url,
      formatted_address: addressValue.street,
      route: addressValue.street,
    };
    setBusinessAddressComponents(components);
  };
  
  // Step 3: User details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Email availability check
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [emailStatusMessage, setEmailStatusMessage] = useState<string>('');
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

  // Check email availability
  const checkEmailAvailability = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !z.string().email().safeParse(emailToCheck).success) {
      setEmailStatus('idle');
      setEmailStatusMessage('');
      return;
    }
    
    setEmailStatus('checking');
    
    try {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id, approval_status')
        .eq('owner_email', emailToCheck)
        .in('approval_status', ['pending', 'approved'])
        .limit(1)
        .maybeSingle();
      
      if (existingOrg) {
        setEmailStatus('taken');
        if (existingOrg.approval_status === 'pending') {
          setEmailStatusMessage('This email already has a pending application. Please wait for approval or use a different email.');
        } else {
          setEmailStatusMessage('An organization with this email already exists. Please sign in instead.');
        }
      } else {
        setEmailStatus('available');
        setEmailStatusMessage('');
      }
    } catch (error) {
      // On error, allow form submission (server will validate again)
      setEmailStatus('available');
      setEmailStatusMessage('');
    }
  }, []);

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email) {
        checkEmailAvailability(email);
      } else {
        setEmailStatus('idle');
        setEmailStatusMessage('');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [email, checkEmailAvailability]);

  const validateStep2 = () => {
    // Block submission if email is taken
    if (emailStatus === 'taken') {
      return false;
    }
    
    try {
      businessAndUserSchema.parse({ 
        organizationName, 
        industry, 
        companySize, 
        businessAddress: businessAddressValue.street,
        country: businessAddressValue.country,
        fullName, 
        email, 
        phone, 
        acceptTerms 
      });
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
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('signup-organization', {
        body: {
          organizationName,
          industry,
          companySize,
          businessAddress: businessAddressValue.street,
          businessAddressComponents,
          country: businessAddressValue.country,
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

  const getAnnualTotal = (plan: Plan) => {
    if (plan === 'enterprise') return 'Custom';
    return `$${PLANS[plan].annual * 12}`;
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
          {[1, 2].map((s) => (
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
              {s < 2 && (
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
                Annual Billing
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
                  {billingCycle === 'annual' ? (
                    <>
                      <span className="text-3xl font-bold">{getPrice('starter')}</span>
                      <span className="text-muted-foreground">/mo</span>
                      <p className="text-sm text-muted-foreground">{getAnnualTotal('starter')} Billed Annually</p>
                      <p className="text-sm text-success">Save ${getAnnualSavings('starter')}/year</p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{getPrice('starter')}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </>
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
                  {billingCycle === 'annual' ? (
                    <>
                      <span className="text-3xl font-bold">{getPrice('growth')}</span>
                      <span className="text-muted-foreground">/mo</span>
                      <p className="text-sm text-muted-foreground">{getAnnualTotal('growth')} Billed Annually</p>
                      <p className="text-sm text-success">Save ${getAnnualSavings('growth')}/year</p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{getPrice('growth')}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </>
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

        {/* Step 2: Complete Registration (Business + User Details) */}
        {step === 2 && (
          <Card className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Complete Your Registration</h2>
                <p className="text-sm text-muted-foreground">Tell us about your organization and yourself</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Business Information Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Business Information</h3>
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

                  <StructuredAddressInput
                    value={businessAddressValue}
                    onChange={handleAddressChange}
                    required
                    allowBusinesses
                    addressLabel="Business Address"
                  />
                  {errors.businessAddress && (
                    <p className="text-sm text-destructive">{errors.businessAddress}</p>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Business Category *</Label>
                      <Popover open={businessCategoryOpen} onOpenChange={setBusinessCategoryOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={businessCategoryOpen}
                            className="w-full justify-between font-normal"
                          >
                            {industry ? (
                              <span className="flex items-center gap-2">
                                {(() => {
                                  const category = BUSINESS_CATEGORIES.find(c => c.value === industry);
                                  const IconComponent = category?.icon;
                                  return IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />;
                                })()}
                                {BUSINESS_CATEGORIES.find(c => c.value === industry)?.label || industry}
                              </span>
                            ) : (
                              'Select category...'
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search category..." />
                            <CommandList className="max-h-[250px]">
                              <CommandEmpty>No category found.</CommandEmpty>
                              <CommandGroup>
                                {BUSINESS_CATEGORIES.map((category) => {
                                  const IconComponent = category.icon;
                                  return (
                                    <CommandItem
                                      key={category.value}
                                      value={category.label}
                                      onSelect={() => {
                                        setIndustry(category.value);
                                        setBusinessCategoryOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          industry === category.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" />
                                      {category.label}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
                  </div>
                </div>
              </div>

              <Separator />

              {/* Your Details Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Your Details</h3>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
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
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@acme.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            // Reset status when user starts typing again
                            if (emailStatus === 'taken') {
                              setEmailStatus('idle');
                              setEmailStatusMessage('');
                            }
                          }}
                          disabled={emailStatus === 'taken'}
                          className={cn(
                            emailStatus === 'taken' && 'border-destructive bg-destructive/10 text-muted-foreground pr-10'
                          )}
                        />
                        {emailStatus === 'checking' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {emailStatus === 'taken' && emailStatusMessage && (
                        <div className="space-y-1">
                          <p className="text-sm text-destructive">{emailStatusMessage}</p>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="h-auto p-0 text-xs"
                              onClick={() => {
                                setEmail('');
                                setEmailStatus('idle');
                                setEmailStatusMessage('');
                              }}
                            >
                              Use a different email
                            </Button>
                            <span className="text-xs text-muted-foreground">or</span>
                            <Link to="/auth" className="text-xs text-primary hover:underline">
                              Sign in instead
                            </Link>
                          </div>
                        </div>
                      )}
                      {errors.email && emailStatus !== 'taken' && (
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
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a>
                      {" "}and{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>
                    </Label>
                  </div>
                  {errors.acceptTerms && (
                    <p className="text-sm text-destructive">{errors.acceptTerms}</p>
                  )}
                </div>
              </div>
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
