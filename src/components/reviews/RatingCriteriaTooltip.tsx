import { Star, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface RatingCriteria {
  rating: number;
  label: string;
  description: string;
  examples: string[];
}

export const RATING_CRITERIA: RatingCriteria[] = [
  {
    rating: 1,
    label: "Needs Improvement",
    description: "Performance consistently falls below expectations",
    examples: [
      "Frequently misses deadlines",
      "Requires constant supervision",
      "Does not meet quality standards",
    ],
  },
  {
    rating: 2,
    label: "Below Expectations",
    description: "Performance occasionally falls below expectations",
    examples: [
      "Sometimes misses targets",
      "Needs guidance on routine tasks",
      "Quality is inconsistent",
    ],
  },
  {
    rating: 3,
    label: "Meets Expectations",
    description: "Performance consistently meets role requirements",
    examples: [
      "Delivers on commitments reliably",
      "Works independently",
      "Meets quality standards",
    ],
  },
  {
    rating: 4,
    label: "Exceeds Expectations",
    description: "Performance frequently surpasses expectations",
    examples: [
      "Goes above and beyond",
      "Mentors others",
      "Delivers exceptional quality",
    ],
  },
  {
    rating: 5,
    label: "Outstanding",
    description: "Exceptional performance that sets the standard",
    examples: [
      "Role model for the team",
      "Drives significant impact",
      "Consistently exceptional results",
    ],
  },
];

interface RatingStarProps {
  rating: number;
  currentValue: number;
  onClick: (rating: number) => void;
  disabled?: boolean;
}

export const RatingStar = ({ rating, currentValue, onClick, disabled }: RatingStarProps) => {
  const criteria = RATING_CRITERIA[rating - 1];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => !disabled && onClick(rating)}
            disabled={disabled}
            className={cn(
              "transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                rating <= currentValue
                  ? "text-amber-400 fill-amber-400"
                  : "text-muted hover:text-amber-200"
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <div className="space-y-1">
            <p className="font-semibold text-sm flex items-center gap-1">
              {rating} - {criteria.label}
            </p>
            <p className="text-xs text-muted-foreground">{criteria.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface RatingStarsInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showGuide?: boolean;
}

export const RatingStarsInput = ({ value, onChange, disabled, showGuide = true }: RatingStarsInputProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <RatingStar
            key={star}
            rating={star}
            currentValue={value}
            onClick={onChange}
            disabled={disabled}
          />
        ))}
      </div>
      {showGuide && <RatingGuideDialog />}
    </div>
  );
};

export const RatingGuideDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rating Criteria Guide</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {RATING_CRITERIA.map((criteria) => (
            <div key={criteria.rating} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {Array.from({ length: criteria.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                  {Array.from({ length: 5 - criteria.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-muted" />
                  ))}
                </div>
                <span className="font-semibold">{criteria.label}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{criteria.description}</p>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Examples:</p>
                <ul className="text-xs space-y-0.5">
                  {criteria.examples.map((example, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-muted-foreground">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingStarsInput;
