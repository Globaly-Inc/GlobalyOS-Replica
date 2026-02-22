import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Shield, Home, Users, Calendar, Clock, BarChart3, BookOpen, Star, TrendingUp, Bell, Settings, MessageSquare, CheckSquare, Briefcase, GitBranch, Wallet, Bot, UserPlus, MessageCircle, Phone, Inbox, FileText, Calculator, type LucideIcon } from "lucide-react";

interface FeatureEntry {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  route?: string;
  category: "core" | "flagged" | "missing";
}

// Master registry of ALL implemented features
const MASTER_FEATURE_REGISTRY: FeatureEntry[] = [
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

  // Feature-flagged (currently registered)
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
];

// The current AVAILABLE_FEATURES names from the page (source of truth for what's registered)
const REGISTERED_FLAG_NAMES = [
  "chat", "tasks", "crm", "workflows", "payroll", "ask-ai", "hiring",
  "whatsapp", "calls", "omnichannel_inbox", "ai_responder", "telephony",
  "forms", "accounting", "client_portal",
];

function runAudit() {
  const coreFeatures = MASTER_FEATURE_REGISTRY.filter((f) => f.category === "core");
  const registeredFeatures = MASTER_FEATURE_REGISTRY.filter(
    (f) => f.category === "flagged" && REGISTERED_FLAG_NAMES.includes(f.name)
  );
  const missingFeatures = MASTER_FEATURE_REGISTRY.filter(
    (f) => f.category === "flagged" && !REGISTERED_FLAG_NAMES.includes(f.name)
  );

  // Also check if there are entries in REGISTERED_FLAG_NAMES not in the registry
  const unknownFlags = REGISTERED_FLAG_NAMES.filter(
    (name) => !MASTER_FEATURE_REGISTRY.some((f) => f.name === name)
  );

  return { coreFeatures, registeredFeatures, missingFeatures, unknownFlags };
}

interface FeatureAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeatureAuditDialog = ({ open, onOpenChange }: FeatureAuditDialogProps) => {
  const [activeTab, setActiveTab] = useState("summary");
  const audit = runAudit();

  const totalFeatures = MASTER_FEATURE_REGISTRY.length;
  const hasMissing = audit.missingFeatures.length > 0 || audit.unknownFlags.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Feature Audit Report
          </DialogTitle>
          <DialogDescription>
            Comparing master feature registry ({totalFeatures} features) against registered feature flags ({REGISTERED_FLAG_NAMES.length} flags)
          </DialogDescription>
        </DialogHeader>

        {/* Summary Banner */}
        <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${hasMissing ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
          {hasMissing ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {audit.missingFeatures.length} missing feature(s) and {audit.unknownFlags.length} unregistered flag(s) detected
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All features are properly registered. No gaps found.
            </>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              Core ({audit.coreFeatures.length})
            </TabsTrigger>
            <TabsTrigger value="registered" className="flex-1">
              Registered ({audit.registeredFeatures.length})
            </TabsTrigger>
            <TabsTrigger value="missing" className="flex-1">
              Missing ({audit.missingFeatures.length + audit.unknownFlags.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="max-h-[400px] overflow-y-auto space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Always-on features that don't require feature flags. Available to all organizations by default.
            </p>
            {audit.coreFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">Always On</Badge>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="registered" className="max-h-[400px] overflow-y-auto space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Features controlled by Super Admin feature flags. These can be enabled/disabled per organization.
            </p>
            {audit.registeredFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Registered</span>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="missing" className="max-h-[400px] overflow-y-auto space-y-2">
            {audit.missingFeatures.length === 0 && audit.unknownFlags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
                <p className="text-sm font-medium">No missing features</p>
                <p className="text-xs">All implemented features are properly registered.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Features that exist in the system but are not in the feature flags list. These need developer action to add.
                </p>
                {audit.missingFeatures.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.name} className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10">
                        <Icon className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{f.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-[10px] text-destructive font-medium">Missing</span>
                      </div>
                    </div>
                  );
                })}
                {audit.unknownFlags.map((name) => (
                  <div key={name} className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">Flag registered but not in master feature registry</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 shrink-0">Unknown</Badge>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
