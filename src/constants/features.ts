import {
  Home, Users, Calendar, Clock, BarChart3, BookOpen, Star, TrendingUp, Bell, Settings,
  MessageSquare, CheckSquare, Briefcase, GitBranch, Wallet, Bot, UserPlus, MessageCircle,
  Phone, Inbox, FileText, Calculator, type LucideIcon,
} from "lucide-react";

export interface FeatureEntry {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  route?: string;
  category: "core" | "flagged";
}

export const MASTER_FEATURE_REGISTRY: FeatureEntry[] = [
  // Core HRMS - always on, no flag needed
  { name: "home", label: "Home / Dashboard", description: "Main dashboard with announcements, posts, and activity feed", icon: Home, route: "/", category: "core" },
  { name: "team_directory", label: "Team Directory", description: "Employee profiles, directory, and search", icon: Users, route: "/team", category: "core" },
  { name: "team_calendar", label: "Team Calendar", description: "Shared calendar with events and holidays", icon: Calendar, route: "/calendar", category: "core" },
  { name: "leave_management", label: "Leave Management", description: "Leave requests, approvals, and balances", icon: Clock, route: "/leave", category: "core" },
  { name: "attendance", label: "Attendance Tracking", description: "Clock-in/out, timesheets, and attendance reports", icon: Clock, route: "/attendance", category: "core" },
  { name: "kpis_okrs", label: "KPIs / OKRs", description: "Key performance indicators and objectives tracking", icon: BarChart3, route: "/kpis", category: "core" },
  { name: "wiki", label: "Wiki / Knowledge Base", description: "Shared knowledge base with folders, pages, and AI Q&A", icon: BookOpen, route: "/wiki", category: "core" },
  { name: "performance_reviews", label: "Performance Reviews", description: "Review cycles, feedback, and evaluations", icon: Star, route: "/performance", category: "core" },
  { name: "org_chart", label: "Org Chart", description: "Organization hierarchy visualization", icon: Users, route: "/org-chart", category: "core" },
  { name: "growth", label: "Growth", description: "Career growth plans, skills, and development tracking", icon: TrendingUp, route: "/growth", category: "core" },
  { name: "notifications", label: "Notifications", description: "System notifications and alerts", icon: Bell, route: "/notifications", category: "core" },
  { name: "settings", label: "Settings", description: "Organization and user settings", icon: Settings, route: "/settings", category: "core" },

  // Feature-flagged (controllable per org)
  { name: "chat", label: "Team Chat", description: "Real-time messaging with spaces and direct messages", icon: MessageSquare, route: "/chat", category: "flagged" },
  { name: "tasks", label: "Tasks", description: "Task management and assignments", icon: CheckSquare, route: "/tasks", category: "flagged" },
  { name: "crm", label: "CRM", description: "Customer relationship management", icon: Briefcase, route: "/crm", category: "flagged" },
  { name: "workflows", label: "Workflows", description: "Onboarding & offboarding workflows", icon: GitBranch, route: "/workflows", category: "flagged" },
  { name: "payroll", label: "Payroll", description: "Salary processing, payslips, and tax calculations", icon: Wallet, route: "/payroll", category: "flagged" },
  { name: "ask-ai", label: "Ask AI", description: "AI-powered assistant for questions and insights", icon: Bot, route: "/ask-ai", category: "flagged" },
  { name: "hiring", label: "Hiring", description: "Job vacancies, applicant tracking, and recruitment", icon: UserPlus, route: "/hiring", category: "flagged" },
  { name: "whatsapp", label: "WhatsApp", description: "WhatsApp inbox, broadcasts, and automations", icon: MessageCircle, route: "/whatsapp", category: "flagged" },
  { name: "calls", label: "Calls", description: "Voice & video calls via Sendbird", icon: Phone, route: "/calls", category: "flagged" },
  { name: "omnichannel_inbox", label: "Omni-Channel Inbox", description: "Unified inbox for WhatsApp, Telegram, Messenger & more", icon: Inbox, route: "/inbox", category: "flagged" },
  { name: "ai_responder", label: "AI Auto-Responder", description: "AI-powered auto-replies with RAG knowledge retrieval", icon: Bot, route: "/ai-responder", category: "flagged" },
  { name: "telephony", label: "Telephony", description: "Twilio-powered SMS, outbound calling, IVR, and number provisioning", icon: Phone, route: "/telephony", category: "flagged" },
  { name: "forms", label: "Forms", description: "Form builder and submissions", icon: FileText, route: "/forms", category: "flagged" },
  { name: "accounting", label: "Accounting", description: "Ledgers, invoicing, and financial management", icon: Calculator, route: "/accounting", category: "flagged" },
  { name: "client_portal", label: "Client Portal", description: "Client self-service portal", icon: Users, route: "/client-portal", category: "flagged" },
  { name: "quotations", label: "Quotations", description: "Quote-to-invoice management with multi-option quotations, service/fee configuration, tax handling, public approval links, PDF generation, templates, and AI-powered pricing", icon: FileText, route: "/crm/quotations", category: "flagged" },
];

export const CORE_FEATURES = MASTER_FEATURE_REGISTRY.filter((f) => f.category === "core");
export const FLAGGED_FEATURES = MASTER_FEATURE_REGISTRY.filter((f) => f.category === "flagged");
export const REGISTERED_FLAG_NAMES = FLAGGED_FEATURES.map((f) => f.name);
