import { Brain, Sparkles, CheckCircle2, PenTool, Bot, Search } from "lucide-react";

export const AIPoweredSection = () => (
  <section id="section-ai" className="py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 to-accent/5 scroll-mt-32">
    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider mb-4">
          <Brain className="w-4 h-4" /> AI-Powered
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
          AI That Knows Your Business
        </h2>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          From drafting performance reviews to answering policy questions — AI is woven into every module.
        </p>
        <div className="space-y-4">
          {[
            { icon: Search, text: "Ask AI anything about your organization data" },
            { icon: PenTool, text: "AI-drafted performance reviews & feedback" },
            { icon: Bot, text: "AI auto-responder for marketing & inbox" },
            { icon: Brain, text: "Wiki Q&A powered by your knowledge base" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-foreground font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute animate-float-particle" style={{
              left: `${10 + (i % 4) * 25}%`,
              top: `${10 + Math.floor(i / 4) * 30}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}>
              <Sparkles className="w-4 h-4 text-primary/40 animate-twinkle" style={{ animationDelay: `${i * 0.2}s` }} />
            </div>
          ))}
        </div>

        <div className="relative p-[3px] rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_200%] animate-border-rotate shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
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
                <p className="text-foreground">3 team members have work anniversaries in February:</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Sarah Chen — 3 years (Feb 5)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Marcus Johnson — 1 year (Feb 12)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Priya Patel — 5 years (Feb 18)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
