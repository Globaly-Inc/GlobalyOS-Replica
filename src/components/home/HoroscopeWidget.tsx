import { Briefcase, Heart, Zap, Coins, Loader2, Sparkles } from 'lucide-react';
import { useHoroscope } from '@/hooks/useHoroscope';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { OrgLink } from '@/components/OrgLink';
import { HoroscopeAspectKey } from '@/types/horoscope';

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

const ASPECT_LABELS: Record<HoroscopeAspectKey, string> = {
  career: 'Career',
  relationships: 'Relationships',
  wellbeing: 'Wellbeing',
  money: 'Money'
};

export function HoroscopeWidget({ dateOfBirth }: HoroscopeWidgetProps) {
  const { zodiac, horoscope, isLoading, error, hasDateOfBirth } = useHoroscope(dateOfBirth);

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
          <span className="text-2xl">{zodiac.symbol}</span>
          <div className="text-left">
            <p className="text-sm text-white/90 font-medium">{zodiac.sign}</p>
            <p className="text-xs text-white/60">{zodiac.dateRange}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasStructuredAspects = horoscope?.aspects && horoscope.aspects.length > 0;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="w-full md:text-right hover:opacity-90 transition-opacity cursor-pointer">
          <div className="flex md:justify-end gap-3 items-center">
            {/* Left: Zodiac Info */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{zodiac.symbol}</span>
              <div className="text-left">
                <p className="text-sm text-white/90 font-medium">{zodiac.sign}</p>
                <p className="text-xs text-white/70">{zodiac.dateRange}</p>
              </div>
            </div>
            
            {/* Right: Aspect Cards (desktop only) - horizontal mini-cards */}
            {hasStructuredAspects && (
              <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-white/20">
                {horoscope.aspects.map((aspect) => {
                  const Icon = ASPECT_ICONS[aspect.key] || Sparkles;
                  const color = ASPECT_COLORS[aspect.key] || 'text-white/80';
                  return (
                    <div 
                      key={aspect.key} 
                      className="flex flex-col text-left min-w-[120px] max-w-[150px] h-[100px] px-2.5 py-1.5 bg-white/10 rounded-lg"
                    >
                      <Icon className={`h-3.5 w-3.5 ${color} shrink-0 mb-1`} />
                      <span className="text-[10px] text-white/90 font-medium leading-tight">
                        {aspect.label}
                      </span>
                      <span className="text-[9px] text-white/70 mt-0.5 leading-tight line-clamp-2">
                        {aspect.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Fallback for non-structured: show legacy text preview */}
            {!hasStructuredAspects && horoscope?.summaryParagraph && (
              <div className="hidden lg:block ml-4 pl-4 border-l border-white/20 max-w-xs">
                <p className="text-xs text-white/80 line-clamp-2 text-left">
                  {horoscope.summaryParagraph}
                </p>
              </div>
            )}
          </div>
        </button>
      </HoverCardTrigger>
      
      {/* HoverCard - Full Reading */}
      <HoverCardContent className="w-96" align="end" side="bottom">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{zodiac.symbol}</span>
            <div className="flex-1">
              <h4 className="font-medium">{zodiac.sign}</h4>
              <p className="text-xs text-muted-foreground">
                {zodiac.dateRange} • {zodiac.element} Sign
              </p>
            </div>
            {horoscope?.title && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {horoscope.title}
              </span>
            )}
          </div>
          
          {/* Aspects Grid */}
          {hasStructuredAspects && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              {horoscope.aspects.map((aspect) => {
                const Icon = ASPECT_ICONS[aspect.key] || Sparkles;
                return (
                  <div key={aspect.key} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{aspect.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{aspect.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Summary Paragraph */}
          {horoscope?.summaryParagraph && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Today's Reading</p>
              <p className="text-sm leading-relaxed">{horoscope.summaryParagraph}</p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
