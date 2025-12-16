import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfYear } from "date-fns";
import { ArrowLeft, Plus, FileText, Star, Clock, CheckCircle, Edit, Send, User, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AIReviewPrep from "@/components/AIReviewPrep";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { RATING_CRITERIA, RatingGuideDialog } from "@/components/reviews/RatingCriteriaTooltip";
import { ReviewPDFExport } from "@/components/reviews/ReviewPDFExport";
import { SelfAssessmentCard } from "@/components/reviews/SelfAssessmentCard";
import { ReviewTemplatesDialog } from "@/components/reviews/ReviewTemplatesDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReviewDraft {
  summary: string;
  what_went_well: string[];
  needs_improvement: string[];
  goals_next_period: string[];
  key_highlights: string[];
  rating_suggestion: string;
}

const PerformanceReviewsPage = () => {
  const { id: employeeId } = useParams();
  const { navigateOrg } = useOrgNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, isHR } = useUserRole();
  const canManage = isAdmin || isHR;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState<Date>(startOfYear(new Date()));
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Manager review form
  const [formData, setFormData] = useState({
    what_went_well: "",
    needs_improvement: "",
    goals_next_period: "",
    overall_rating: 0,
  });

  // Self-assessment form (for employees)
  const [selfFormData, setSelfFormData] = useState({
    self_what_went_well: "",
    self_needs_improvement: "",
    self_goals_next_period: "",
    self_overall_rating: 0,
  });

  // Acknowledgment form
  const [acknowledgmentComments, setAcknowledgmentComments] = useState("");

  // Fetch employee info
  const { data: employee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, profiles(full_name, avatar_url), organization:organizations(name, logo_url)")
        .eq("id", employeeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Fetch current user's employee record
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id, user_id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch performance reviews
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["performance-reviews", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .select("*, reviewer:employees!performance_reviews_reviewer_id_fkey(id, user_id, profiles(full_name))")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  const currentReview = reviews?.find((r) => r.id === selectedReview);
  
  // Check if current user is the employee being reviewed
  const isReviewSubject = currentEmployee?.id === employeeId;
  // Check if current user is the reviewer
  const isReviewer = currentReview?.reviewer_id === currentEmployee?.id;

  // Sync form data when review changes
  useEffect(() => {
    if (currentReview) {
      setFormData({
        what_went_well: currentReview.what_went_well || "",
        needs_improvement: currentReview.needs_improvement || "",
        goals_next_period: currentReview.goals_next_period || "",
        overall_rating: currentReview.overall_rating || 0,
      });
      setSelfFormData({
        self_what_went_well: currentReview.self_what_went_well || "",
        self_needs_improvement: currentReview.self_needs_improvement || "",
        self_goals_next_period: currentReview.self_goals_next_period || "",
        self_overall_rating: currentReview.self_overall_rating || 0,
      });
      setAcknowledgmentComments(currentReview.employee_comments || "");
    }
  }, [selectedReview, currentReview?.id]);

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId || !currentEmployee?.id || !employee?.organization_id) {
        throw new Error("Missing required data");
      }
      const { data, error } = await supabase
        .from("performance_reviews")
        .insert({
          employee_id: employeeId,
          reviewer_id: currentEmployee.id,
          organization_id: employee.organization_id,
          review_period_start: format(periodStart, "yyyy-MM-dd"),
          review_period_end: format(periodEnd, "yyyy-MM-dd"),
          status: "self_assessment_pending",
          template_id: selectedTemplate?.id || null,
          competencies: selectedTemplate?.competencies || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["performance-reviews", employeeId] });
      setIsCreateOpen(false);
      setSelectedReview(data.id);
      setSelectedTemplate(null);
      
      // Send notification to employee
      try {
        await supabase.functions.invoke("notify-review-stage", {
          body: { review_id: data.id, stage: "review_initiated" },
        });
      } catch (e) {
        console.error("Failed to send notification:", e);
      }
      
      toast.success("Review created - employee notified to complete self-assessment");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create review");
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!selectedReview) throw new Error("No review selected");
      const { error } = await supabase
        .from("performance_reviews")
        .update(updates)
        .eq("id", selectedReview);
      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-reviews", employeeId] });
      toast.success("Review saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save review");
    },
  });

  // Submit self-assessment
  const submitSelfAssessment = async () => {
    await updateReviewMutation.mutateAsync({
      self_what_went_well: selfFormData.self_what_went_well,
      self_needs_improvement: selfFormData.self_needs_improvement,
      self_goals_next_period: selfFormData.self_goals_next_period,
      self_overall_rating: selfFormData.self_overall_rating || null,
      self_submitted_at: new Date().toISOString(),
      status: "in_progress",
    });
    
    // Notify manager
    try {
      await supabase.functions.invoke("notify-review-stage", {
        body: { review_id: selectedReview, stage: "self_assessment_submitted" },
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
    
    toast.success("Self-assessment submitted");
  };

  // Submit manager review
  const submitManagerReview = async () => {
    await updateReviewMutation.mutateAsync({
      what_went_well: formData.what_went_well,
      needs_improvement: formData.needs_improvement,
      goals_next_period: formData.goals_next_period,
      overall_rating: formData.overall_rating || null,
      manager_submitted_at: new Date().toISOString(),
      status: "pending_acknowledgment",
    });
    
    // Notify employee
    try {
      await supabase.functions.invoke("notify-review-stage", {
        body: { review_id: selectedReview, stage: "manager_review_ready" },
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
    
    toast.success("Review submitted for acknowledgment");
  };

  // Acknowledge review
  const acknowledgeReview = async () => {
    await updateReviewMutation.mutateAsync({
      employee_comments: acknowledgmentComments || null,
      acknowledged_at: new Date().toISOString(),
      status: "completed",
    });
    
    // Notify manager
    try {
      await supabase.functions.invoke("notify-review-stage", {
        body: { review_id: selectedReview, stage: "review_acknowledged" },
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
    
    toast.success("Review acknowledged and completed");
  };

  const handleDraftApplied = (draft: ReviewDraft) => {
    setFormData({
      what_went_well: draft.what_went_well?.join("\n• ") || "",
      needs_improvement: draft.needs_improvement?.join("\n• ") || "",
      goals_next_period: draft.goals_next_period?.join("\n• ") || "",
      overall_rating: parseInt(draft.rating_suggestion?.charAt(0) || "3") || 3,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case "pending_acknowledgment":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Awaiting Acknowledgment</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Manager Review</Badge>;
      case "self_assessment_pending":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Self-Assessment</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const renderStarRating = (
    value: number,
    onChange?: (v: number) => void,
    disabled?: boolean
  ) => (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Tooltip key={star}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange?.(star)}
                disabled={disabled}
                className={cn("transition-transform", !disabled && "hover:scale-110")}
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    star <= value
                      ? "text-amber-400 fill-amber-400"
                      : "text-muted hover:text-amber-200"
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-semibold">{RATING_CRITERIA[star - 1].label}</p>
              <p className="text-xs text-muted-foreground">{RATING_CRITERIA[star - 1].description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <RatingGuideDialog />
    </div>
  );

  // Render different content based on review status and user role
  const renderReviewContent = () => {
    if (!currentReview) return null;

    const status = currentReview.status;
    const isCompleted = status === "completed";

    // Self-assessment pending - show form to employee, waiting message to reviewer
    if (status === "self_assessment_pending" || status === "draft") {
      if (isReviewSubject) {
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Self-Assessment
              </CardTitle>
              <CardDescription>
                Complete your self-assessment to share your perspective on your performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>What Went Well</Label>
                <Textarea
                  value={selfFormData.self_what_went_well}
                  onChange={(e) => setSelfFormData({ ...selfFormData, self_what_went_well: e.target.value })}
                  placeholder="Describe your key achievements and strengths..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Areas for Improvement</Label>
                <Textarea
                  value={selfFormData.self_needs_improvement}
                  onChange={(e) => setSelfFormData({ ...selfFormData, self_needs_improvement: e.target.value })}
                  placeholder="Identify areas where you'd like to grow..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Goals for Next Period</Label>
                <Textarea
                  value={selfFormData.self_goals_next_period}
                  onChange={(e) => setSelfFormData({ ...selfFormData, self_goals_next_period: e.target.value })}
                  placeholder="What do you want to achieve next..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Self Rating</Label>
                {renderStarRating(
                  selfFormData.self_overall_rating,
                  (v) => setSelfFormData({ ...selfFormData, self_overall_rating: v })
                )}
              </div>
              <Button onClick={submitSelfAssessment} disabled={updateReviewMutation.isPending}>
                <Send className="h-4 w-4 mr-1" />
                Submit Self-Assessment
              </Button>
            </CardContent>
          </Card>
        );
      } else {
        return (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-1">Waiting for Self-Assessment</h3>
            <p className="text-sm text-muted-foreground">
              {(employee?.profiles as any)?.full_name || "The employee"} needs to complete their self-assessment first.
            </p>
          </Card>
        );
      }
    }

    // In progress - manager reviews (show self-assessment in sidebar)
    if (status === "in_progress") {
      if (isReviewer || canManage) {
        return (
          <div className="space-y-4">
            {/* Show self-assessment for context */}
            {currentReview.self_submitted_at && (
              <SelfAssessmentCard
                selfAssessment={{
                  self_what_went_well: currentReview.self_what_went_well,
                  self_needs_improvement: currentReview.self_needs_improvement,
                  self_goals_next_period: currentReview.self_goals_next_period,
                  self_overall_rating: currentReview.self_overall_rating,
                  self_submitted_at: currentReview.self_submitted_at,
                }}
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manager Review</CardTitle>
                <CardDescription>
                  Provide your assessment based on the employee's performance and self-assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>What Went Well</Label>
                  <Textarea
                    value={formData.what_went_well}
                    onChange={(e) => setFormData({ ...formData, what_went_well: e.target.value })}
                    placeholder="Describe accomplishments and strengths..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Areas for Improvement</Label>
                  <Textarea
                    value={formData.needs_improvement}
                    onChange={(e) => setFormData({ ...formData, needs_improvement: e.target.value })}
                    placeholder="Describe growth opportunities..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Goals for Next Period</Label>
                  <Textarea
                    value={formData.goals_next_period}
                    onChange={(e) => setFormData({ ...formData, goals_next_period: e.target.value })}
                    placeholder="Define objectives for the next period..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Overall Rating</Label>
                  {renderStarRating(
                    formData.overall_rating,
                    (v) => setFormData({ ...formData, overall_rating: v })
                  )}
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => updateReviewMutation.mutate({
                      what_went_well: formData.what_went_well,
                      needs_improvement: formData.needs_improvement,
                      goals_next_period: formData.goals_next_period,
                      overall_rating: formData.overall_rating || null,
                    })}
                    disabled={updateReviewMutation.isPending}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Save Draft
                  </Button>
                  <Button onClick={submitManagerReview} disabled={updateReviewMutation.isPending}>
                    <Send className="h-4 w-4 mr-1" />
                    Submit for Acknowledgment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Prep Panel for managers */}
            <AIReviewPrep
              employeeId={employeeId!}
              reviewId={selectedReview!}
              periodStart={currentReview.review_period_start}
              periodEnd={currentReview.review_period_end}
              onDraftApplied={handleDraftApplied}
            />
          </div>
        );
      } else {
        return (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-1">Manager Review in Progress</h3>
            <p className="text-sm text-muted-foreground">
              Your manager is currently reviewing your self-assessment.
            </p>
          </Card>
        );
      }
    }

    // Pending acknowledgment - employee acknowledges
    if (status === "pending_acknowledgment") {
      if (isReviewSubject) {
        return (
          <div className="space-y-4">
            {/* Show both assessments */}
            {currentReview.self_submitted_at && (
              <SelfAssessmentCard
                selfAssessment={{
                  self_what_went_well: currentReview.self_what_went_well,
                  self_needs_improvement: currentReview.self_needs_improvement,
                  self_goals_next_period: currentReview.self_goals_next_period,
                  self_overall_rating: currentReview.self_overall_rating,
                  self_submitted_at: currentReview.self_submitted_at,
                }}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manager's Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">What Went Well</Label>
                  <p className="mt-1 whitespace-pre-wrap">{currentReview.what_went_well || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Areas for Improvement</Label>
                  <p className="mt-1 whitespace-pre-wrap">{currentReview.needs_improvement || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Goals for Next Period</Label>
                  <p className="mt-1 whitespace-pre-wrap">{currentReview.goals_next_period || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Manager's Rating</Label>
                  <div className="mt-1">{renderStarRating(currentReview.overall_rating || 0, undefined, true)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Acknowledge Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Your Comments (Optional)</Label>
                  <Textarea
                    value={acknowledgmentComments}
                    onChange={(e) => setAcknowledgmentComments(e.target.value)}
                    placeholder="Add any comments, questions, or feedback..."
                    rows={4}
                  />
                </div>
                <Button onClick={acknowledgeReview} disabled={updateReviewMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acknowledge Review
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      } else {
        return (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-1">Awaiting Acknowledgment</h3>
            <p className="text-sm text-muted-foreground">
              Waiting for {(employee?.profiles as any)?.full_name || "the employee"} to acknowledge the review.
            </p>
          </Card>
        );
      }
    }

    // Completed - read-only view with PDF export
    if (isCompleted) {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <ReviewPDFExport
              review={currentReview}
              employeeName={(employee?.profiles as any)?.full_name || "Employee"}
              employeePosition={employee?.position || "Position"}
              employeeDepartment={employee?.department || "Department"}
              reviewerName={(currentReview.reviewer as any)?.profiles?.full_name || "Manager"}
              organizationName={(employee?.organization as any)?.name || "Organization"}
              organizationLogo={(employee?.organization as any)?.logo_url}
            />
          </div>

          {currentReview.self_submitted_at && (
            <SelfAssessmentCard
              selfAssessment={{
                self_what_went_well: currentReview.self_what_went_well,
                self_needs_improvement: currentReview.self_needs_improvement,
                self_goals_next_period: currentReview.self_goals_next_period,
                self_overall_rating: currentReview.self_overall_rating,
                self_submitted_at: currentReview.self_submitted_at,
              }}
            />
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Manager's Review</CardTitle>
                <Badge className="bg-green-100 text-green-700">Completed</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">What Went Well</Label>
                <p className="mt-1 whitespace-pre-wrap">{currentReview.what_went_well || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Areas for Improvement</Label>
                <p className="mt-1 whitespace-pre-wrap">{currentReview.needs_improvement || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Goals for Next Period</Label>
                <p className="mt-1 whitespace-pre-wrap">{currentReview.goals_next_period || "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Manager's Rating</Label>
                <div className="mt-1">{renderStarRating(currentReview.overall_rating || 0, undefined, true)}</div>
              </div>
            </CardContent>
          </Card>

          {currentReview.acknowledged_at && (
            <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  Employee Acknowledgment
                </CardTitle>
                <CardDescription>
                  Acknowledged on {format(new Date(currentReview.acknowledged_at), "d MMM yyyy")}
                </CardDescription>
              </CardHeader>
              {currentReview.employee_comments && (
                <CardContent>
                  <p className="whitespace-pre-wrap">{currentReview.employee_comments}</p>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 max-w-6xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => navigateOrg(`/team/${employeeId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Profile
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Performance Reviews</h1>
          <p className="text-muted-foreground">
            {(employee?.profiles as any)?.full_name || "Team Member"}
          </p>
        </div>
        {canManage && !isReviewSubject && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                New Review
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Performance Review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Period Start</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(periodStart, "d MMM yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={periodStart}
                          onSelect={(d) => d && setPeriodStart(d)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Period End</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(periodEnd, "d MMM yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={periodEnd}
                          onSelect={(d) => d && setPeriodEnd(d)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label>Template (Optional)</Label>
                  <div className="mt-2">
                    <ReviewTemplatesDialog
                      onSelectTemplate={setSelectedTemplate}
                      selectedTemplateId={selectedTemplate?.id}
                    />
                    {selectedTemplate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Using: {selectedTemplate.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createReviewMutation.mutate()}
                  disabled={createReviewMutation.isPending}
                >
                  Create Review
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Reviews List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase">Reviews</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : reviews?.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No performance reviews yet</p>
            </Card>
          ) : (
            reviews?.map((review) => (
              <Card
                key={review.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedReview === review.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedReview(review.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(review.review_period_start), "MMM yyyy")} –{" "}
                        {format(new Date(review.review_period_end), "MMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        By {(review.reviewer as any)?.profiles?.full_name || "Unknown"}
                      </p>
                    </div>
                    {getStatusBadge(review.status)}
                  </div>
                  {review.overall_rating && (
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3 w-3",
                            star <= review.overall_rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Review Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedReview && currentReview ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Review: {format(new Date(currentReview.review_period_start), "MMM yyyy")} –{" "}
                        {format(new Date(currentReview.review_period_end), "MMM yyyy")}
                      </CardTitle>
                      <CardDescription>
                        Created {format(new Date(currentReview.created_at), "d MMM yyyy")}
                      </CardDescription>
                    </div>
                    {getStatusBadge(currentReview.status)}
                  </div>
                </CardHeader>
              </Card>

              {renderReviewContent()}
            </>
          ) : (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-1">Select a Review</h3>
              <p className="text-sm text-muted-foreground">
                Choose a review from the list to view details
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceReviewsPage;
