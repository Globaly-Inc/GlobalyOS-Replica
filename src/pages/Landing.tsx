import { useState } from "react";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WebsiteHeader, WebsiteFooter, FeatureCard, TestimonialCard } from "@/components/website";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import dashboardPreview from "@/assets/dashboard-preview.png";
import { Users, Calendar, BookOpen, Brain, BarChart3, Smartphone, CheckCircle2, ArrowRight, Sparkles, Clock, Shield, Zap, Award, UserPlus } from "lucide-react";
import { MobileAppShowcase } from "@/components/landing/MobileAppShowcase";
// Feature showcase mockup components
const PeopleManagementMockup = () => <div className="bg-background/80 rounded-xl p-4 border border-border/50">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl font-bold text-primary">SC</div>
      <div>
        <div className="font-semibold text-foreground">Sarah Chen</div>
        <div className="text-sm text-muted-foreground">Product Designer</div>
      </div>
      <div className="ml-auto px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">Active</div>
    </div>
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="bg-muted/50 rounded-lg p-2">
        <div className="text-lg font-bold text-foreground">8</div>
        <div className="text-xs text-muted-foreground">Direct Reports</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-2">
        <div className="text-lg font-bold text-foreground">4.2y</div>
        <div className="text-xs text-muted-foreground">Tenure</div>
      </div>
      <div className="bg-muted/50 rounded-lg p-2">
        <div className="text-lg font-bold text-foreground">12</div>
        <div className="text-xs text-muted-foreground">Kudos</div>
      </div>
    </div>
  </div>;
const LeaveAttendanceMockup = () => <div className="bg-background/80 rounded-xl p-4 border border-border/50">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <span className="font-medium text-foreground text-sm">Leave Balances</span>
      </div>
      <span className="text-xs text-muted-foreground">2024</span>
    </div>
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Annual Leave</span>
          <span className="font-medium text-foreground">18 days</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-primary rounded-full" />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Sick Leave</span>
          <span className="font-medium text-foreground">10 days</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-full bg-success rounded-full" />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Day in Lieu</span>
          <span className="font-medium text-foreground">3 days</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-accent rounded-full" />
        </div>
      </div>
    </div>
  </div>;
const WikiMockup = () => <div className="bg-background/80 rounded-xl p-4 border border-border/50">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
        <BookOpen className="w-4 h-4 text-amber-600" />
      </div>
      <span className="font-medium text-foreground text-sm">Knowledge Base</span>
    </div>
    <div className="space-y-2">
      {[{
      icon: "📁",
      name: "Getting Started",
      items: 5
    }, {
      icon: "📁",
      name: "Company Policies",
      items: 12
    }, {
      icon: "📄",
      name: "Employee Handbook",
      updated: "2d ago"
    }, {
      icon: "📄",
      name: "Leave Policy",
      updated: "1w ago"
    }].map((item, i) => <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <span>{item.icon}</span>
            <span className="text-sm text-foreground">{item.name}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {item.items ? `${item.items} items` : item.updated}
          </span>
        </div>)}
    </div>
  </div>;
const KPIMockup = () => <div className="bg-background/80 rounded-xl p-4 border border-border/50">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-violet-600" />
        </div>
        <span className="font-medium text-foreground text-sm">Q4 Performance</span>
      </div>
      <span className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">On Track</span>
    </div>
    <div className="mb-4">
      <div className="text-2xl font-bold text-foreground">$172,340</div>
      <div className="text-sm text-muted-foreground">Revenue Target</div>
    </div>
    <div className="flex items-end gap-1 h-16">
      {[40, 55, 45, 70, 60, 80, 75, 90, 85, 95, 88, 92].map((h, i) => <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{
      height: `${h}%`
    }}>
          <div className="w-full bg-primary rounded-t" style={{
        height: `${h * 0.7}%`
      }} />
        </div>)}
    </div>
    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
      <span>Jan</span>
      <span>Dec</span>
    </div>
  </div>;
