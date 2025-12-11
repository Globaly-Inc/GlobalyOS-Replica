import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, Briefcase, TrendingUp, Award, FileText, Target, Building2, Rocket, Globe, CheckCircle2, ArrowRight, Star, Shield, Clock, Zap, Menu, X } from "lucide-react";
import { useScrollAnimation, AnimatedSection } from "@/hooks/useScrollAnimation";

// Import illustrations
import heroIllustration from "@/assets/illustrations/hero-illustration.svg";
import problemIllustration from "@/assets/illustrations/problem-illustration.svg";
import frugalityIllustration from "@/assets/illustrations/frugality.png";
import femaleTeamIllustration from "@/assets/illustrations/female-team.png";
import maleTeamIllustration from "@/assets/illustrations/male-team.png";
import maleTeam2Illustration from "@/assets/illustrations/male-team-2.png";
import workAnniversaryIllustration from "@/assets/illustrations/work-anniversary.png";
import workAnniversary2Illustration from "@/assets/illustrations/work-anniversary-2.png";
const features = [{
  icon: Users,
  title: "360° Employee Profiles",
  items: ["Complete personal and employment data", "Contracts, documents & compliance info", "Work schedule and status"]
}, {
  icon: TrendingUp,
  title: "Role & Compensation History",
  items: ["Timeline of positions and reporting lines", "Salary history with increments and dates", "Leadership notes on key changes"]
}, {
  icon: Star,
  title: "Performance Review Engine",
  items: ["Templates for manager, peer, self reviews", "Rating scales and comment boxes", "Historical comparison across cycles"]
}, {
  icon: Target,
  title: "Career & Growth Planning",
  items: ["Clear role responsibilities & expectations", "Skills to develop and priorities", "Linked trainings and outcomes"]
}, {
  icon: FileText,
  title: "HR Notes & Documentation",
  items: ["HR remarks and agreements", "Onboarding/offboarding checklists", "Attachments under employee profile"]
}, {
  icon: Zap,
  title: "Always Up-to-Date SaaS",
  items: ["No servers to manage", "Automatic updates and backups", "Access from anywhere, anytime"]
}];
const whoItsFor = [{
  icon: Rocket,
  title: "Startup Founders & CEOs",
  description: "Teams of 10–200+ employees scaling fast"
}, {
  icon: Users,
  title: "People & Culture / HR",
  description: "Streamline HR operations and documentation"
}, {
  icon: Building2,
  title: "Operations Leaders",
  description: "Structured data for better decisions"
}, {
  icon: Globe,
  title: "Remote & Hybrid Teams",
  description: "Centralized HR regardless of location"
}];
const howItWorks = [{
  step: "01",
  title: "Set Up Your Workspace",
  description: "Create your organisation in TeamHub, define roles, departments and basic settings."
}, {
  step: "02",
  title: "Import & Build Profiles",
  description: "Import existing employee records and enrich them with position history, salary changes and past reviews."
}, {
  step: "03",
  title: "Run Reviews & Plan Growth",
  description: "Use TeamHub templates to run review cycles, document decisions and update each employee's growth plan."
}];
const pricingPlans = [{
  name: "Starter",
  description: "For small teams getting serious about HR structure.",
  features: ["Up to 25 employees", "Employee profiles & timelines", "Basic document storage", "Email support"]
}, {
  name: "Growth",
  description: "For growing companies needing full reviews & growth tracking.",
  features: ["Unlimited employees", "Performance review templates", "Growth planning tools", "Priority support", "Custom fields"],
  popular: true
}, {
  name: "Scale",
  description: "For larger teams needing custom onboarding and reporting.",
  features: ["Everything in Growth", "Advanced analytics", "Custom onboarding flows", "API access", "Dedicated success manager"]
}];
const faqs = [{
  question: "Is TeamHub hard to set up?",
  answer: "Not at all. Most teams are up and running within a day. You can import existing employee data from spreadsheets, and our onboarding wizard guides you through setting up departments, roles, and review templates."
}, {
  question: "Can we customise review forms and roles?",
  answer: "Yes! TeamHub is designed to be flexible. You can create custom review templates, define your own rating scales, add custom fields to employee profiles, and configure role permissions to match your organization's structure."
}, {
  question: "Is our data secure?",
  answer: "Absolutely. We use enterprise-grade encryption, regular security audits, and comply with data protection standards. Your data is hosted on secure cloud infrastructure with automatic backups and disaster recovery."
}, {
  question: "Can we change or cancel our subscription?",
  answer: "Yes, you can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the start of your next billing cycle. We also offer a 30-day money-back guarantee for new subscriptions."
}, {
  question: "Who is TeamHub best for?",
  answer: "TeamHub is ideal for growing companies (10-500+ employees) who want to move beyond spreadsheets and build a proper HR foundation. It's especially valuable for teams that care about fair, transparent people decisions."
}];

