import { WebsiteHeader, WebsiteFooter, FeatureCard } from "@/components/website";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Users, Calendar, BookOpen, Brain, BarChart3, Smartphone, MessageSquare, QrCode, Bell, FileText,
  Shield, Zap, TrendingUp, Clock, Award, PenTool, ArrowRight, Target, Building2, Kanban, Activity,
  Mail, Megaphone, MessageSquareText, Inbox, Bot, Calculator, Receipt, FileSpreadsheet, Phone,
  Heart, Trophy, Lock, LineChart, PieChart
} from "lucide-react";

const featureCategories = [
  {
    title: "HRMS",
    description: "Complete human resource management for modern teams",
    features: [
      { icon: Users, title: "Employee Profiles", description: "Comprehensive profiles with personal info, employment details, documents, and career history." },
      { icon: Calendar, title: "Leave Management", description: "Custom leave types, automated balance tracking, approval workflows, and calendar integration." },
      { icon: QrCode, title: "Attendance Tracking", description: "QR code check-in with geolocation, automatic overtime calculation, and detailed reports." },
      { icon: TrendingUp, title: "Position Timeline", description: "Track career progression, salary history, and role changes with complete audit trails." },
      { icon: BarChart3, title: "Performance Reviews", description: "Structured review cycles with AI-powered insights, goal tracking, and 360° feedback." },
      { icon: Award, title: "KPIs & OKRs", description: "Set, track, and measure key performance indicators with team-wide dashboards." },
    ],
  },
  {
    title: "CRM",
    description: "Manage your sales pipeline and customer relationships",
    features: [
      { icon: Target, title: "Contact Management", description: "Centralized contact and lead database with custom fields, tags, and segments." },
      { icon: Building2, title: "Company Profiles", description: "Detailed company records with linked contacts, deals, and activity history." },
      { icon: Kanban, title: "Deals Pipeline", description: "Visual Kanban board for tracking deals through customizable sales stages." },
      { icon: Activity, title: "Activity Tracking", description: "Log calls, meetings, emails, and tasks. Never lose track of a customer interaction." },
      { icon: Mail, title: "Email Integration", description: "Send and receive emails directly within the CRM. Full email history on every contact." },
      { icon: Phone, title: "Call Analytics", description: "Built-in telephony with call recording, analytics, and automatic logging." },
    ],
  },
  {
    title: "Marketing",
    description: "Reach your audience across every channel",
    features: [
      { icon: Megaphone, title: "Email Campaigns", description: "Design, send, and track email campaigns with templates and analytics." },
      { icon: MessageSquareText, title: "WhatsApp Messaging", description: "Send bulk WhatsApp messages and manage conversations at scale." },
      { icon: Inbox, title: "Omnichannel Inbox", description: "Unified inbox for email, WhatsApp, and social media messages." },
      { icon: Bot, title: "AI Auto-Responder", description: "Intelligent AI that responds to common queries automatically." },
      { icon: FileText, title: "Smart Forms", description: "Create forms and surveys to capture leads and feedback." },
      { icon: LineChart, title: "Campaign Analytics", description: "Track open rates, click rates, conversions, and ROI across channels." },
    ],
  },
  {
    title: "Communication",
    description: "Keep your team connected and engaged",
    features: [
      { icon: MessageSquare, title: "Team Chat", description: "Direct messages, group chats, and channels. Share files, react with emoji, and stay connected." },
      { icon: Trophy, title: "Wins & Achievements", description: "Celebrate team wins and milestones publicly across the organization." },
      { icon: Heart, title: "Kudos & Recognition", description: "Give and receive recognition. Build a culture of appreciation." },
      { icon: Bell, title: "Announcements", description: "Company-wide announcements with read receipts and targeted distribution." },
    ],
  },
  {
    title: "Accounting",
    description: "Financial management built into your workflow",
    features: [
      { icon: Calculator, title: "Chart of Accounts", description: "Flexible chart of accounts with multi-currency and multi-ledger support." },
      { icon: BookOpen, title: "Journal Entries", description: "Create, approve, and post journal entries with full audit trail." },
      { icon: Receipt, title: "Invoicing & Bills", description: "Send invoices, track bills, record payments, and manage cash flow." },
      { icon: FileSpreadsheet, title: "Financial Reports", description: "P&L, balance sheet, trial balance, and custom financial reports." },
    ],
  },
  {
    title: "AI & Intelligence",
    description: "AI woven into every module",
    features: [
      { icon: Brain, title: "Ask AI Assistant", description: "Get instant answers about policies, people, and data across your organization." },
      { icon: Zap, title: "AI Insights", description: "Automatic trend analysis, performance patterns, and actionable recommendations." },
      { icon: Clock, title: "Review Prep", description: "AI generates draft performance reviews based on goals and feedback data." },
      { icon: PenTool, title: "Writing Assist", description: "AI helps write announcements, policies, and documentation." },
    ],
  },
  {
    title: "Wiki & Knowledge Base",
    description: "Your team's single source of truth",
    features: [
      { icon: BookOpen, title: "Rich Text Wiki", description: "Full-featured editor with folders, pages, embeds, and version history." },
      { icon: Lock, title: "Granular Permissions", description: "Control who can view and edit content at folder and page level." },
      { icon: Brain, title: "AI-Powered Q&A", description: "Ask questions and get answers from your knowledge base instantly." },
    ],
  },
  {
    title: "Reporting & Analytics",
    description: "Data-driven decisions across every module",
    features: [
      { icon: PieChart, title: "Team Dashboards", description: "Real-time dashboards for team size, attendance, and engagement." },
      { icon: BarChart3, title: "KPI Analytics", description: "Track KPI progress, trends, and team-wide performance." },
      { icon: TrendingUp, title: "Attendance Reports", description: "Detailed attendance, overtime, and leave utilization reports." },
      { icon: LineChart, title: "CRM & Sales Analytics", description: "Pipeline metrics, conversion rates, and revenue forecasting." },
    ],
  },
  {
    title: "Mobile",
    description: "Full functionality on any device",
    highlighted: true,
    features: [
      { icon: Smartphone, title: "Progressive Web App", description: "Install GlobalyOS on any device. Works offline with push notifications.", highlighted: true },
      { icon: QrCode, title: "Mobile Check-in", description: "Scan QR codes to check in and out with location verification." },
      { icon: Bell, title: "Push Notifications", description: "Real-time alerts for leave requests, mentions, and important updates." },
    ],
  },
];

