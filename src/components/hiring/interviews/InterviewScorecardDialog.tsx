/**
 * Interview Scorecard Dialog
 * Submit interview feedback and recommendation
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useSubmitScorecard } from '@/services/useHiringMutations';
import type { InterviewRecommendation, HiringInterviewWithRelations } from '@/types/hiring';
import { Loader2, Star, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface InterviewScorecardDialogProps {
  interview: HiringInterviewWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECOMMENDATION_OPTIONS: { value: InterviewRecommendation; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'strong_yes', label: 'Strong Yes', icon: <ThumbsUp className="h-5 w-5" />, color: 'text-green-600' },
  { value: 'yes', label: 'Yes', icon: <ThumbsUp className="h-4 w-4" />, color: 'text-green-500' },
  { value: 'neutral', label: 'Neutral', icon: <Minus className="h-4 w-4" />, color: 'text-yellow-500' },
  { value: 'no', label: 'No', icon: <ThumbsDown className="h-4 w-4" />, color: 'text-red-500' },
  { value: 'strong_no', label: 'Strong No', icon: <ThumbsDown className="h-5 w-5" />, color: 'text-red-600' },
];

const RATING_CRITERIA = [
  { key: 'technical_skills', label: 'Technical Skills' },
  { key: 'communication', label: 'Communication' },
  { key: 'problem_solving', label: 'Problem Solving' },
  { key: 'culture_fit', label: 'Culture Fit' },
  { key: 'experience', label: 'Relevant Experience' },
];

export function InterviewScorecardDialog({
  interview,
  open,
  onOpenChange,
}: InterviewScorecardDialogProps) {
  const submitScorecard = useSubmitScorecard();

  const [recommendation, setRecommendation] = useState<InterviewRecommendation | ''>('');
  const [overallScore, setOverallScore] = useState(3);
  const [ratings, setRatings] = useState<Record<string, number>>({
    technical_skills: 3,
    communication: 3,
    problem_solving: 3,
    culture_fit: 3,
    experience: 3,
  });
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [notes, setNotes] = useState('');

  const handleRatingChange = (key: string, value: number[]) => {
    setRatings(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleSubmit = async () => {
    if (!recommendation) {
      toast.error('Please select a recommendation');
      return;
    }

    try {
      // Convert number ratings to ScorecardRating format
      const formattedRatings: Record<string, { score: number; comment: string }> = {};
      for (const [key, value] of Object.entries(ratings)) {
        formattedRatings[key] = { score: value, comment: '' };
      }
      
      await submitScorecard.mutateAsync({
        interview_id: interview.id,
        overall_rating: overallScore,
        recommendation,
        strengths: strengths || null,
        concerns: weaknesses || null,
        notes: notes || null,
        ratings: formattedRatings,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const candidateName = interview.candidate_application?.candidate?.name || 'Candidate';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview Scorecard</DialogTitle>
          <DialogDescription>
            Submit your feedback for {candidateName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recommendation */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Hiring Recommendation *</Label>
            <RadioGroup
              value={recommendation}
              onValueChange={(v) => setRecommendation(v as InterviewRecommendation)}
              className="grid grid-cols-5 gap-2"
            >
              {RECOMMENDATION_OPTIONS.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all ${option.color}`}
                  >
                    {option.icon}
                    <span className="mt-1 text-xs font-medium">{option.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Overall Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Overall Score</Label>
              <Badge variant="secondary" className="text-lg px-3">
                {overallScore}/5
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[overallScore]}
                onValueChange={(v) => setOverallScore(v[0])}
                min={1}
                max={5}
                step={1}
                className="flex-1"
              />
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 cursor-pointer transition-colors ${
                      star <= overallScore
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => setOverallScore(star)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Skill Ratings</Label>
            {RATING_CRITERIA.map((criteria) => (
              <div key={criteria.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{criteria.label}</Label>
                  <span className="text-sm text-muted-foreground">
                    {ratings[criteria.key]}/5
                  </span>
                </div>
                <Slider
                  value={[ratings[criteria.key]]}
                  onValueChange={(v) => handleRatingChange(criteria.key, v)}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
            ))}
          </div>

          {/* Strengths */}
          <div className="space-y-2">
            <Label htmlFor="strengths">Key Strengths</Label>
            <Textarea
              id="strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="What were the candidate's key strengths?"
              rows={3}
            />
          </div>

          {/* Weaknesses */}
          <div className="space-y-2">
            <Label htmlFor="weaknesses">Areas of Concern</Label>
            <Textarea
              id="weaknesses"
              value={weaknesses}
              onChange={(e) => setWeaknesses(e.target.value)}
              placeholder="Any concerns or areas for improvement?"
              rows={3}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other feedback or observations..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitScorecard.isPending}>
            {submitScorecard.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Scorecard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
