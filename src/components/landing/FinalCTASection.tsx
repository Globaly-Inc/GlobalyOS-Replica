import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const FinalCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="p-16 rounded-3xl bg-gradient-to-br from-primary to-accent relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 relative">
            Ready to transform how your team works?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto relative">
            Join thousands of teams who've simplified their operations with GlobalyOS.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 text-lg px-8 h-14"
              onClick={() => navigate("/signup")}
            >
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 text-lg px-8 h-14"
              onClick={() => navigate("/pricing")}
            >
              View Pricing
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