const featureShowcases = [{
  title: "People Management",
  description: "Complete employee profiles, org charts, and team directory. Everything about your people in one place.",
  Mockup: PeopleManagementMockup,
  gradient: "from-blue-500/10 via-cyan-400/5 to-blue-500/10"
}, {
  title: "Leave & Attendance",
  description: "QR check-in, leave requests, balance tracking, and automated overtime calculations.",
  Mockup: LeaveAttendanceMockup,
  gradient: "from-emerald-500/10 via-teal-400/5 to-emerald-500/10"
}, {
  title: "Team Wiki",
  description: "Centralized knowledge base for policies, processes, and documentation your team can actually find.",
  Mockup: WikiMockup,
  gradient: "from-amber-500/10 via-orange-400/5 to-amber-500/10"
}, {
  title: "KPIs & Performance",
  description: "Track goals, measure performance, and run reviews with AI-powered insights and suggestions.",
  Mockup: KPIMockup,
  gradient: "from-violet-500/10 via-purple-400/5 to-violet-500/10"
}];
const testimonials = [{
  quote: "GlobalyOS replaced 4 different tools for us. Now everything from leave requests to team docs is in one place.",
  author: "Sarah Chen",
  role: "Operations Manager",
  company: "TechStart Inc"
}, {
  quote: "The AI assistant is a game-changer. I used to spend hours answering the same HR questions.",
  author: "Marcus Johnson",
  role: "HR Director",
  company: "GrowthCo"
}, {
  quote: "Finally, an HR tool that doesn't charge per seat. We scaled from 20 to 80 people and our bill stayed the same.",
  author: "Priya Patel",
  role: "CEO",
  company: "Elevate Studios"
}];
const painPoints = [{
  icon: Clock,
  title: "Scattered Information",
  description: "Employee data in spreadsheets, policies in shared drives, leave tracking in email threads."
}, {
  icon: Zap,
  title: "Manual HR Busywork",
  description: "Hours spent on repetitive tasks that should be automated but aren't."
}, {
  icon: Shield,
  title: "Zero Team Visibility",
  description: "No idea who's on leave, what goals look like, or how the team is really doing."
}, {
  icon: Award,
  title: "Recognition Gets Forgotten",
  description: "Team wins go unnoticed, achievements aren't celebrated, and great work disappears into the void."
}, {
  icon: BarChart3,
  title: "Performance Reviews Are a Nightmare",
  description: "Scrambling to remember what happened last quarter, writing reviews from scratch with no data."
}, {
  icon: UserPlus,
  title: "Onboarding Takes Forever",
  description: "New hires wait weeks for access to policies, org charts, and essential documentation they need."
}];

