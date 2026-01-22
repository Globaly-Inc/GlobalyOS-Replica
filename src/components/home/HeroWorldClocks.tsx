import { WorldClockCards } from "@/components/WorldClockCards";

interface HeroWorldClocksProps {
  officeCountries?: string[];
}

export function HeroWorldClocks({ officeCountries = [] }: HeroWorldClocksProps) {
  return (
    <div className="hero-world-clocks">
      {/* CSS overrides for hero banner dark theme */}
      <style>{`
        .hero-world-clocks .px-4 {
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .hero-world-clocks .pb-4 {
          padding-bottom: 0 !important;
        }
        .hero-world-clocks [class*="bg-card"] {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
        .hero-world-clocks [class*="text-muted-foreground"] {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .hero-world-clocks .text-lg,
        .hero-world-clocks [class*="font-semibold"] {
          color: rgba(255, 255, 255, 0.95) !important;
        }
        .hero-world-clocks [class*="border-dashed"] {
          border-color: rgba(255, 255, 255, 0.3) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .hero-world-clocks [class*="border-primary"] {
          border-color: rgba(255, 255, 255, 0.4) !important;
        }
        .hero-world-clocks [class*="bg-primary"] {
          background: rgba(255, 255, 255, 0.15) !important;
        }
        .hero-world-clocks [class*="text-primary"] {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .hero-world-clocks button:hover {
          background: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
      <WorldClockCards officeCountries={officeCountries} />
    </div>
  );
}
