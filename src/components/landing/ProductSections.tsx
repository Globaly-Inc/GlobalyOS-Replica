import { 
  Users, Calendar, QrCode, TrendingUp, BarChart3, Award, Network, DollarSign,
  Target, Building2, Kanban, Activity, Mail,
  Megaphone, MessageSquareText, Inbox, Bot, FileText,
  MessageCircle, Heart, Bell, Trophy,
  Calculator, BookOpen as BookOpenIcon, FileSpreadsheet, Receipt,
  PieChart, ClipboardList, Phone, LineChart,
  Briefcase, UserPlus, UserMinus, ClipboardCheck, ArrowRight
} from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface ProductSectionProps {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
  features: { icon: React.ElementType; text: string }[];
  reversed?: boolean;
  mockup: React.ReactNode;
}

const ProductSection = ({ id, badge, badgeColor, title, description, features, reversed, mockup }: ProductSectionProps) => (
  <section id={`section-${id}`} className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-32">
    <div className={`max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center ${reversed ? 'lg:grid-flow-col-dense' : ''}`}>
      <div className={reversed ? 'lg:col-start-2' : ''}>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${badgeColor}`}>
          {badge}
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">{title}</h2>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{description}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{f.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={reversed ? 'lg:col-start-1' : ''}>
        {mockup}
      </div>
    </div>
  </section>
);

// Mockup components
const HRMSMockup = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4">
    <div className="flex items-center gap-4 pb-4 border-b border-border">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl font-bold text-primary">SC</div>
      <div>
        <div className="font-semibold text-foreground">Sarah Chen</div>
        <div className="text-sm text-muted-foreground">Product Designer • Design Team</div>
      </div>
      <div className="ml-auto px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">Active</div>
    </div>
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="bg-muted/50 rounded-xl p-3"><div className="text-xl font-bold text-foreground">8</div><div className="text-xs text-muted-foreground">Reports</div></div>
      <div className="bg-muted/50 rounded-xl p-3"><div className="text-xl font-bold text-foreground">4.2y</div><div className="text-xs text-muted-foreground">Tenure</div></div>
      <div className="bg-muted/50 rounded-xl p-3"><div className="text-xl font-bold text-foreground">92%</div><div className="text-xs text-muted-foreground">KPI Score</div></div>
    </div>
    <div className="space-y-2">
      {["Annual Leave: 18/21 days", "Sick Leave: 10/10 days", "Performance: Exceeding"].map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-lg bg-muted/30">
          <CheckCircle2 className="w-4 h-4 text-success" />{item}
        </div>
      ))}
    </div>
  </div>
);

const HiringPipelineMockup = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-5 space-y-3">
    <div className="flex items-center justify-between pb-3 border-b border-border">
      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground text-sm">Hiring Pipeline</span>
      </div>
      <span className="text-xs text-muted-foreground">4 Open Positions</span>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {[
        { stage: "Applied", count: 24, color: "bg-blue-500" },
        { stage: "Screening", count: 12, color: "bg-amber-500" },
        { stage: "Interview", count: 6, color: "bg-purple-500" },
        { stage: "Offer", count: 2, color: "bg-success" },
      ].map((s, i) => (
        <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
          <div className={`w-2 h-2 rounded-full ${s.color} mx-auto mb-1`} />
          <div className="text-lg font-bold text-foreground">{s.count}</div>
          <div className="text-[10px] text-muted-foreground">{s.stage}</div>
        </div>
      ))}
    </div>
    <div className="space-y-1.5">
      {[
        { name: "Alex Rivera", role: "Frontend Dev", stage: "Interview" },
        { name: "Priya Sharma", role: "Product Manager", stage: "Screening" },
      ].map((c, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{c.name.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <div className="text-xs font-medium text-foreground">{c.name}</div>
              <div className="text-[10px] text-muted-foreground">{c.role}</div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c.stage}</span>
        </div>
      ))}
    </div>
  </div>
);

const OnboardingWorkflowMockup = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-5 space-y-3">
    <div className="flex items-center justify-between pb-3 border-b border-border">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground text-sm">Onboarding Workflow</span>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">In Progress</span>
    </div>
    <div className="flex items-center gap-2 mb-1">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">AR</div>
      <div>
        <div className="text-sm font-medium text-foreground">Alex Rivera</div>
        <div className="text-[10px] text-muted-foreground">Starting Feb 24 • Frontend Developer</div>
      </div>
    </div>
    <div className="space-y-1.5">
      {[
        { task: "IT Setup & Equipment", done: true },
        { task: "HR Documents & Policies", done: true },
        { task: "Team Introduction", done: false },
        { task: "First Project Assignment", done: false },
      ].map((t, i) => (
        <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${t.done ? 'text-success' : 'text-muted-foreground/40'}`} />
          <span className={t.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{t.task}</span>
          {!t.done && <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground/40" />}
        </div>
      ))}
    </div>
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Progress</span>
        <span>50%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-primary transition-all" />
      </div>
    </div>
  </div>
);