// Simple monochrome SVG icons
const LogoIcons = {
  Stripe: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" /></svg>,
  Notion: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.934-.56.934-1.166V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.746.327-.746.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" /></svg>,
  Slack: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>,
  Figma: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zM8.148 24c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.588 4.539zm-.001-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02c1.705 0 3.117-1.414 3.117-3.071v-2.968H8.147zM8.148 8.981c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981H8.148zm0-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V1.471H8.148zM15.852 15.019h-4.588v-6.038h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49v-2.942zm0-4.566h-3.117v3.095h3.117c.854 0 1.548-.693 1.548-1.548 0-.854-.694-1.547-1.548-1.547z" /></svg>,
  Linear: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2.886 10.47a10.013 10.013 0 0 0 10.644 10.644l-10.644-10.644zm-.65 2.462 8.832 8.832a10.053 10.053 0 0 1-8.832-8.832zM4.67 18.39l.97.97a10.073 10.073 0 0 1-1.632-1.064l.662-.662v.756zm2.244 1.67-.001-.97.755-.002.663.664a10.073 10.073 0 0 1-1.064-1.633l.97-.97h.756l.97.97a10.099 10.099 0 0 1-1.064 1.633l.664.663-.002.756-.97-.001a10.073 10.073 0 0 1-1.633-1.064l-.97.97h-.756l-.97-.97a10.073 10.073 0 0 1 1.633-1.064l-.001.97zm15.557-4.59L11.828 4.828l.707-.707L23.178 14.763l-.707.707zM12.535 4.121 4.121 12.535a10.053 10.053 0 0 1 8.414-8.414zm.698-.698A10.013 10.013 0 0 1 23.877 14.07L13.233 3.423z" /></svg>,
  Vercel: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z" /></svg>,
  Supabase: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.261.401-.562a1.04 1.04 0 0 0-.836-1.66z" /></svg>,
  Raycast: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6.044 6.044v5.478l-2.61 2.61V6.044H0v17.912h3.434v-3.434H0v-2.608l6.044-6.044v11.086h5.478L8.912 20.348v-5.478l6.044-6.044v-5.478l2.608-2.608h-5.478L9.348 3.478V0H0v3.478h5.478l.566.566v2.044-.044zm11.956 0V0h-3.478v6.044L18 .566V0h5.956v3.478h-3.434v2.566l-2.522-2.566v2.566l2.522 2.522v5.478L24 9.086V6.044h-6.044l.044.044v-.044zM6.044 24h11.912V12.044L6.044 24z" /></svg>,
  Loom: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18.75a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5z" /></svg>,
  Pitch: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6zm3 5h6a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z" /></svg>,
  Craft: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
  Miro: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.392 0H13.9L17 4.808 10.444 0H6.949l3.102 6.3L3.494 0H0l3.05 8.131L0 24h3.494L10.05 9.181 6.949 24h3.495L17 7.543 13.9 24h3.492L24 5.348V0h-3.05L17.392 0z" /></svg>,
  Airtable: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.992 0L1.2 4.268v8.873l10.792 4.318V8.59L22.8 4.268 11.992 0zM1.2 14.75v4.182l10.792 4.318V14.75L1.2 10.432v4.318zm11.992.05l10.608-4.318v8.436L13.192 23.25V14.8z" /></svg>,
  Webflow: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.803 6.015c-1.122 0-2.048.532-2.811 1.5.007-.007 1.012-1.5-1.03-1.5-2.015 0-4.206 1.538-5.305 3.877 0 0 .702-2.377-2.496-2.377C3.187 7.515 0 11.377 0 15.39c0 2.154 1.287 4.1 4.105 4.1 3.923 0 5.733-3.162 5.733-3.162s-.666 2.492 2.02 2.492c2.122 0 3.48-1.785 3.942-2.631v2.354h3.79v-6.69c0-3.446-1.787-5.838-1.787-5.838zm-13.8 10.746c-1.278 0-2.062-.77-2.062-2.131 0-2.269 1.548-4.723 3.6-4.723.978 0 1.616.508 1.886 1.07-.548 2.307-2.08 5.784-3.424 5.784zm9.42-.077c-.931 0-1.247-.985-1.247-.985.57-1.5 1.247-4.392 4.04-4.392.4 0 .725.108.978.293-.14 2.438-2.107 5.084-3.772 5.084z" /></svg>,
  Framer: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z" /></svg>,
  Descript: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-2 17H8V7h2v10zm6 0h-4V7h4a5 5 0 0 1 0 10z" /></svg>
};
const trustedLogos = [{
  name: "Stripe",
  Icon: LogoIcons.Stripe
}, {
  name: "Notion",
  Icon: LogoIcons.Notion
}, {
  name: "Slack",
  Icon: LogoIcons.Slack
}, {
  name: "Figma",
  Icon: LogoIcons.Figma
}, {
  name: "Linear",
  Icon: LogoIcons.Linear
}, {
  name: "Vercel",
  Icon: LogoIcons.Vercel
}, {
  name: "Supabase",
  Icon: LogoIcons.Supabase
}, {
  name: "Raycast",
  Icon: LogoIcons.Raycast
}];
const trustedLogosRow2 = [{
  name: "Loom",
  Icon: LogoIcons.Loom
}, {
  name: "Pitch",
  Icon: LogoIcons.Pitch
}, {
  name: "Craft",
  Icon: LogoIcons.Craft
}, {
  name: "Miro",
  Icon: LogoIcons.Miro
}, {
  name: "Airtable",
  Icon: LogoIcons.Airtable
}, {
  name: "Webflow",
  Icon: LogoIcons.Webflow
}, {
  name: "Framer",
  Icon: LogoIcons.Framer
}, {
  name: "Descript",
  Icon: LogoIcons.Descript
}];

