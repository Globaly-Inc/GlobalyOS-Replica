import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper, Sparkles, Trophy, Star } from 'lucide-react';

interface KpiCelebrationProps {
  milestone: {
    percent: number;
    label: string;
  } | null;
  onClose: () => void;
}

export const KpiCelebration = ({ milestone, onClose }: KpiCelebrationProps) => {
  const [confetti, setConfetti] = useState<{ id: number; x: number; delay: number; color: string }[]>([]);

  useEffect(() => {
    if (milestone) {
      // Generate confetti particles
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 5)],
      }));
      setConfetti(particles);
    }
  }, [milestone]);

  if (!milestone) return null;

  const getIcon = () => {
    if (milestone.percent >= 100) return <Trophy className="h-16 w-16 text-amber-500" />;
    if (milestone.percent >= 75) return <Star className="h-16 w-16 text-amber-500" />;
    if (milestone.percent >= 50) return <Sparkles className="h-16 w-16 text-primary" />;
    return <PartyPopper className="h-16 w-16 text-primary" />;
  };

  const getMessage = () => {
    if (milestone.percent >= 100) return "You've achieved your goal!";
    if (milestone.percent >= 75) return "Almost there! Keep pushing!";
    if (milestone.percent >= 50) return "Great progress! You're halfway!";
    return "Nice start! Keep it up!";
  };

  return (
    <Dialog open={!!milestone} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md text-center overflow-hidden">
        {/* Confetti animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-confetti"
              style={{
                left: `${particle.x}%`,
                top: '-10px',
                animationDelay: `${particle.delay}s`,
                backgroundColor: particle.color,
                width: '10px',
                height: '10px',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 py-6">
          {/* Icon with pulse animation */}
          <div className="flex justify-center mb-4">
            <div className="animate-bounce">
              {getIcon()}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-2">
            🎉 {milestone.percent}% Milestone Reached!
          </h2>

          {/* Milestone label */}
          <p className="text-lg text-primary font-medium mb-2">
            {milestone.label}
          </p>

          {/* Message */}
          <p className="text-muted-foreground mb-6">
            {getMessage()}
          </p>

          {/* Action button */}
          <Button onClick={onClose} className="w-full">
            Continue Progress
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add this to index.css for confetti animation
// @keyframes confetti {
//   0% { transform: translateY(0) rotate(0deg); opacity: 1; }
//   100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
// }
// .animate-confetti { animation: confetti 3s ease-out forwards; }
