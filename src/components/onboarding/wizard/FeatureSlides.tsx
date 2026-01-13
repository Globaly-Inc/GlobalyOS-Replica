/**
 * Employee Onboarding - Feature Slides
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Users, FileText, MessageSquare, HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureSlidesProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: Home,
    title: 'Home & Team Feed',
    description: 'See everything happening in your team, post wins and updates, and stay connected.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Users,
    title: 'Team & Attendance',
    description: 'Check in daily, see who\'s on leave, view your profile and your teammates.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: FileText,
    title: 'Wiki & Knowledge Base',
    description: 'Find important documents, policies, how-tos, and everything you need to know.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: MessageSquare,
    title: 'Chat & Collaboration',
    description: 'Message teammates and spaces directly inside GlobalyOS. Stay in the loop.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: HelpCircle,
    title: 'Getting Help',
    description: 'Use the Get Help button anytime to report bugs, ask questions, or request features.',
    color: 'bg-pink-100 text-pink-600',
  },
];

export function FeatureSlides({ onComplete }: FeatureSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="pt-8 pb-6">
        <div className="text-center space-y-6">
          <div className={cn('h-20 w-20 rounded-2xl mx-auto flex items-center justify-center', slide.color)}>
            <Icon className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{slide.title}</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">{slide.description}</p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {SLIDES.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === currentSlide ? 'w-6 bg-primary' : 'w-2 bg-muted'
                )}
              />
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            {currentSlide > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} className={currentSlide === 0 ? 'w-full' : 'flex-1'}>
              {isLastSlide ? 'Get Started' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
