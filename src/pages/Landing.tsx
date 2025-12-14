import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WebsiteHeader, WebsiteFooter, FeatureCard, TestimonialCard } from "@/components/website";
import { useAuth } from "@/hooks/useAuth";
import dashboardPreview from "@/assets/dashboard-preview.png";
import {
  Users, Calendar, BookOpen, Brain, BarChart3, Smartphone,
  CheckCircle2, ArrowRight, Sparkles, Clock, Shield, Zap,
} from "lucide-react";

const features = [
  { icon: Users, title: "People Management", description: "Complete employee profiles, org charts, and team directory. Everything about your people in one place." },
  { icon: Calendar, title: "Leave & Attendance", description: "QR check-in, leave requests, balance tracking, and automated overtime calculations." },
  { icon: BookOpen, title: "Team Wiki", description: "Centralized knowledge base for policies, processes, and documentation your team can actually find." },
  { icon: Brain, title: "AI Assistant", description: "Ask anything about your team, policies, or data. Get instant answers from your organization's knowledge." },
  { icon: BarChart3, title: "KPIs & Reviews", description: "Track goals, measure performance, and run reviews with AI-powered insights and suggestions." },
  { icon: Smartphone, title: "Mobile App", description: "Full-featured PWA works on any device. Check in, request leave, and stay connected on the go.", highlighted: true },
];

const testimonials = [
  { quote: "GlobalyOS replaced 4 different tools for us. Now everything from leave requests to team docs is in one place.", author: "Sarah Chen", role: "Operations Manager", company: "TechStart Inc" },
  { quote: "The AI assistant is a game-changer. I used to spend hours answering the same HR questions.", author: "Marcus Johnson", role: "HR Director", company: "GrowthCo" },
  { quote: "Finally, an HR tool that doesn't charge per seat. We scaled from 20 to 80 people and our bill stayed the same.", author: "Priya Patel", role: "CEO", company: "Elevate Studios" },
];

const painPoints = [
  { icon: Clock, title: "Scattered Information", description: "Employee data in spreadsheets, policies in shared drives, leave tracking in email threads." },
  { icon: Zap, title: "Manual HR Busywork", description: "Hours spent on repetitive tasks that should be automated but aren't." },
  { icon: Shield, title: "Zero Team Visibility", description: "No idea who's on leave, what goals look like, or how the team is really doing." },
];

const trustedLogos = [
  { name: "TechStart", initial: "T" },
  { name: "GrowthCo", initial: "G" },
  { name: "Elevate", initial: "E" },
  { name: "Innovate", initial: "I" },
  { name: "Synergy", initial: "S" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Now with AI-powered insights
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            The All-in-One Platform for{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Growing Teams</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stop juggling spreadsheets, scattered docs, and endless email threads. 
            GlobalyOS brings HR, knowledge, and team collaboration into one beautiful platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8" onClick={() => navigate("/auth")}>
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate("/features")}>See All Features</Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">No credit card required • Unlimited users • Setup in minutes</p>
        </div>
      </section>

      {/* Dashboard Preview with Floating Card */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Wide gradient card with dashboard floating on top */}
          <div className="relative">
            {/* Background gradient card */}
            <div className="absolute inset-x-0 top-24 bottom-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-3xl" />
            
            {/* Dashboard screenshot - floating above */}
            <div className="relative z-10 px-4 sm:px-8">
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
                <img 
                  src={dashboardPreview} 
                  alt="GlobalyOS Team Overview Dashboard" 
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Trusted by logos - positioned on the gradient card */}
            <div className="relative z-10 pt-12 pb-8">
              <p className="text-center text-sm text-muted-foreground mb-6">Join our community of 120,000+ businesses</p>
              <div className="flex flex-wrap items-center justify-center gap-8 px-4">
                {trustedLogos.map((logo, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-full border border-border/50 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                      {logo.initial}
                    </div>
                    <span className="text-foreground font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
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
          <div className="grid md:grid-cols-3 gap-8">
            {painPoints.map((p, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border text-center">
                <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <p.icon className="w-7 h-7 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{p.title}</h3>
                <p className="text-muted-foreground text-sm">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">One platform. Complete clarity.</h2>
            <p className="text-lg text-muted-foreground">GlobalyOS brings everything together so you can focus on what matters — your people.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => <FeatureCard key={i} icon={f.icon} title={f.title} description={f.description} highlighted={f.highlighted} />)}
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Brain className="w-4 h-4" /> AI-Powered
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Meet your AI-powered HR assistant</h2>
            <p className="text-lg text-muted-foreground mb-6">Stop digging through docs and spreadsheets. Just ask.</p>
            <ul className="space-y-3">
              {["Who's on leave next week?", "What's our parental leave policy?", "Show me team performance trends"].map((ex, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <span className="text-foreground">"{ex}"</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div><p className="font-semibold text-foreground">Ask AI</p><p className="text-sm text-muted-foreground">Powered by your organization data</p></div>
            </div>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm"><p className="text-muted-foreground">You asked:</p><p className="text-foreground font-medium">Who has their work anniversary this month?</p></div>
              <div className="bg-primary/5 rounded-lg p-3 text-sm border border-primary/10">
                <p className="text-foreground">3 team members have work anniversaries in December:</p>
                <ul className="mt-2 space-y-1 text-muted-foreground"><li>• Sarah Chen - 3 years (Dec 5)</li><li>• Marcus Johnson - 1 year (Dec 12)</li><li>• Priya Patel - 5 years (Dec 18)</li></ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Simple pricing that scales with you</h2>
          <p className="text-lg text-muted-foreground mb-4">Unlimited users on every plan. No per-seat surprises.</p>
          <div className="inline-block bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-8">💡 A 50-person team on competitors costs $750-1,500/mo. With us? Just $299.</div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-card border border-border"><h3 className="text-lg font-semibold mb-2">Starter</h3><p className="text-3xl font-bold mb-4">$149<span className="text-base font-normal text-muted-foreground">/mo</span></p><p className="text-sm text-muted-foreground">For small teams getting organized</p></div>
            <div className="p-6 rounded-2xl bg-gradient-to-b from-primary/5 to-accent/5 border-2 border-primary relative"><span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-primary to-accent text-white">Most Popular</span><h3 className="text-lg font-semibold mb-2">Growth</h3><p className="text-3xl font-bold mb-4">$299<span className="text-base font-normal text-muted-foreground">/mo</span></p><p className="text-sm text-muted-foreground">For growing teams that need everything</p></div>
            <div className="p-6 rounded-2xl bg-card border border-border"><h3 className="text-lg font-semibold mb-2">Enterprise</h3><p className="text-3xl font-bold mb-4">Custom</p><p className="text-sm text-muted-foreground">For larger organizations</p></div>
          </div>
          <Button variant="link" className="mt-6 text-primary" onClick={() => navigate("/pricing")}>View full pricing details <ArrowRight className="w-4 h-4 ml-1" /></Button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12"><h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Loved by teams everywhere</h2></div>
          <div className="grid md:grid-cols-3 gap-6">{testimonials.map((t, i) => <TestimonialCard key={i} {...t} />)}</div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary to-accent">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to transform how your team works?</h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">Join hundreds of teams who've simplified their operations with GlobalyOS.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 text-lg px-8" onClick={() => navigate("/auth")}>Start Free Trial <ArrowRight className="w-5 h-5 ml-2" /></Button>
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 text-lg px-8" onClick={() => navigate("/pricing")}>View Pricing</Button>
            </div>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