// Dashboard Spotlight component with mouse-following reveal effect
const DashboardSpotlight = () => {
  const [mousePos, setMousePos] = useState({
    x: 50,
    y: 50
  });
  const [isHovering, setIsHovering] = useState(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    setMousePos({
      x,
      y
    });
  };
  return <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card relative cursor-none" onMouseMove={handleMouseMove} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      {/* Clear image (bottom layer) */}
      <img alt="GlobalyOS Team Overview Dashboard" className="w-full h-auto" src="/lovable-uploads/6624fdda-f2fc-48cc-aa31-3b73fd20fa90.png" width={1920} height={1088} fetchPriority="high" />
      
      {/* Blurred overlay with spotlight hole */}
      <div className="absolute inset-0 backdrop-blur-[3px] bg-white/5 dark:bg-black/10 pointer-events-none transition-opacity duration-300" style={{
      maskImage: isHovering ? `radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, transparent 0%, transparent 50%, black 100%)` : 'none',
      WebkitMaskImage: isHovering ? `radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, transparent 0%, transparent 50%, black 100%)` : 'none'
    }} />
    </div>;
};
const teamWords = ['Growing Teams', 'Modern Teams', 'Remote Teams', 'Ambitious Teams', 'Global Teams'];
export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { displayText: teamText } = useTypewriter({
    words: teamWords,
    typingSpeed: 100,
    deletingSpeed: 60,
    pauseDuration: 2000
  });
  return <div className="min-h-screen bg-background">
      <WebsiteHeader />

      {/* Hero */}
      <section className="pt-32 px-4 sm:px-6 lg:px-8 pb-[60px]">
        <div className="max-w-7xl mx-auto text-center pl-0 pt-[50px]">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="bg-gradient-to-r from-purple-500 via-red-500 to-green-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
              Now with AI-powered insights
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            The Smart Platform for{" "}
            <span className="inline-block min-w-[280px] sm:min-w-[340px] lg:min-w-[420px] text-left">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {teamText}
              </span>
              <span className="animate-pulse">|</span>
            </span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto sm:text-lg font-light">
            Stop juggling spreadsheets, scattered docs, and endless email threads. 
            GlobalyOS brings HR, knowledge, and team collaboration into one beautiful platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user && currentOrg ? (
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8" onClick={() => navigate(`/org/${currentOrg.slug}`)}>
                Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8" onClick={() => navigate("/signup")}>
                Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate("/features")}>See All Features</Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">No credit card required • Unlimited users • Setup in minutes</p>
        </div>
      </section>

      {/* Dashboard Preview with Floating Card */}
      <section className="px-4 sm:px-6 lg:px-8 pb-0">
        <div className="max-w-6xl mx-auto">
          {/* Wide gradient card with dashboard floating on top */}
          <div className="relative pb-12">
            {/* Background gradient card - extends below dashboard for floating effect */}
            <div className="absolute inset-x-0 top-24 bottom-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-3xl" />
            
            {/* Dashboard screenshot - floating above with spotlight reveal effect */}
            <div className="relative z-10 px-4 sm:px-8 mb-8">
              <DashboardSpotlight />
            </div>
          </div>
        </div>
      </section>

      {/* Logo Marquee - Trusted By */}
      <section className="py-16 overflow-hidden min-h-[240px]">
        <div className="text-center mb-10">
          <p className="text-muted-foreground text-sm font-medium">
            Trusted by 120,000+ businesses worldwide
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Row 1 - Left to Right */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
            
            <div className="flex animate-marquee whitespace-nowrap">
              {[...trustedLogos, ...trustedLogos, ...trustedLogos, ...trustedLogos].map((logo, i) => <div key={i} className="flex items-center gap-3 px-10 py-5 mx-3 rounded-lg bg-card border border-border shadow-sm shrink-0 min-w-[180px]">
                  <logo.Icon />
                  <span className="font-semibold text-base text-foreground tracking-tight">{logo.name}</span>
                </div>)}
            </div>
          </div>

          {/* Row 2 - Right to Left */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
            
            <div className="flex animate-marquee-reverse whitespace-nowrap">
              {[...trustedLogosRow2, ...trustedLogosRow2, ...trustedLogosRow2, ...trustedLogosRow2].map((logo, i) => <div key={i} className="flex items-center gap-3 px-10 py-5 mx-3 rounded-lg bg-card border border-border shadow-sm shrink-0 min-w-[180px]">
                  <logo.Icon />
                  <span className="font-semibold text-base text-foreground tracking-tight">{logo.name}</span>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Managing a growing team shouldn't feel like chaos</h2>
            <p className="text-lg text-muted-foreground">Sound familiar? You're not alone.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {painPoints.map((p, i) => <div key={i} className="p-6 rounded-2xl bg-card border border-border text-center">
                <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <p.icon className="w-7 h-7 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{p.title}</h3>
                <p className="text-muted-foreground text-sm">{p.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">One platform. Complete clarity.</h2>
            <p className="text-lg text-muted-foreground">GlobalyOS brings everything together so you can focus on what matters — your people.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {featureShowcases.map((feature, i) => <div key={i} className={`group bg-gradient-to-br ${feature.gradient} rounded-2xl border border-border p-6 
                  transition-all duration-500 ease-out
                  hover:-translate-y-2 
                  hover:shadow-2xl 
                  hover:border-primary/30
                  hover:bg-[length:200%_200%]
                  hover:animate-gradient-shift`}>
                <div className="mb-5">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <feature.Mockup />
              </div>)}
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Brain className="w-4 h-4" /> AI-Powered
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Meet your AI-powered HR assistant</h2>
            <p className="text-lg text-muted-foreground mb-6">Stop digging through docs and spreadsheets. Just ask.</p>
            
            {/* Scrolling suggested questions */}
            <div className="h-40 overflow-hidden relative">
              <div className="space-y-3">
                {["Who's on leave next week?", "What's our parental leave policy?", "Show me team performance trends", "Who has their anniversary this month?", "What are our company holidays?", "How many sick days do I have left?"].map((question, i) => <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <span className="text-foreground">"{question}"</span>
                  </div>)}
              </div>
            </div>
          </div>
          
          {/* AI Card with animated gradient border and floating particles */}
          <div className="relative">
            {/* Floating sparkle particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => <div key={i} className="absolute animate-float-particle" style={{
              left: `${10 + i % 4 * 25}%`,
              top: `${10 + Math.floor(i / 4) * 30}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + i % 3}s`
            }}>
                  <Sparkles className="w-4 h-4 text-primary/40 animate-twinkle" style={{
                animationDelay: `${i * 0.2}s`
              }} />
                </div>)}
            </div>
            
            {/* 3px Animated gradient border wrapper */}
            <div className="relative p-[3px] rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_200%] animate-border-rotate shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
              {/* Inner card */}
              <div className="bg-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Ask AI</p>
                    <p className="text-sm text-muted-foreground">Powered by your organization data</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="text-muted-foreground">You asked:</p>
                    <p className="text-foreground font-medium">Who has their work anniversary this month?</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 text-sm border border-primary/10">
                    <p className="text-foreground">3 team members have work anniversaries in December:</p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>• Sarah Chen - 3 years (Dec 5)</li>
                      <li>• Marcus Johnson - 1 year (Dec 12)</li>
                      <li>• Priya Patel - 5 years (Dec 18)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12"><h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Loved by teams everywhere</h2></div>
          <div className="grid md:grid-cols-3 gap-6">{testimonials.map((t, i) => <TestimonialCard key={i} {...t} />)}</div>
        </div>
      </section>

      {/* Mobile App Showcase */}
      <MobileAppShowcase />

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary to-accent">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to transform how your team works?</h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">Join hundreds of teams who've simplified their operations with GlobalyOS.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 text-lg px-8" onClick={() => navigate("/signup")}>Start Free Trial <ArrowRight className="w-5 h-5 ml-2" /></Button>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 text-lg px-8" onClick={() => navigate("/pricing")}>View Pricing</Button>
            </div>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>;
}