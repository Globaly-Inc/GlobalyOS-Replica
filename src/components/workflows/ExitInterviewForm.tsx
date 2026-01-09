import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUpdateExitInterview } from "@/services/useWorkflows";
import type { ExitInterview } from "@/types/workflow";
import { MessageSquare, Star, Save, Loader2, Lock } from "lucide-react";

interface ExitInterviewFormProps {
  exitInterview: ExitInterview | null;
  employeeId: string;
  canEdit?: boolean;
}

export function ExitInterviewForm({ exitInterview, employeeId, canEdit = false }: ExitInterviewFormProps) {
  const updateInterview = useUpdateExitInterview();
  
  const [formData, setFormData] = useState({
    reason_for_leaving: "",
    feedback_management: "",
    feedback_culture: "",
    feedback_role: "",
    feedback_compensation: "",
    suggestions: "",
    would_recommend: null as boolean | null,
    would_return: null as boolean | null,
    overall_rating: null as number | null,
    is_confidential: true,
  });

  useEffect(() => {
    if (exitInterview) {
      setFormData({
        reason_for_leaving: exitInterview.reason_for_leaving || "",
        feedback_management: exitInterview.feedback_management || "",
        feedback_culture: exitInterview.feedback_culture || "",
        feedback_role: exitInterview.feedback_role || "",
        feedback_compensation: exitInterview.feedback_compensation || "",
        suggestions: exitInterview.suggestions || "",
        would_recommend: exitInterview.would_recommend,
        would_return: exitInterview.would_return,
        overall_rating: exitInterview.overall_rating,
        is_confidential: exitInterview.is_confidential,
      });
    }
  }, [exitInterview]);

  const handleSave = () => {
    if (!exitInterview) return;
    
    updateInterview.mutate({
      id: exitInterview.id,
      data: {
        ...formData,
        conducted_at: exitInterview.conducted_at || new Date().toISOString(),
      },
    });
  };

  if (!exitInterview) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Exit Interview Scheduled</h3>
          <p className="text-sm text-muted-foreground">
            An exit interview will be created when the offboarding workflow starts.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = exitInterview.conducted_at && exitInterview.overall_rating;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Exit Interview
            </CardTitle>
            <CardDescription>
              Capture feedback and insights from the departing employee
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {formData.is_confidential && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Confidential
              </Badge>
            )}
            {isCompleted && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Completed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reason for leaving */}
        <div className="space-y-2">
          <Label htmlFor="reason">Primary Reason for Leaving</Label>
          <Textarea
            id="reason"
            placeholder="What is the main reason for your departure?"
            value={formData.reason_for_leaving}
            onChange={(e) => setFormData({ ...formData, reason_for_leaving: e.target.value })}
            disabled={!canEdit}
            className="min-h-[80px]"
          />
        </div>

        {/* Feedback sections */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="feedback_management">Feedback on Management</Label>
            <Textarea
              id="feedback_management"
              placeholder="How was your experience with management?"
              value={formData.feedback_management}
              onChange={(e) => setFormData({ ...formData, feedback_management: e.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback_culture">Feedback on Culture</Label>
            <Textarea
              id="feedback_culture"
              placeholder="How would you describe the company culture?"
              value={formData.feedback_culture}
              onChange={(e) => setFormData({ ...formData, feedback_culture: e.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback_role">Feedback on Role</Label>
            <Textarea
              id="feedback_role"
              placeholder="How did you feel about your role and responsibilities?"
              value={formData.feedback_role}
              onChange={(e) => setFormData({ ...formData, feedback_role: e.target.value })}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback_compensation">Feedback on Compensation</Label>
            <Textarea
              id="feedback_compensation"
              placeholder="How did you feel about your compensation and benefits?"
              value={formData.feedback_compensation}
              onChange={(e) => setFormData({ ...formData, feedback_compensation: e.target.value })}
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <Label htmlFor="suggestions">Suggestions for Improvement</Label>
          <Textarea
            id="suggestions"
            placeholder="What could we do better?"
            value={formData.suggestions}
            onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })}
            disabled={!canEdit}
            className="min-h-[80px]"
          />
        </div>

        {/* Rating and Yes/No questions */}
        <div className="grid md:grid-cols-3 gap-6 p-4 rounded-lg bg-muted/50">
          {/* Overall Rating */}
          <div className="space-y-3">
            <Label>Overall Experience Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => canEdit && setFormData({ ...formData, overall_rating: rating })}
                  disabled={!canEdit}
                  className={`p-1 rounded transition-colors ${
                    formData.overall_rating && formData.overall_rating >= rating
                      ? "text-amber-500"
                      : "text-muted-foreground/30"
                  } ${canEdit ? "hover:text-amber-400" : ""}`}
                >
                  <Star className={`h-6 w-6 ${formData.overall_rating && formData.overall_rating >= rating ? "fill-current" : ""}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Would recommend */}
          <div className="space-y-3">
            <Label>Would you recommend this company?</Label>
            <RadioGroup
              value={formData.would_recommend === null ? "" : formData.would_recommend ? "yes" : "no"}
              onValueChange={(v) => canEdit && setFormData({ ...formData, would_recommend: v === "yes" })}
              disabled={!canEdit}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="recommend-yes" />
                <Label htmlFor="recommend-yes" className="font-normal">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="recommend-no" />
                <Label htmlFor="recommend-no" className="font-normal">No</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Would return */}
          <div className="space-y-3">
            <Label>Would you consider returning?</Label>
            <RadioGroup
              value={formData.would_return === null ? "" : formData.would_return ? "yes" : "no"}
              onValueChange={(v) => canEdit && setFormData({ ...formData, would_return: v === "yes" })}
              disabled={!canEdit}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="return-yes" />
                <Label htmlFor="return-yes" className="font-normal">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="return-no" />
                <Label htmlFor="return-no" className="font-normal">No</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Confidential toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="space-y-0.5">
            <Label>Mark as Confidential</Label>
            <p className="text-sm text-muted-foreground">
              Only HR and Admin can view this exit interview
            </p>
          </div>
          <Switch
            checked={formData.is_confidential}
            onCheckedChange={(checked) => canEdit && setFormData({ ...formData, is_confidential: checked })}
            disabled={!canEdit}
          />
        </div>

        {/* Save button */}
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateInterview.isPending}>
              {updateInterview.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Exit Interview
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
