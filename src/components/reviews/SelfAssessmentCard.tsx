import { format } from "date-fns";
import { Star, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RATING_CRITERIA } from "./RatingCriteriaTooltip";

interface SelfAssessmentCardProps {
  selfAssessment: {
    self_what_went_well?: string | null;
    self_needs_improvement?: string | null;
    self_goals_next_period?: string | null;
    self_overall_rating?: number | null;
    self_submitted_at?: string | null;
  };
  employeeName?: string;
}

export const SelfAssessmentCard = ({ selfAssessment, employeeName }: SelfAssessmentCardProps) => {
  if (!selfAssessment.self_submitted_at) {
    return null;
  }

  const ratingLabel = selfAssessment.self_overall_rating
    ? RATING_CRITERIA[selfAssessment.self_overall_rating - 1]?.label
    : null;

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            Employee Self-Assessment
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(new Date(selfAssessment.self_submitted_at), "d MMM yyyy")}
          </div>
        </div>
        {employeeName && (
          <p className="text-sm text-muted-foreground">By {employeeName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {selfAssessment.self_what_went_well && (
          <div>
            <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-1">
              What Went Well
            </p>
            <p className="text-sm whitespace-pre-wrap">{selfAssessment.self_what_went_well}</p>
          </div>
        )}

        {selfAssessment.self_needs_improvement && (
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-1">
              Areas for Improvement
            </p>
            <p className="text-sm whitespace-pre-wrap">{selfAssessment.self_needs_improvement}</p>
          </div>
        )}

        {selfAssessment.self_goals_next_period && (
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-1">
              Goals for Next Period
            </p>
            <p className="text-sm whitespace-pre-wrap">{selfAssessment.self_goals_next_period}</p>
          </div>
        )}

        {selfAssessment.self_overall_rating && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Self Rating</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= selfAssessment.self_overall_rating!
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted"
                    )}
                  />
                ))}
              </div>
              {ratingLabel && (
                <span className="text-xs text-muted-foreground">({ratingLabel})</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SelfAssessmentCard;
