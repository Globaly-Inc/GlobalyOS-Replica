import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Users,
  Briefcase,
  TrendingUp,
  Award,
  FileText,
  Target,
  Building2,
  Rocket,
  Globe,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Star,
  Calendar,
  DollarSign,
  GraduationCap,
  Shield,
  Clock,
  Zap,
  Menu,
  X,
} from "lucide-react";

// Timeline data for the interactive animation
const timelineItems = [
  {
    id: 1,
    type: "hire",
    title: "Joined as Software Engineer",
    date: "Jan 2022",
    icon: Briefcase,
    color: "bg-emerald-500",
    details: "Started in Engineering team, Mumbai office",
  },
  {
    id: 2,
    type: "salary",
    title: "Salary Revision",
    date: "Jul 2022",
    icon: DollarSign,
    color: "bg-blue-500",
    details: "Annual increment: 15% raise",
  },
  {
    id: 3,
    type: "review",
    title: "Performance Review",
    date: "Dec 2022",
    icon: Star,
    color: "bg-amber-500",
    details: "Rating: Exceeds Expectations",
  },
  {
    id: 4,
    type: "promotion",
    title: "Promoted to Senior Engineer",
    date: "Mar 2023",
    icon: TrendingUp,
    color: "bg-purple-500",
    details: "Team lead for 3 engineers",
  },
  {
    id: 5,
    type: "training",
    title: "AWS Certification",
    date: "Aug 2023",
    icon: GraduationCap,
    color: "bg-cyan-500",
    details: "Completed Solutions Architect",
  },
  {
    id: 6,
    type: "award",
    title: "Star Performer Award",
    date: "Dec 2023",
    icon: Award,
    color: "bg-pink-500",
    details: "Q4 Recognition",
  },
];

const features = [
  {
    icon: Users,
    title: "360° Employee Profiles",
    items: [
      "Complete personal and employment data",
      "Contracts, documents & compliance info",
      "Work schedule and status",
    ],
  },
  {
    icon: TrendingUp,
    title: "Role & Compensation History",
    items: [
      "Timeline of positions, departments and reporting lines",
      "Salary history with increments and dates",
      "Leadership notes on key changes",
    ],
  },
  {
    icon: Star,
    title: "Performance Review Engine",
    items: [
      "Templates for manager, peer, self and HR reviews",
      "Rating scales and comment boxes",
      "Historical comparison across review cycles",
    ],
  },
  {
    icon: Target,
    title: "Career & Growth Planning",
    items: [
      "Clear role responsibilities and expectations",
      "Skills to develop and priorities",
      "Linked trainings and learning outcomes",
    ],
  },
  {
    icon: FileText,
    title: "HR Notes & Documentation",
    items: [
      "HR remarks and agreements",
      "Onboarding/offboarding checklists",
      "Attachments under the employee profile",
    ],
  },
];

const whoItsFor = [
  {
    icon: Rocket,
    title: "Startup Founders & CEOs",
    description: "Teams of 10–200+ employees scaling fast",
  },
  {
    icon: Users,
    title: "People & Culture / HR Managers",
    description: "Streamline HR operations and documentation",
  },
  {
    icon: Building2,
    title: "Operations Leaders",
    description: "Structured data for better decisions",
  },
  {
    icon: Globe,
    title: "Remote & Hybrid Teams",
    description: "Centralized HR regardless of location",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Set Up Your Workspace",
    description:
      "Create your organisation in TeamHub, define roles, departments and basic settings.",
  },
  {
    step: "02",
    title: "Import & Build Profiles",
    description:
      "Import existing employee records and enrich them with position history, salary changes and past reviews.",
  },
  {
    step: "03",
    title: "Run Reviews & Plan Growth",
    description:
      "Use TeamHub templates to run review cycles, document decisions and update each employee's growth plan.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    description: "For small teams getting serious about HR structure.",
    features: [
      "Up to 25 employees",
      "Employee profiles & timelines",
      "Basic document storage",
      "Email support",
    ],
  },
  {
    name: "Growth",
    description: "For growing companies needing full reviews & growth tracking.",
    features: [
      "Unlimited employees",
      "Performance review templates",
      "Growth planning tools",
      "Priority support",
      "Custom fields",
    ],
    popular: true,
  },
  {
    name: "Scale",
    description: "For larger teams needing custom onboarding and advanced reporting.",
    features: [
      "Everything in Growth",
      "Advanced analytics",
      "Custom onboarding flows",
      "API access",
      "Dedicated success manager",
    ],
  },
];