// Animated card component with stagger support
const AnimatedCard = ({
  children,
  className = "",
  index = 0,
  isVisible = true
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
  isVisible?: boolean;
}) => <div className={`transition-all duration-500 ease-out ${className}`} style={{
  transitionDelay: `${index * 100}ms`,
  opacity: isVisible ? 1 : 0,
  transform: isVisible ? "translateY(0)" : "translateY(20px)"
}}>
    {children}
  </div>;
const Landing = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Section visibility states
  const problemSection = useScrollAnimation();
  const solutionSection = useScrollAnimation();
  const featuresSection = useScrollAnimation();
  const whoSection = useScrollAnimation();
  const howSection = useScrollAnimation();
  const valueSection = useScrollAnimation();
  const pricingSection = useScrollAnimation();
  const faqSection = useScrollAnimation();

  // Handle scroll for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
    setMobileMenuOpen(false);
  };
  const navItems = [{
    label: "Home",
    id: "hero"
  }, {
    label: "Features",
    id: "features"
  }, {
    label: "How It Works",
    id: "how-it-works"
  }, {
    label: "Pricing",
    id: "pricing"
  }, {
    label: "FAQ",
    id: "faq"
  }];
  return <div className="min-h-screen bg-background">
      {/* Sticky Navigation */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"}`}>
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TeamHub</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map(item => <button key={item.id} onClick={() => scrollToSection(item.id)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </button>)}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-3">
            <Button onClick={() => scrollToSection("pricing")}>
              Sign In
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && <div className="md:hidden bg-background border-b border-border">
            <nav className="container px-4 py-4 flex flex-col gap-4">
              {navItems.map(item => <button key={item.id} onClick={() => scrollToSection(item.id)} className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {item.label}
                </button>)}
              <Button className="mt-2" onClick={() => scrollToSection("pricing")}>
                Sign In
              </Button>
            </nav>
          </div>}
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

        <div className="container relative mx-auto px-4 md:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="max-w-xl animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                All Your People Data, In One{" "}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Living Timeline
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                TeamHub is a subscription-based HRMS that turns scattered HR
                files into a clear, dynamic profile for every employee – from
                hiring and salary changes to performance reviews and growth
                plans – so you can make fair, confident people decisions.
              </p>
              <ul className="mt-8 space-y-3">
                {["See the complete journey of each team member in one place", "Track roles, salary revisions, and reviews without messy spreadsheets", "Standardise performance and growth conversations across your company"].map((item, index) => <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>)}
              </ul>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="gap-2" onClick={() => scrollToSection("pricing")}>
                  Sign In <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/team/sample">
                    View Sample Employee Profile
                  </Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Built by GlobalyHub for modern, growing teams.
              </p>
            </div>

            {/* Right - Hero Illustration */}
            <div className="relative animate-fade-in flex items-center justify-center" style={{
            animationDelay: "200ms"
          }}>
              <img src={heroIllustration} alt="TeamHub employee management illustration" className="w-full max-w-lg h-auto animate-float" />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Your People Are Growing.{" "}
              <span className="text-muted-foreground">
