import { Briefcase, Heart, Zap, Coins, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HoroscopeAspect, HoroscopeAspectKey } from '@/types/horoscope';
import { ZodiacSign } from '@/lib/zodiac';
import { format } from 'date-fns';

interface HoroscopeAspectDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aspect: HoroscopeAspect | null;
  zodiac: ZodiacSign | null;
}

const ASPECT_ICONS: Record<HoroscopeAspectKey, typeof Briefcase> = {
  career: Briefcase,
  relationships: Heart,
  wellbeing: Zap,
  money: Coins
};

const ASPECT_LABELS: Record<HoroscopeAspectKey, string> = {
  career: 'Career',
  relationships: 'Relationships',
  wellbeing: 'Wellbeing',
  money: 'Money'
};

export function HoroscopeAspectDetailDialog({
  open,
  onOpenChange,
  aspect,
  zodiac
}: HoroscopeAspectDetailDialogProps) {
  if (!aspect) return null;

  const Icon = ASPECT_ICONS[aspect.key] || Sparkles;
  const categoryLabel = ASPECT_LABELS[aspect.key] || aspect.key;
  const today = format(new Date(), 'MMMM d, yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{categoryLabel} Reading</DialogTitle>
              {zodiac && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {zodiac.symbol} {zodiac.sign} • {zodiac.element} Sign
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">{today}</p>
          
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">{aspect.label}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aspect.text}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
