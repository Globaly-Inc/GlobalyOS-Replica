import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subMonths, startOfYear } from "date-fns";
import { ArrowLeft, Plus, FileText, Star, Clock, CheckCircle, Edit, Send } from "lucide-react";
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
  const [formData, setFormData] = useState({
    what_went_well: "",
    needs_improvement: "",
    goals_next_period: "",
    overall_rating: 0,
  });

  // Fetch employee info
  const { data: employee } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, profiles(full_name, avatar_url)")
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
        .select("id")
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
        .select("*, reviewer:employees!performance_reviews_reviewer_id_fkey(profiles(full_name))")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

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
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["performance-reviews", employeeId] });
      setIsCreateOpen(false);
      setSelectedReview(data.id);
      toast.success("Review created");
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-reviews", employeeId] });
      toast.success("Review saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save review");
    },
  });

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
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-700">Submitted</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-700">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const currentReview = reviews?.find((r) => r.id === selectedReview);

  return (
    <>
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
          {canManage && (
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
                          {format(new Date(review.review_period_start), "MMM yyyy")} -{" "}
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

          {/* Review Details / AI Prep */}
          <div className="lg:col-span-2 space-y-4">
            {selectedReview && currentReview ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Review: {format(new Date(currentReview.review_period_start), "MMM yyyy")} -{" "}
                          {format(new Date(currentReview.review_period_end), "MMM yyyy")}
                        </CardTitle>
                        <CardDescription>
                          Created {format(new Date(currentReview.created_at), "d MMM yyyy")}
                        </CardDescription>
                      </div>
                      {getStatusBadge(currentReview.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>What Went Well</Label>
                      <Textarea
                        value={formData.what_went_well || currentReview.what_went_well || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, what_went_well: e.target.value })
                        }
                        placeholder="Describe accomplishments and strengths..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label>Areas for Improvement</Label>
                      <Textarea
                        value={formData.needs_improvement || currentReview.needs_improvement || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, needs_improvement: e.target.value })
                        }
                        placeholder="Describe growth opportunities..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label>Goals for Next Period</Label>
                      <Textarea
                        value={formData.goals_next_period || currentReview.goals_next_period || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, goals_next_period: e.target.value })
                        }
                        placeholder="Define objectives for the next period..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label>Overall Rating</Label>
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, overall_rating: star })
                            }
                          >
                            <Star
                              className={cn(
                                "h-6 w-6 transition-colors",
                                star <= (formData.overall_rating || currentReview.overall_rating || 0)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-muted hover:text-amber-200"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() =>
                          updateReviewMutation.mutate({
                            what_went_well: formData.what_went_well,
                            needs_improvement: formData.needs_improvement,
                            goals_next_period: formData.goals_next_period,
                            overall_rating: formData.overall_rating || null,
                            status: "in_progress",
                          })
                        }
                        disabled={updateReviewMutation.isPending}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Save Draft
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateReviewMutation.mutate({
                            what_went_well: formData.what_went_well,
                            needs_improvement: formData.needs_improvement,
                            goals_next_period: formData.goals_next_period,
                            overall_rating: formData.overall_rating || null,
                            status: "completed",
                            submitted_at: new Date().toISOString(),
                          })
                        }
                        disabled={updateReviewMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Prep Panel */}
                <AIReviewPrep
                  employeeId={employeeId!}
                  reviewId={selectedReview}
                  periodStart={currentReview.review_period_start}
                  periodEnd={currentReview.review_period_end}
                  onDraftApplied={handleDraftApplied}
                />
              </>
            ) : (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium mb-1">Select a Review</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a review from the list to view details and AI prep
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PerformanceReviewsPage;