Your HR System Isn't.</span>
            </h2>
          </AnimatedSection>

          <div ref={problemSection.ref} className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            {/* Chaos side */}
            <div className="space-y-4">
              <AnimatedCard index={0} isVisible={problemSection.isVisible}>
                <h2 className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xl font-semibold mb-4">
                  <X className="h-5 w-5" /> The Problem
                </h2>
              </AnimatedCard>
              {["HR data scattered across Google Docs, Excel, chats and email", "Hard to see when someone was promoted and why", "Salary changes and previous agreements are unclear", "Performance reviews feel subjective and inconsistent", "Growth plans and training rarely tracked properly"].map((problem, index) => <AnimatedCard key={index} index={index + 1} isVisible={problemSection.isVisible}>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background border border-border h-full">
                    <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <X className="h-3 w-3 text-destructive" />
                    </div>
                    <p className="text-sm text-muted-foreground">{problem}</p>
                  </div>
                </AnimatedCard>)}
            </div>

            {/* Problem Illustration */}
            <AnimatedCard index={6} isVisible={problemSection.isVisible} className="hidden md:flex items-center justify-center">
              <img src={problemIllustration} alt="Problem illustration" className="w-full max-w-xl h-auto" />
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <CheckCircle2 className="h-4 w-4" /> The Solution
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              TeamHub Creates a Living Timeline{" "}
              <span className="text-muted-foreground">for Every Employee</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Centralise everything about a team member into one structured,
              always-up-to-date profile.
            </p>
          </AnimatedSection>

          <div ref={solutionSection.ref} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[{
            icon: Shield,
            title: "Core HR & Compliance",
            desc: "Personal data, PAN/tax, bank, PF/SSF, emergency contacts, schedule"
          }, {
            icon: TrendingUp,
            title: "Position & Salary Timeline",
            desc: "Role changes, managers, increments, dates, context and notes"
          }, {
            icon: Star,
            title: "Performance Reviews",
            desc: "Manager, peer, self, HR ratings, feedback, strengths, improvement areas"
          }, {
            icon: Target,
            title: "Growth Plans & Learning",
            desc: "Goals, responsibilities, skills backlog, training and milestones"
          }, {
            icon: Award,
            title: "Achievements & Recognition",
            desc: "Major wins and shoutouts attached to their profile"
          }, {
            icon: Zap,
            title: "SaaS Delivery",
            desc: "Subscription-based – no servers to manage, always up to date"
          }].map((item, index) => {
            const Icon = item.icon;
            return <AnimatedCard key={index} index={index} isVisible={solutionSection.isVisible}>
                  <Card className="p-6 h-full hover:shadow-lg transition-all duration-300 hover:border-primary/20 group">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </Card>
                </AnimatedCard>;
          })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              What You Can Do{" "}
              <span className="text-muted-foreground">With TeamHub</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powerful features designed for modern people management
            </p>
          </AnimatedSection>

          <div ref={featuresSection.ref} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
            const Icon = feature.icon;
            return <AnimatedCard key={index} index={index} isVisible={featuresSection.isVisible}>
                  <Card className="p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-primary/10 transition-all">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      {feature.title}
                    </h3>
                    <ul className="space-y-2 flex-1">
                      {feature.items.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          {item}
                        </li>)}
                    </ul>
                  </Card>
                </AnimatedCard>;
          })}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section id="who-its-for" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Designed for Growing,{" "}
              <span className="text-muted-foreground">
