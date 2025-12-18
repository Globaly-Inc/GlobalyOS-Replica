import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Sparkles, FileText, RefreshCw, Clock, Check, Star, Target, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIReviewPrepProps {
  employeeId: string;
  reviewId?: string;
  periodStart?: string;
  periodEnd?: string;
  onDraftApplied?: (draft: ReviewDraft) => void;
}

interface ReviewDraft {
  summary: string;
  what_went_well: string[];
  needs_improvement: string[];
  goals_next_period: string[];
  key_highlights: string[];
  rating_suggestion: string;
}

const AIReviewPrep = ({ employeeId, reviewId, periodStart, periodEnd, onDraftApplied }: AIReviewPrepProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState<ReviewDraft | null>(null);

  // Fetch existing review if reviewId provided
  const { data: existingReview, isLoading: reviewLoading } = useQuery({
    queryKey: ["performance-review", reviewId],
    queryFn: async () => {
      if (!reviewId) return null;
      const { data, error } = await supabase
        .from("performance_reviews")
        .select("*")
        .eq("id", reviewId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!reviewId,
  });

  const draft: ReviewDraft | null = editedDraft || (existingReview?.ai_draft as unknown as ReviewDraft | null);
  const generatedAt = existingReview?.ai_draft_generated_at;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-review-draft", {
        body: {
          employee_id: employeeId,
          review_id: reviewId,
          period_start: periodStart,
          period_end: periodEnd,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data?.draft) {
        setEditedDraft(data.draft);
      }
      if (reviewId) {
        queryClient.invalidateQueries({ queryKey: ["performance-review", reviewId] });
      }
      toast.success("AI review draft generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate review draft");
    },
  });

  const handleApplyDraft = () => {
    if (draft && onDraftApplied) {
      onDraftApplied(draft);
      toast.success("Draft applied to review form");
    }
  };

  if (reviewLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-ai/5 to-ai/10 border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-ai" />
            AI Review Prep
          </CardTitle>
          <div className="flex items-center gap-2">
            {draft && onDraftApplied && (
              <Button variant="outline" size="sm" onClick={handleApplyDraft} className="h-8">
                <Check className="h-3.5 w-3.5 mr-1" />
                Use Draft
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="h-8"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", generateMutation.isPending && "animate-spin")} />
              {draft ? "Regenerate" : "Generate Draft"}
            </Button>
          </div>
        </div>
        {generatedAt && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            Generated {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!draft ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No AI draft generated yet</p>
            <p className="text-xs mt-1">
              Click "Generate Draft" to create an AI-powered review preparation.
            </p>
            <p className="text-xs mt-3 text-muted-foreground/70">
              The AI will analyze achievements, KPIs, kudos, and other performance data.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Summary</h4>
              <p className="text-sm">{draft.summary}</p>
            </div>

            {/* Key Highlights */}
            {draft.key_highlights?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Key Highlights
                </h4>
                <div className="flex flex-wrap gap-2">
                  {draft.key_highlights.map((highlight, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {highlight}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* What Went Well */}
            <div>
              <h4 className="text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-2 flex items-center gap-1">
                <Check className="h-3 w-3" />
                What Went Well
              </h4>
              <ul className="space-y-1.5">
                {draft.what_went_well?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Needs Improvement */}
            <div>
              <h4 className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Areas for Growth
              </h4>
              <ul className="space-y-1.5">
                {draft.needs_improvement?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Goals for Next Period */}
            <div>
              <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-2 flex items-center gap-1">
                <Target className="h-3 w-3" />
                Suggested Goals for Next Period
              </h4>
              <ul className="space-y-1.5">
                {draft.goals_next_period?.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 mt-1">{i + 1}.</span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rating Suggestion */}
            {draft.rating_suggestion && (
              <div className="border-t pt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Suggested Rating
                </h4>
                <p className="text-sm text-muted-foreground italic">{draft.rating_suggestion}</p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs text-amber-700 dark:text-amber-300">
              <strong>Note:</strong> This is an AI-generated draft for preparation purposes. Review and edit before finalizing.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AIReviewPrep;
