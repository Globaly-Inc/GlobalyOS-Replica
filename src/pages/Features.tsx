import { WebsiteHeader, WebsiteFooter, FeatureCard, ComingSoonBadge } from "@/components/website";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  BookOpen,
  Brain,
  BarChart3,
  Smartphone,
  MessageSquare,
  QrCode,
  Bell,
  FileText,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  Award,
  PenTool,
  ArrowRight,
} from "lucide-react";

const featureCategories = [
  {
    title: "HRMS Module",
    description: "Complete human resource management for modern teams",
    features: [
      {
        icon: Users,
        title: "Employee Profiles",
        description: "Comprehensive profiles with personal info, employment details, documents, and career history all in one place.",
      },
      {
        icon: Calendar,
        title: "Leave Management",
        description: "Custom leave types, automated balance tracking, approval workflows, and calendar integration.",
      },
      {
        icon: QrCode,
        title: "Attendance Tracking",
        description: "QR code check-in with geolocation, automatic overtime calculation, and detailed attendance reports.",
      },
      {
        icon: TrendingUp,
        title: "Position Timeline",
        description: "Track career progression, salary history, and role changes with complete audit trails.",
      },
      {
        icon: BarChart3,
        title: "Performance Reviews",
        description: "Structured review cycles with AI-powered insights, goal tracking, and 360° feedback.",
      },
      {
        icon: Award,
        title: "KPIs & OKRs",
        description: "Set, track, and measure key performance indicators with team-wide dashboards and analytics.",
      },
    ],
  },
  {
    title: "Collaboration Module",
    description: "Keep your team connected and informed",
    features: [
      {
        icon: BookOpen,
        title: "Team Wiki",
        description: "Centralized knowledge base with folders, rich text editing, file attachments, and granular permissions.",
      },
      {
        icon: FileText,
        title: "Social Feed",
        description: "Share wins, give kudos, post announcements, and celebrate achievements as a team.",
      },
      {
        icon: Calendar,
        title: "Team Calendar",
        description: "Company holidays, birthdays, anniversaries, and events synced across the organization.",
      },
    ],
  },
  {
    title: "AI Module",
    description: "Intelligent features powered by your organization data",
    features: [
      {
        icon: Brain,
        title: "Ask AI Assistant",
        description: "Get instant answers about policies, people, and data. The AI knows your organization inside out.",
      },
      {
        icon: Zap,
        title: "AI Insights",
        description: "Automatic trend analysis, performance patterns, and actionable recommendations for managers.",
      },
      {
        icon: Clock,
        title: "Review Prep",
        description: "AI generates draft performance reviews based on goals, achievements, and feedback data.",
      },
      {
        icon: PenTool,
        title: "Writing Assist",
        description: "Get help writing announcements, policies, and documentation with AI suggestions.",
      },
    ],
  },
  {
    title: "Communication Module",
    description: "Real-time team messaging and collaboration",
    comingSoon: true,
    features: [
      {
        icon: MessageSquare,
        title: "Team Chat",
        description: "Direct messages, group chats, and channels. Share files, react with emoji, and stay connected.",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Mobile Module",
    description: "Full functionality on any device",
    highlighted: true,
    features: [
      {
        icon: Smartphone,
        title: "Progressive Web App",
        description: "Install GlobalyOS on any device. Works offline, sends push notifications, and feels native.",
        highlighted: true,
      },
      {
        icon: QrCode,
        title: "Mobile Check-in",
        description: "Scan QR codes to check in and out. Location-verified attendance from your phone.",
      },
      {
        icon: Bell,
        title: "Push Notifications",
        description: "Stay informed with real-time alerts for leave requests, mentions, and important updates.",
      },
    ],
  },
];

const securityFeatures = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Role-based access control, data encryption, and audit logs",
  },
  {
    icon: Users,
    title: "Multi-Tenancy",
    description: "Complete data isolation between organizations",
  },
  {
    icon: Zap,
    title: "99.9% Uptime",
    description: "Reliable infrastructure with automatic backups",
  },
];

export default function Features() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              run your team
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            From HR essentials to AI-powered insights, GlobalyOS has all the tools 
            your growing team needs in one unified platform.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            onClick={() => navigate("/signup")}
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, categoryIndex) => (
        <section
          key={categoryIndex}
          className={`py-16 px-4 sm:px-6 lg:px-8 ${
            categoryIndex % 2 === 1 ? "bg-muted/30" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {category.title}
                </h2>
                {category.comingSoon && <ComingSoonBadge />}
                {category.highlighted && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-success/10 text-success">
                    Available Now
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">{category.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.features.map((feature, featureIndex) => (
                <FeatureCard
                  key={featureIndex}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  comingSoon={feature.comingSoon}
                  highlighted={feature.highlighted}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Security Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Built for Security & Scale
            </h2>
            <p className="text-muted-foreground">
              Enterprise-grade security with the simplicity of modern SaaS
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-card border border-border text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to simplify your team operations?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              onClick={() => navigate("/signup")}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/pricing")}
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