const HRMSStackedMockup = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.15 });

  return (
    <div ref={ref} className="relative" style={{ minHeight: '520px' }}>
      {/* Card 3 - Back: Onboarding Workflow */}
      <div
        className="absolute top-0 left-0 right-0 transition-all duration-700 ease-out"
        style={{
          transitionDelay: '400ms',
          opacity: isVisible ? 0.7 : 0,
          transform: isVisible
            ? 'translateY(40px) scale(0.92)'
            : 'translateY(80px) scale(0.92)',
          zIndex: 1,
        }}
      >
        <OnboardingWorkflowMockup />
      </div>

      {/* Card 2 - Middle: Hiring Pipeline */}
      <div
        className="absolute top-0 left-0 right-0 transition-all duration-700 ease-out"
        style={{
          transitionDelay: '200ms',
          opacity: isVisible ? 0.85 : 0,
          transform: isVisible
            ? 'translateY(20px) scale(0.96)'
            : 'translateY(60px) scale(0.96)',
          zIndex: 2,
        }}
      >
        <HiringPipelineMockup />
      </div>

      {/* Card 1 - Front: Employee Profile */}
      <div
        className="relative transition-all duration-700 ease-out"
        style={{
          transitionDelay: '0ms',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
          zIndex: 3,
        }}
      >
        <HRMSMockup />
      </div>
    </div>
  );
};

