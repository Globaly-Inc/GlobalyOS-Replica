import { useState } from 'react';
import { Briefcase, Heart, Zap, Coins, Loader2, Sparkles } from 'lucide-react';
import { useHoroscope } from '@/hooks/useHoroscope';
import { OrgLink } from '@/components/OrgLink';
import { HoroscopeAspect, HoroscopeAspectKey } from '@/types/horoscope';
import { HoroscopeAspectDetailDialog } from './HoroscopeAspectDetailDialog';

interface HoroscopeWidgetProps {
  dateOfBirth: string | null;
  userName?: string | null;
}

const ASPECT_ICONS: Record<HoroscopeAspectKey, typeof Briefcase> = {
  career: Briefcase,
  relationships: Heart,
  wellbeing: Zap,
  money: Coins
};

const ASPECT_COLORS: Record<HoroscopeAspectKey, string> = {
  career: 'text-blue-300',
  relationships: 'text-pink-300',
  wellbeing: 'text-green-300',
  money: 'text-yellow-300'
};

const formatLastUpdated = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  
  // If same day, show "Updated today"
  if (date.toDateString() === today.toDateString()) {
    return 'Updated today';
  }
  
  // Otherwise show date
  return `Updated ${date.toLocaleDateString('en-AU', { 
    day: 'numeric', 
    month: 'short' 
  })}`;
};

export function HoroscopeWidget({ dateOfBirth }: HoroscopeWidgetProps) {
  const { zodiac, horoscope, isLoading, error, hasDateOfBirth } = useHoroscope(dateOfBirth);
  const [selectedAspect, setSelectedAspect] = useState<HoroscopeAspect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleAspectClick = (aspect: HoroscopeAspect) => {
    setSelectedAspect(aspect);
    setDetailOpen(true);
  };

  // Empty state - no DOB
  if (!hasDateOfBirth) {
    return (
      <div className="md:text-right">
        <div className="flex md:justify-end items-center gap-3">
          <Sparkles className="h-6 w-6 text-white/60" />
          <div className="text-left">
            <p className="text-sm text-white/90">Discover your daily horoscope</p>
            <OrgLink to="/settings/profile" className="text-xs text-white/60 hover:text-white/80 underline">
              Add your birthday to see readings
            </OrgLink>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !zodiac) {
    return (
      <div className="md:text-right">
        <div className="flex md:justify-end items-center gap-3">
          <Loader2 className="h-6 w-6 text-white/60 animate-spin" />
          <span className="text-sm text-white/70">Loading horoscope...</span>
        </div>
      </div>
    );
  }

  // Error state - still show zodiac info
  if (error && !horoscope) {
    return (
      <div className="md:text-right">
        <div className="flex md:justify-end items-center gap-3">
          <div className="flex flex-col items-end text-right">
            <span className="text-2xl mb-0.5">{zodiac.symbol}</span>
            <p className="text-sm text-white/90 font-medium">{zodiac.sign}</p>
            <p className="text-xs text-white/60">{zodiac.dateRange}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasStructuredAspects = horoscope?.aspects && horoscope.aspects.length > 0;

  return (
    <>
      <div className="md:text-right">
        <div className="flex md:justify-end gap-3 items-stretch">
          {/* Left: Zodiac Info - Vertical stack, right-aligned */}
          <div className="flex flex-col items-end text-right justify-center pr-4">
            {/* Row 1: Emoji */}
            <span className="text-2xl mb-0.5">{zodiac.symbol}</span>
            
            {/* Row 2: Sign name */}
            <p className="text-sm text-white/90 font-medium">{zodiac.sign}</p>
            
            {/* Row 3: Date range */}
            <p className="text-xs text-white/70">{zodiac.dateRange}</p>
            
            {/* Row 4: Last updated */}
            {horoscope?.createdAt && (
              <p className="text-[10px] text-white/50 mt-1">
                {formatLastUpdated(horoscope.createdAt)}
              </p>
            )}
          </div>
          
          {/* Right: Aspect Cards (desktop only) - clickable */}
          {hasStructuredAspects && (
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-white/20">
              {horoscope.aspects.map((aspect) => {
                const Icon = ASPECT_ICONS[aspect.key] || Sparkles;
                const color = ASPECT_COLORS[aspect.key] || 'text-white/80';
                return (
                  <button 
                    key={aspect.key}
                    onClick={() => handleAspectClick(aspect)}
                    className="flex flex-col text-left min-w-[140px] max-w-[160px] h-[110px] px-2.5 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Icon className={`h-[18px] w-[18px] ${color} shrink-0 mb-1.5`} />
                    <span className="text-[10px] text-white/90 font-medium leading-snug flex-1">
                      {aspect.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          
          {/* Fallback for non-structured: show legacy text preview */}
          {!hasStructuredAspects && horoscope?.summaryParagraph && (
            <div className="hidden lg:block pl-4 border-l border-white/20 max-w-xs">
              <p className="text-xs text-white/80 line-clamp-2 text-left">
                {horoscope.summaryParagraph}
              </p>
            </div>
          )}
        </div>
      </div>

      <HoroscopeAspectDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        aspect={selectedAspect}
        zodiac={zodiac}
      />
    </>
  );
}