const securityFeatures = [
  { icon: Shield, title: "Enterprise Security", description: "Role-based access control, data encryption, and audit logs" },
  { icon: Users, title: "Multi-Tenancy", description: "Complete data isolation between organizations" },
  { icon: Zap, title: "99.9% Uptime", description: "Reliable infrastructure with automatic backups" },
];

export default function Features() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />

      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              run your business
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            HRMS, CRM, Marketing, Communication, Accounting, Wiki & AI — all the tools your growing team needs in one unified platform.
          </p>
          <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 h-14 text-lg px-8" onClick={() => navigate("/signup")}>
            Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {featureCategories.map((category, categoryIndex) => (
        <section key={categoryIndex} className={`py-20 px-4 sm:px-6 lg:px-8 ${categoryIndex % 2 === 1 ? "bg-muted/30" : ""}`}>
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{category.title}</h2>
                {category.highlighted && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-success/10 text-success">Available Now</span>
                )}
              </div>
              <p className="text-muted-foreground text-lg">{category.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.features.map((feature, featureIndex) => (
                <FeatureCard key={featureIndex} icon={feature.icon} title={feature.title} description={feature.description} highlighted={feature.highlighted} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Built for Security & Scale</h2>
            <p className="text-muted-foreground">Enterprise-grade security with the simplicity of modern SaaS</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="p-6 rounded-2xl bg-card border border-border text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Ready to simplify your operations?</h2>
          <p className="text-lg text-muted-foreground mb-8">Start your free trial today. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 h-14 text-lg px-8" onClick={() => navigate("/signup")}>
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 text-lg px-8" onClick={() => navigate("/pricing")}>View Pricing</Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
