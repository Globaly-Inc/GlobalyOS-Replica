import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { ProductPillNav } from "@/components/landing/ProductPillNav";
import { ProductSections } from "@/components/landing/ProductSections";
import { AIPoweredSection } from "@/components/landing/AIPoweredSection";
import { WikiSection } from "@/components/landing/WikiSection";
import { MobileAppShowcase } from "@/components/landing/MobileAppShowcase";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />
      <HeroSection />
      <TrustedBySection />
      <ProductPillNav />
      <ProductSections />
      <AIPoweredSection />
      <WikiSection />
      <MobileAppShowcase />
      <SecuritySection />
      <TestimonialsSection />
      <FinalCTASection />
      <WebsiteFooter />
    </div>
  );
}
