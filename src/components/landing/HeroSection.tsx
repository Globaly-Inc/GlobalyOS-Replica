import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useTypewriter } from "@/hooks/useTypewriter";
import { ArrowRight, Sparkles } from "lucide-react";

const teamWords = ['Growing Teams', 'Modern Teams', 'Remote Teams', 'Ambitious Teams', 'Global Teams'];

export const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { displayText: teamText } = useTypewriter({
    words: teamWords,
    typingSpeed: 100,
    deletingSpeed: 60,
    pauseDuration: 2000,
  });

  return (
    <section className="pt-32 px-4 sm:px-6 lg:px-8 pb-16">
      <div className="max-w-7xl mx-auto text-center pt-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
            The All-in-One Business Operating System
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
          The Smart Platform for{" "}
          <span className="inline-block min-w-[280px] sm:min-w-[340px] lg:min-w-[420px] text-left">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {teamText}
            </span>
            <span className="animate-pulse text-primary">|</span>
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto font-light leading-relaxed">
          HRMS, CRM, Marketing, Communication, Accounting & AI — all in one beautiful platform.
          Stop juggling tools. Start scaling your business.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user && currentOrg ? (
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8 h-14" onClick={() => navigate(`/org/${currentOrg.slug}`)}>
              Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8 h-14" onClick={() => navigate("/signup")}>
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
          <Button size="lg" variant="outline" className="text-lg px-8 h-14" onClick={() => navigate("/contact")}>
            Book a Demo
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-6">No credit card required • Unlimited users • Setup in minutes</p>
      </div>
    </section>
  );
};