const faqs = [
  {
    question: "Is TeamHub hard to set up?",
    answer:
      "Not at all. Most teams are up and running within a day. You can import existing employee data from spreadsheets, and our onboarding wizard guides you through setting up departments, roles, and review templates.",
  },
  {
    question: "Can we customise review forms and roles?",
    answer:
      "Yes! TeamHub is designed to be flexible. You can create custom review templates, define your own rating scales, add custom fields to employee profiles, and configure role permissions to match your organization's structure.",
  },
  {
    question: "Is our data secure?",
    answer:
      "Absolutely. We use enterprise-grade encryption, regular security audits, and comply with data protection standards. Your data is hosted on secure cloud infrastructure with automatic backups and disaster recovery.",
  },
  {
    question: "Can we change or cancel our subscription?",
    answer:
      "Yes, you can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the start of your next billing cycle. We also offer a 30-day money-back guarantee for new subscriptions.",
  },
  {
    question: "Who is TeamHub best for?",
    answer:
      "TeamHub is ideal for growing companies (10-500+ employees) who want to move beyond spreadsheets and build a proper HR foundation. It's especially valuable for teams that care about fair, transparent people decisions.",
  },
];

const Landing = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTimelineItem, setActiveTimelineItem] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Handle scroll for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-animate timeline
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimelineItem((prev) => (prev + 1) % timelineItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  const navItems = [
    { label: "Home", id: "hero" },
    { label: "Features", id: "features" },
    { label: "How It Works", id: "how-it-works" },
    { label: "Pricing", id: "pricing" },
    { label: "FAQ", id: "faq" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TeamHub</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-3">
            <Button onClick={() => scrollToSection("pricing")}>
              Book a Demo
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border">
            <nav className="container px-4 py-4 flex flex-col gap-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <Button
                className="mt-2"
                onClick={() => scrollToSection("pricing")}
              >
                Book a Demo
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center pt-16 overflow-hidden"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="container relative mx-auto px-4 md:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <div className="max-w-xl">
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
                {[
                  "See the complete journey of each team member in one place",
                  "Track roles, salary revisions, and reviews without messy spreadsheets",
                  "Standardise performance and growth conversations across your company",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => scrollToSection("pricing")}
                >
                  Book a Demo <ArrowRight className="h-4 w-4" />
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

            {/* Right - Interactive Timeline Card */}
            <div className="relative" ref={timelineRef}>
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl opacity-50" />
              <Card className="relative bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl rounded-2xl overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-lg">
                      AK
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Amit Kumar
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Senior Software Engineer • Engineering
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-foreground">
                      Employee Timeline
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      2 years journey
                    </span>
                  </div>

                  <div className="relative space-y-1">
                    {/* Timeline line */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />

                    {timelineItems.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = index === activeTimelineItem;

                      return (
                        <div
                          key={item.id}
                          className={`relative flex items-start gap-4 p-3 rounded-lg transition-all duration-500 cursor-pointer ${
                            isActive
                              ? "bg-primary/5 scale-[1.02]"
                              : "hover:bg-muted/50"
                          }`}
                          onMouseEnter={() => setActiveTimelineItem(index)}
                        >
                          {/* Icon */}
                          <div
                            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ${
                              isActive
                                ? `${item.color} text-white shadow-lg`
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5
                                className={`text-sm font-medium truncate transition-colors duration-300 ${
                                  isActive
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {item.title}
                              </h5>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {item.date}
                              </span>
                            </div>
                            <p
                              className={`text-xs mt-0.5 transition-all duration-500 ${
                                isActive
                                  ? "text-muted-foreground opacity-100 max-h-10"
                                  : "opacity-0 max-h-0 overflow-hidden"
                              }`}
                            >
                              {item.details}
                            </p>
                          </div>

                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <ChevronRight className="h-4 w-4 text-primary animate-pulse" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last updated: Dec 2023</span>
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Secure & Private
                    </span>
                  </div>
                </div>
              </Card>
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
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Your People Are Growing.{" "}
              <span className="text-muted-foreground">
                Your HR System Isn't.
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            {/* Chaos side */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
                <X className="h-4 w-4" /> The Problem
              </div>
              {[
                "HR data scattered across Google Docs, Excel, chats and email",
                "Hard to see when someone was promoted and why",
                "Salary changes and previous agreements are unclear",
                "Performance reviews feel subjective and inconsistent",
                "Growth plans and training rarely tracked properly",
              ].map((problem, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg bg-background border border-border"
                >
                  <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <X className="h-3 w-3 text-destructive" />
                  </div>
                  <p className="text-muted-foreground">{problem}</p>
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-destructive/20 to-primary/20 blur-3xl" />
                <ArrowRight className="relative h-16 w-16 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <CheckCircle2 className="h-4 w-4" /> The Solution
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              TeamHub Creates a Living Timeline for Every Employee
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Centralise everything about a team member into one structured,
              always-up-to-date profile.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Core HR & Compliance",
                desc: "Personal data, PAN/tax, bank, PF/SSF, emergency contacts, schedule",
              },
              {
                icon: TrendingUp,
                title: "Position & Salary Timeline",
                desc: "Role changes, managers, increments, dates, context and notes",
              },
              {
                icon: Star,
                title: "Performance Reviews",
                desc: "Manager, peer, self, HR ratings, feedback, strengths, improvement areas",
              },
              {
                icon: Target,
                title: "Growth Plans & Learning",
                desc: "Goals, responsibilities, skills backlog, training and milestones",
              },
              {
                icon: Award,
                title: "Achievements & Recognition",
                desc: "Major wins and shoutouts attached to their profile",
              },
              {
                icon: Zap,
                title: "SaaS Delivery",
                desc: "Subscription-based – no servers to manage, always up to date",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={index}
                  className="p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/20 group"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              What You Can Do With TeamHub
            </h2>
            <p className="mt-4 text-muted-foreground">
              Powerful features designed for modern people management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:from-primary/30 group-hover:to-primary/10 transition-all">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {feature.title}
                  </h3>
                  <ul className="space-y-2">
                    {feature.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section id="who-its-for" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Designed for Growing, People-First Companies
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {whoItsFor.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={index}
                  className="p-6 text-center hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              From Spreadsheets to a Clean HR System in 3 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                {/* Connector line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10 -translate-x-1/2" />
                )}
                <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 text-primary-foreground text-3xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Value Section */}
      <section id="value" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Turn HR Data Into Clear, Confident Decisions
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Target,
                title: "Reduce Guesswork",
                desc: "Make informed decisions on promotions, increments and restructuring",
              },
              {
                icon: Users,
                title: "Increase Fairness & Trust",
                desc: "Consistent review criteria across all teams and levels",
              },
              {
                icon: Clock,
                title: "Save Time",
                desc: "Less admin work for founders, HR and operations",
              },
              {
                icon: Shield,
                title: "Be Audit-Ready",
                desc: "Structured HR records for investors and compliance",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={index}
                  className="p-6 flex items-start gap-4 hover:shadow-lg transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Simple Subscription for Modern Teams
            </h2>
            <p className="mt-4 text-muted-foreground">
              Subscription-based SaaS – monthly and yearly plans, pay as you
              grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`p-8 relative hover:shadow-xl transition-all duration-300 ${
                  plan.popular
                    ? "border-primary shadow-lg scale-105"
                    : "hover:-translate-y-1"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => scrollToSection("pricing")}
                >
                  Book a Demo
                </Button>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="gap-2">
              Book a Demo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-lg px-6"
                >
                  <AccordionTrigger className="text-left font-medium hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
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
              <button
                onClick={() => scrollToSection("features")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Book a Demo
              </button>
              <Link
                to="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
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
    </div>
  );
};

export default Landing;
