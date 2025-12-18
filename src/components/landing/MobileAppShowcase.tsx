import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Smartphone, Bell, QrCode, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

// Import mobile app screenshots
import appDashboard from "@/assets/mobile-app/app-dashboard.png";
import appPeople from "@/assets/mobile-app/app-people.png";
import appLeave from "@/assets/mobile-app/app-leave.png";
import appKpis from "@/assets/mobile-app/app-kpis.png";
import appAskAi from "@/assets/mobile-app/app-ask-ai.png";

const mobileFeatures = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Your day at a glance',
    image: appDashboard,
  },
  {
    id: 'people',
    title: 'People Management',
    subtitle: 'Team directory & profiles',
    image: appPeople,
  },
  {
    id: 'leave',
    title: 'Leave & Attendance',
    subtitle: 'QR check-in & balance tracking',
    image: appLeave,
  },
  {
    id: 'kpis',
    title: 'KPIs & Performance',
    subtitle: 'Track goals on the go',
    image: appKpis,
  },
  {
    id: 'ask-ai',
    title: 'AI Assistant',
    subtitle: 'Ask anything about your team',
    image: appAskAi,
  },
];

const mobileHighlights = [
  { icon: Smartphone, title: "Instant Access", desc: "Full features in your pocket" },
  { icon: Bell, title: "Push Notifications", desc: "Never miss important updates" },
  { icon: QrCode, title: "QR Check-in", desc: "One-tap attendance tracking" },
  { icon: Shield, title: "Secure & Fast", desc: "Biometric login supported" },
];

// Phone Frame Component
const PhoneFrame = ({ children, isActive }: { children: React.ReactNode; isActive?: boolean }) => (
  <div 
    className={`
      relative w-[200px] h-[410px] sm:w-[240px] sm:h-[490px] mx-auto
      bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-1.5
      shadow-2xl transition-all duration-500
      ${isActive ? 'scale-105 animate-phone-float' : 'scale-95 opacity-70'}
    `}
  >
    {/* Notch */}
    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
    
    {/* Screen */}
    <div className="relative w-full h-full bg-white rounded-[2rem] overflow-hidden">
      {children}
    </div>
  </div>
);

export const MobileAppShowcase = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Track current slide
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Auto-play carousel
  useEffect(() => {
    if (!api || isHovered) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [api, isHovered]);

  const scrollTo = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  return (
    <section 
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary via-primary to-primary-dark overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium mb-4 backdrop-blur-sm">
            <Smartphone className="w-4 h-4" />
            Available on iOS & Android
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Take GlobalyOS everywhere you go
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Full access to your team's world from your pocket. 
            Check in, request leave, track KPIs, and ask AI — all from your phone.
          </p>
        </div>

        {/* Phone Carousel */}
        <div className="relative mb-12">
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full max-w-4xl mx-auto"
            setApi={setApi}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {mobileFeatures.map((feature, index) => (
                <CarouselItem 
                  key={feature.id} 
                  className="pl-2 md:pl-4 basis-[70%] sm:basis-1/2 lg:basis-1/3"
                >
                  <div className="py-6">
                    <PhoneFrame isActive={current === index}>
                      <img 
                        src={feature.image} 
                        alt={feature.title}
                        className="w-full h-full object-cover object-top"
                      />
                    </PhoneFrame>
                    <div className="text-center mt-4">
                      <h4 className="font-semibold text-white">{feature.title}</h4>
                      <p className="text-sm text-white/70">{feature.subtitle}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {mobileFeatures.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${current === index 
                    ? 'w-6 bg-white' 
                    : 'bg-white/40 hover:bg-white/60'}
                `}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {mobileHighlights.map((h, i) => (
            <div 
              key={i}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
            >
              <h.icon className="w-8 h-8 text-white mx-auto mb-2" />
              <h4 className="font-semibold text-white text-sm">{h.title}</h4>
              <p className="text-xs text-white/70">{h.desc}</p>
            </div>
          ))}
        </div>

        {/* App Store Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="bg-white text-primary hover:bg-white/90 gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Download on App Store
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            Get it on Google Play
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MobileAppShowcase;