const CRMMockup = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4">
    <div className="flex items-center justify-between pb-4 border-b border-border">
      <span className="font-semibold text-foreground">Deals Pipeline</span>
      <span className="text-sm text-muted-foreground">Q4 2025</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        { stage: "Qualified", count: 12, value: "$48K", color: "bg-blue-500" },
        { stage: "Proposal", count: 7, value: "$85K", color: "bg-amber-500" },
        { stage: "Closed", count: 5, value: "$124K", color: "bg-success" },
      ].map((s, i) => (
        <div key={i} className="text-center p-3 rounded-xl bg-muted/50">
          <div className={`w-2 h-2 rounded-full ${s.color} mx-auto mb-2`} />
          <div className="text-xs text-muted-foreground">{s.stage}</div>
          <div className="text-lg font-bold text-foreground">{s.count}</div>
          <div className="text-xs text-muted-foreground">{s.value}</div>
        </div>
      ))}
    </div>
    <div className="space-y-2">
      {[
        { name: "Acme Corp", value: "$32,000", status: "Hot" },
        { name: "TechVentures", value: "$18,500", status: "Warm" },
        { name: "GlobalRetail", value: "$54,000", status: "Hot" },
      ].map((deal, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <span className="text-sm font-medium text-foreground">{deal.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{deal.value}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${deal.status === 'Hot' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>{deal.status}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MarketingMockup = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4">
    <div className="flex items-center justify-between pb-4 border-b border-border">
      <span className="font-semibold text-foreground">Campaign Performance</span>
      <span className="px-2 py-1 rounded-full bg-success/10 text-success text-xs">Live</span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 rounded-xl bg-muted/50 text-center">
        <div className="text-2xl font-bold text-foreground">2,450</div>
        <div className="text-xs text-muted-foreground">Emails Sent</div>
      </div>
      <div className="p-3 rounded-xl bg-muted/50 text-center">
        <div className="text-2xl font-bold text-foreground">34.2%</div>
        <div className="text-xs text-muted-foreground">Open Rate</div>
      </div>
      <div className="p-3 rounded-xl bg-muted/50 text-center">
        <div className="text-2xl font-bold text-foreground">892</div>
        <div className="text-xs text-muted-foreground">WhatsApp Sent</div>
      </div>
      <div className="p-3 rounded-xl bg-muted/50 text-center">
        <div className="text-2xl font-bold text-foreground">18</div>
        <div className="text-xs text-muted-foreground">Form Responses</div>
      </div>
    </div>
    <div className="flex items-end gap-1 h-16">
      {[30, 45, 55, 40, 65, 70, 85, 60, 75, 90, 80, 95].map((h, i) => (
        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary to-accent" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

const CommunicationMockup = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4">
    <div className="flex items-center justify-between pb-4 border-b border-border">
      <span className="font-semibold text-foreground">Team Feed</span>
      <span className="text-sm text-muted-foreground">Today</span>
    </div>
    <div className="space-y-3">
      {[
        { type: "🏆", user: "Sarah C.", text: "Won the Q4 Innovation Award!", tag: "Win", color: "bg-warning/10 text-warning" },
        { type: "👏", user: "Marcus J.", text: "shipped the new onboarding flow", tag: "Kudos", color: "bg-primary/10 text-primary" },
        { type: "📢", user: "HR Team", text: "Holiday schedule for 2026 is live", tag: "Announcement", color: "bg-accent/10 text-accent" },
      ].map((item, i) => (
        <div key={i} className="p-3 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <span>{item.type}</span>
            <span className="text-sm font-medium text-foreground">{item.user}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${item.color}`}>{item.tag}</span>
          </div>
          <p className="text-sm text-muted-foreground ml-7">{item.text}</p>
        </div>
      ))}
    </div>
  </div>
);

const AccountingMockup = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4">
    <div className="flex items-center justify-between pb-4 border-b border-border">
      <span className="font-semibold text-foreground">Financial Overview</span>
      <span className="text-sm text-muted-foreground">Dec 2025</span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 rounded-xl bg-success/5 border border-success/20">
        <div className="text-xs text-muted-foreground">Revenue</div>
        <div className="text-xl font-bold text-success">$284,500</div>
      </div>
      <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
        <div className="text-xs text-muted-foreground">Expenses</div>
        <div className="text-xl font-bold text-destructive">$196,200</div>
      </div>
    </div>
    <div className="space-y-2">
      {["5 Invoices Pending • $42,300", "3 Bills Due This Week • $18,900", "Monthly P&L Report Ready"].map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-lg bg-muted/30">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />{item}
        </div>
      ))}
    </div>
  </div>
);

const ReportingMockup = () => (
  <div className="bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4">
    <div className="text-center pb-4 border-b border-border">
      <span className="font-semibold text-foreground">Analytics Dashboard</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Team Size", value: "86", change: "+12%" },
        { label: "Avg. KPI", value: "87%", change: "+5%" },
        { label: "Attendance", value: "96%", change: "+2%" },
      ].map((s, i) => (
        <div key={i} className="text-center p-3 rounded-xl bg-muted/50">
          <div className="text-lg font-bold text-foreground">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="text-xs text-success mt-1">{s.change}</div>
        </div>
      ))}
    </div>
    <div className="flex items-end gap-1 h-20">
      {[55, 62, 58, 70, 65, 78, 72, 85, 80, 92, 88, 95].map((h, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }}>
          <div className="w-full h-full bg-primary/20 rounded-t relative">
            <div className="absolute bottom-0 w-full bg-primary rounded-t" style={{ height: `${h * 0.7}%` }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ProductSections = () => (
  <>
    <ProductSection
      id="hrms"
      badge="HRMS"
      badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      title="Complete HR Management, Simplified"
      description="From employee profiles to performance reviews — manage your entire workforce lifecycle in one place."
       features={[
        { icon: Users, text: "Employee Profiles & Directory" },
        { icon: Calendar, text: "Leave & Attendance Tracking" },
        { icon: QrCode, text: "QR Code Check-in" },
        { icon: TrendingUp, text: "Position Timeline & History" },
        { icon: BarChart3, text: "Performance Reviews" },
        { icon: Award, text: "KPIs & OKRs Dashboard" },
        { icon: Network, text: "Org Chart & Hierarchy" },
        { icon: DollarSign, text: "Payroll Management" },
        { icon: Briefcase, text: "Hiring & Recruitment" },
        { icon: UserPlus, text: "Onboarding Workflows" },
        { icon: UserMinus, text: "Offboarding Workflows" },
      ]}
      mockup={<HRMSStackedMockup />}
    />

    <div className="border-t border-border/50" />

    <ProductSection
      id="crm"
      badge="CRM"
      badgeColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      title="Close More Deals, Build Lasting Relationships"
      description="Manage your entire sales pipeline from first contact to closed deal with built-in activity tracking."
      features={[
        { icon: Target, text: "Contact & Lead Management" },
        { icon: Building2, text: "Company Profiles" },
        { icon: Kanban, text: "Visual Deals Pipeline" },
        { icon: Activity, text: "Activity Tracking" },
        { icon: Mail, text: "Email Integration" },
        { icon: Phone, text: "Call Logging & Analytics" },
      ]}
      reversed
      mockup={<CRMMockup />}
    />

    <div className="border-t border-border/50" />

    <ProductSection
      id="marketing"
      badge="Marketing"
      badgeColor="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      title="Reach Your Audience, Every Channel"
      description="Run email campaigns, WhatsApp outreach, manage your omnichannel inbox, and let AI handle the responses."
      features={[
        { icon: Megaphone, text: "Email Campaigns" },
        { icon: MessageSquareText, text: "WhatsApp Messaging" },
        { icon: Inbox, text: "Omnichannel Inbox" },
        { icon: Bot, text: "AI Auto-Responder" },
        { icon: FileText, text: "Smart Forms & Surveys" },
        { icon: LineChart, text: "Campaign Analytics" },
      ]}
      mockup={<MarketingMockup />}
    />

    <div className="border-t border-border/50" />

    <ProductSection
      id="communication"
      badge="Communication"
      badgeColor="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
      title="Keep Your Team Connected & Engaged"
      description="Team chat, social feed with posts, wins, kudos, announcements, and real-time notifications."
      features={[
        { icon: MessageCircle, text: "Team Chat & Channels" },
        { icon: Trophy, text: "Wins & Achievements" },
        { icon: Heart, text: "Kudos & Recognition" },
        { icon: Bell, text: "Announcements & Notifications" },
      ]}
      reversed
      mockup={<CommunicationMockup />}
    />

    <div className="border-t border-border/50" />

    <ProductSection
      id="accounting"
      badge="Accounting"
      badgeColor="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      title="Financial Clarity at Your Fingertips"
      description="Chart of accounts, journal entries, invoicing, bills, and financial reporting — all connected."
      features={[
        { icon: Calculator, text: "Chart of Accounts" },
        { icon: BookOpenIcon, text: "Journal Entries" },
        { icon: Receipt, text: "Invoicing & Bills" },
        { icon: FileSpreadsheet, text: "Financial Reports" },
      ]}
      mockup={<AccountingMockup />}
    />

    <div className="border-t border-border/50" />

    <ProductSection
      id="reporting"
      badge="Reporting"
      badgeColor="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
      title="Data-Driven Decisions, Effortlessly"
      description="Team dashboards, KPI analytics, attendance reports, leave reports, CRM analytics, and call analytics."
      features={[
        { icon: PieChart, text: "Team Dashboards" },
        { icon: BarChart3, text: "KPI & OKR Analytics" },
        { icon: ClipboardList, text: "Attendance & Leave Reports" },
        { icon: LineChart, text: "CRM & Sales Analytics" },
        { icon: Phone, text: "Call Analytics" },
        { icon: TrendingUp, text: "Trend Analysis" },
      ]}
      reversed
      mockup={<ReportingMockup />}
    />
  </>
);