People-First Companies</span>
            </h2>
          </AnimatedSection>

          <div ref={whoSection.ref} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {whoItsFor.map((item, index) => {
            const Icon = item.icon;
            return <AnimatedCard key={index} index={index} isVisible={whoSection.isVisible}>
                  <Card className="p-6 text-center h-full hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="h-24 w-24 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                      <Icon className="h-12 w-12 text-primary group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex-1">
                      {item.description}
                    </p>
                  </Card>
                </AnimatedCard>;
          })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              From Spreadsheets to a Clean HR System{" "}
              <span className="text-muted-foreground">
in 3 Steps</span>
            </h2>
          </AnimatedSection>

          <div ref={howSection.ref} className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {howItWorks.map((item, index) => <AnimatedCard key={index} index={index} isVisible={howSection.isVisible} className="relative">
                {/* Connector line */}
                {index < howItWorks.length - 1 && <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10 -translate-x-1/2 z-0" />}
                <Card className="p-6 text-center h-full hover:shadow-lg transition-all duration-300 relative z-10 flex flex-col">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 text-primary-foreground text-2xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex-1">{item.description}</p>
                </Card>
              </AnimatedCard>)}
          </div>
        </div>
      </section>

      {/* Business Value Section */}
      <section id="value" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto mb-16">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Turn HR Data Into{" "}
                <span className="text-muted-foreground">Clear, Confident Decisions</span>
              </h2>
            </AnimatedSection>
            <AnimatedSection delay={200} className="flex justify-center">
              <img src={workAnniversary2Illustration} alt="Team celebration" className="w-full max-w-sm rounded-2xl" />
            </AnimatedSection>
          </div>

          <div ref={valueSection.ref} className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[{
            title: "Reduce Guesswork",
            desc: "Make informed decisions on promotions, increments and restructuring"
          }, {
            title: "Increase Fairness & Trust",
            desc: "Consistent review criteria across all teams and levels"
          }, {
            title: "Save Time",
            desc: "Less admin work for founders, HR and operations"
          }, {
            title: "Be Audit-Ready",
            desc: "Structured HR records for investors and compliance"
          }].map((item, index) => {
            return <AnimatedCard key={index} index={index} isVisible={valueSection.isVisible}>
                  <Card className="p-6 h-full hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </Card>
                </AnimatedCard>;
          })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto mb-16">
            <AnimatedSection className="flex justify-center md:order-2">
              <img src={frugalityIllustration} alt="Simple pricing" className="w-full max-w-xs rounded-2xl" />
            </AnimatedSection>
            <AnimatedSection className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Simple Subscription{" "}
                <span className="text-muted-foreground">for Modern Teams</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Subscription-based SaaS – monthly and yearly plans, pay as you
                grow.
              </p>
            </AnimatedSection>
          </div>

          <div ref={pricingSection.ref} className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {pricingPlans.map((plan, index) => <AnimatedCard key={index} index={index} isVisible={pricingSection.isVisible} className={plan.popular ? "md:-mt-4 md:mb-4" : ""}>
                <Card className={`p-6 relative h-full flex flex-col hover:shadow-xl transition-all duration-300 ${plan.popular ? "border-primary shadow-lg" : "hover:-translate-y-1"}`}>
                  {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      Most Popular
                    </div>}
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, i) => <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>)}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"} onClick={() => scrollToSection("pricing")}>
                    Sign In
                  </Button>
                </Card>
              </AnimatedCard>)}
          </div>

          <AnimatedSection className="text-center mt-12" delay={300}>
            <Button size="lg" className="gap-2">
              Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Frequently Asked{" "}
              <span className="text-muted-foreground">Questions</span>
            </h2>
          </AnimatedSection>

          <div ref={faqSection.ref} className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => <AnimatedCard key={index} index={index} isVisible={faqSection.isVisible}>
                  <AccordionItem value={`item-${index}`} className="bg-card border border-border rounded-lg px-6">
                    <AccordionTrigger className="text-left font-medium hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </AnimatedCard>)}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-foreground">TeamHub</span>
                <p className="text-xs text-muted-foreground">
                  HR timelines for growing teams
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <button onClick={() => scrollToSection("features")} className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection("pricing")} className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </button>
              <button onClick={() => scrollToSection("faq")} className="text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </button>
              <button onClick={() => scrollToSection("pricing")} className="text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </button>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
            </nav>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} TeamHub. Built by GlobalyHub. All
              rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;