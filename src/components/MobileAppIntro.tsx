/**
 * Mobile App Intro Splash Screens
 * Shows 3-4 feature highlight slides for logged-out iOS users on first launch
 */

import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Smartphone, Users, Bell, Sparkles, ArrowRight } from 'lucide-react';

// Import mobile app screenshots
import appDashboard from '@/assets/mobile-app/app-dashboard.png';
import appPeople from '@/assets/mobile-app/app-people.png';
import appLeave from '@/assets/mobile-app/app-leave.png';

interface MobileAppIntroProps {
  onComplete: () => void;
}

interface Slide {
  id: string;
  title: string;
  description: string;
  image: string | null;
  icon: React.ReactNode;
  bgClass: string;
}

const slides: Slide[] = [
  {
    id: 'welcome',
    title: 'Welcome to GlobalyOS',
    description: 'Your team\'s operating system — everything you need in one place',
    image: null,
    icon: <Sparkles className="h-16 w-16 text-white" />,
    bgClass: 'bg-gradient-to-br from-primary via-primary/90 to-primary/70',
  },
  {
    id: 'checkin',
    title: 'Check In Instantly',
    description: 'QR code attendance, remote check-in, and location tracking with just one tap',
    image: appDashboard,
    icon: <Smartphone className="h-12 w-12 text-primary" />,
    bgClass: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700',
  },
  {
    id: 'connect',
    title: 'Stay Connected',
    description: 'Team feed, kudos, announcements — never miss what matters to your team',
    image: appPeople,
    icon: <Users className="h-12 w-12 text-primary" />,
    bgClass: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700',
  },
  {
    id: 'manage',
    title: 'Manage On The Go',
    description: 'Leave requests, KPI tracking, and AI assistant — all in your pocket',
    image: appLeave,
    icon: <Bell className="h-12 w-12 text-primary" />,
    bgClass: 'bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600',
  },
];

// Phone frame component for screenshots
const PhoneFrame = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "relative mx-auto w-[200px] h-[400px] rounded-[2.5rem] border-[8px] border-white/20 bg-black/30 backdrop-blur-sm shadow-2xl overflow-hidden",
    className
  )}>
    {/* Notch */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
    {/* Screen content */}
    <div className="w-full h-full overflow-hidden rounded-[1.8rem]">
      {children}
    </div>
  </div>
);

const MobileAppIntro = ({ onComplete }: MobileAppIntroProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleComplete = () => {
    localStorage.setItem('hasSeenMobileIntro', 'true');
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (emblaApi?.canScrollNext()) {
      emblaApi.scrollNext();
    } else {
      handleComplete();
    }
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Skip button - always visible except on last slide */}
      {!isLastSlide && (
        <button
          onClick={handleSkip}
          className="absolute top-12 right-6 z-50 text-white/80 hover:text-white text-sm font-medium transition-colors"
        >
          Skip
        </button>
      )}

      {/* Carousel */}
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={cn(
                "flex-[0_0_100%] min-w-0 h-full flex flex-col items-center justify-center px-8 py-16 transition-all duration-500",
                slide.bgClass
              )}
            >
              {/* Content */}
              <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto">
                {/* Visual - either phone with screenshot or icon */}
                {slide.image ? (
                  <PhoneFrame className="mb-8 animate-phone-float">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  </PhoneFrame>
                ) : (
                  <div className="mb-12 p-8 rounded-full bg-white/10 backdrop-blur-sm animate-float">
                    {slide.icon}
                  </div>
                )}

                {/* Text */}
                <h1 className="text-2xl font-bold text-white text-center mb-3">
                  {slide.title}
                </h1>
                <p className="text-white/80 text-center text-base leading-relaxed">
                  {slide.description}
                </p>
              </div>

              {/* Bottom section */}
              <div className="w-full max-w-sm mx-auto space-y-6 pb-safe">
                {/* Dot indicators */}
                <div className="flex items-center justify-center gap-2">
                  {slides.map((_, dotIndex) => (
                    <button
                      key={dotIndex}
                      onClick={() => emblaApi?.scrollTo(dotIndex)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300",
                        dotIndex === currentIndex
                          ? "w-6 bg-white"
                          : "bg-white/40 hover:bg-white/60"
                      )}
                      aria-label={`Go to slide ${dotIndex + 1}`}
                    />
                  ))}
                </div>

                {/* Action button */}
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="w-full bg-white text-primary hover:bg-white/90 font-semibold h-14 text-base rounded-xl shadow-lg"
                >
                  {isLastSlide ? (
                    'Get Started'
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileAppIntro;
