import { Users, Target, Megaphone, MessageCircle, Calculator, BarChart3, Brain, BookOpen } from "lucide-react";

const pills = [
  { id: "hrms", label: "HRMS", icon: Users },
  { id: "crm", label: "CRM", icon: Target },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "communication", label: "Communication", icon: MessageCircle },
  { id: "accounting", label: "Accounting", icon: Calculator },
  { id: "reporting", label: "Reporting", icon: BarChart3 },
  { id: "ai", label: "AI", icon: Brain },
  { id: "wiki", label: "Wiki", icon: BookOpen },
];

export const ProductPillNav = () => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 sticky top-16 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {pills.map((pill) => (
            <button
              key={pill.id}
              onClick={() => scrollToSection(pill.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium 
                bg-muted/60 text-muted-foreground hover:bg-primary hover:text-primary-foreground
                transition-all duration-200 border border-border/50 hover:border-primary hover:shadow-md"
            >
              <pill.icon className="w-4 h-4" />
              {pill.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
