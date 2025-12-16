import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Star, Trash2, Check, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Competency {
  name: string;
  description: string;
  weight: number;
}

interface ReviewTemplate {
  id: string;
  name: string;
  description: string | null;
  what_went_well_prompts: string[];
  needs_improvement_prompts: string[];
  goals_prompts: string[];
  competencies: Competency[];
  is_default: boolean;
  organization_id: string;
}

const BUILT_IN_TEMPLATES: Omit<ReviewTemplate, "id" | "organization_id">[] = [
  {
    name: "Standard Review",
    description: "General-purpose performance review template",
    what_went_well_prompts: [
      "Key achievements this period",
      "Skills demonstrated",
      "Positive team contributions",
    ],
    needs_improvement_prompts: [
      "Areas requiring development",
      "Skills to improve",
      "Communication or collaboration gaps",
    ],
    goals_prompts: [
      "Performance targets for next period",
      "Professional development goals",
      "Team contribution objectives",
    ],
    competencies: [
      { name: "Job Knowledge", description: "Understanding of role requirements", weight: 20 },
      { name: "Quality of Work", description: "Accuracy and thoroughness", weight: 25 },
      { name: "Communication", description: "Clear and effective communication", weight: 20 },
      { name: "Teamwork", description: "Collaboration and support", weight: 20 },
      { name: "Initiative", description: "Proactive approach to work", weight: 15 },
    ],
    is_default: true,
  },
  {
    name: "Leadership Review",
    description: "For managers and team leads",
    what_went_well_prompts: [
      "Team achievements under leadership",
      "Strategic decisions and outcomes",
      "People development initiatives",
    ],
    needs_improvement_prompts: [
      "Leadership skill gaps",
      "Delegation opportunities",
      "Team feedback areas",
    ],
    goals_prompts: [
      "Team performance targets",
      "Leadership development goals",
      "Strategic objectives",
    ],
    competencies: [
      { name: "Strategic Thinking", description: "Vision and planning", weight: 20 },
      { name: "People Management", description: "Team leadership and development", weight: 25 },
      { name: "Decision Making", description: "Timely and effective decisions", weight: 20 },
      { name: "Communication", description: "Clear direction and feedback", weight: 20 },
      { name: "Business Acumen", description: "Understanding of business impact", weight: 15 },
    ],
    is_default: false,
  },
  {
    name: "Technical Review",
    description: "For technical and engineering roles",
    what_went_well_prompts: [
      "Technical achievements and innovations",
      "Code quality and best practices",
      "Problem-solving examples",
    ],
    needs_improvement_prompts: [
      "Technical skill gaps",
      "Documentation improvements",
      "Collaboration with non-technical teams",
    ],
    goals_prompts: [
      "Technical certifications or learning",
      "Architecture or system improvements",
      "Mentoring junior team members",
    ],
    competencies: [
      { name: "Technical Skills", description: "Core technical competencies", weight: 30 },
      { name: "Problem Solving", description: "Analytical and creative solutions", weight: 25 },
      { name: "Code Quality", description: "Clean, maintainable, tested code", weight: 20 },
      { name: "Learning", description: "Staying current with technology", weight: 15 },
      { name: "Collaboration", description: "Working with team and stakeholders", weight: 10 },
    ],
    is_default: false,
  },
  {
    name: "Sales Performance",
    description: "For sales and business development roles",
    what_went_well_prompts: [
      "Revenue achievements and key wins",
      "Client relationship successes",
      "Pipeline growth",
    ],
    needs_improvement_prompts: [
      "Lost opportunities analysis",
      "Presentation or negotiation skills",
      "CRM and process adherence",
    ],
    goals_prompts: [
      "Revenue and quota targets",
      "New market or client segments",
      "Sales skills development",
    ],
    competencies: [
      { name: "Sales Results", description: "Achievement against targets", weight: 35 },
      { name: "Client Relationships", description: "Building lasting partnerships", weight: 25 },
      { name: "Product Knowledge", description: "Understanding offerings", weight: 15 },
      { name: "Negotiation", description: "Deal closing skills", weight: 15 },
      { name: "Process Adherence", description: "Following sales methodology", weight: 10 },
    ],
    is_default: false,
  },
];

interface ReviewTemplatesDialogProps {
  onSelectTemplate: (template: ReviewTemplate | null) => void;
  selectedTemplateId?: string | null;
}

export const ReviewTemplatesDialog = ({ onSelectTemplate, selectedTemplateId }: ReviewTemplatesDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    what_went_well_prompts: "",
    needs_improvement_prompts: "",
    goals_prompts: "",
  });
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["review-templates", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("review_templates")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        competencies: Array.isArray(t.competencies) ? t.competencies : [],
      })) as ReviewTemplate[];
    },
    enabled: !!currentOrg?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg?.id) throw new Error("No organization");
      const { data, error } = await supabase
        .from("review_templates")
        .insert({
          organization_id: currentOrg.id,
          name: newTemplate.name,
          description: newTemplate.description || null,
          what_went_well_prompts: newTemplate.what_went_well_prompts.split("\n").filter(Boolean),
          needs_improvement_prompts: newTemplate.needs_improvement_prompts.split("\n").filter(Boolean),
          goals_prompts: newTemplate.goals_prompts.split("\n").filter(Boolean),
          competencies: [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-templates"] });
      setIsCreating(false);
      setNewTemplate({ name: "", description: "", what_went_well_prompts: "", needs_improvement_prompts: "", goals_prompts: "" });
      toast.success("Template created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("review_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-templates"] });
      toast.success("Template deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleUseBuiltIn = async (template: Omit<ReviewTemplate, "id" | "organization_id">) => {
    if (!currentOrg?.id) return;
    
    const { data, error } = await supabase
      .from("review_templates")
      .insert({
        organization_id: currentOrg.id,
        name: template.name,
        description: template.description,
        what_went_well_prompts: template.what_went_well_prompts,
        needs_improvement_prompts: template.needs_improvement_prompts,
        goals_prompts: template.goals_prompts,
        competencies: template.competencies as any,
        is_default: template.is_default,
      })
      .select()
      .single();
    
    if (error) {
      toast.error(error.message);
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["review-templates"] });
    const competencies = Array.isArray(data.competencies) 
      ? (data.competencies as unknown as Competency[]) 
      : [];
    const result: ReviewTemplate = { ...data, competencies };
    onSelectTemplate(result);
    setIsOpen(false);
    toast.success(`Using ${template.name} template`);
  };

  const handleSelectTemplate = (template: ReviewTemplate) => {
    onSelectTemplate(template);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          {selectedTemplateId ? "Change Template" : "Use Template"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Templates</DialogTitle>
        </DialogHeader>

        {isCreating ? (
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., Quarterly Review"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label>What Went Well Prompts (one per line)</Label>
              <Textarea
                value={newTemplate.what_went_well_prompts}
                onChange={(e) => setNewTemplate({ ...newTemplate, what_went_well_prompts: e.target.value })}
                placeholder="Key achievements&#10;Skills demonstrated&#10;Team contributions"
                rows={3}
              />
            </div>
            <div>
              <Label>Areas for Improvement Prompts (one per line)</Label>
              <Textarea
                value={newTemplate.needs_improvement_prompts}
                onChange={(e) => setNewTemplate({ ...newTemplate, needs_improvement_prompts: e.target.value })}
                placeholder="Development areas&#10;Skills to improve"
                rows={3}
              />
            </div>
            <div>
              <Label>Goals Prompts (one per line)</Label>
              <Textarea
                value={newTemplate.goals_prompts}
                onChange={(e) => setNewTemplate({ ...newTemplate, goals_prompts: e.target.value })}
                placeholder="Performance targets&#10;Professional development"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!newTemplate.name || createMutation.isPending}>
                Create Template
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Organization Templates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">Your Templates</h3>
                <Button size="sm" variant="ghost" onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </div>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedTemplateId === template.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            {template.name}
                            {template.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                          </p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(template.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No custom templates yet. Create one or use a built-in template below.
                </p>
              )}
            </div>

            {/* Built-in Templates */}
            <div>
              <h3 className="font-medium text-sm mb-2">Built-in Templates</h3>
              <div className="space-y-2">
                {BUILT_IN_TEMPLATES.map((template, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer transition-all hover:shadow-md"
                    onClick={() => handleUseBuiltIn(template)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            {template.name}
                            {template.is_default && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Recommended
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Plus className="h-4 w-4 mr-1" />
                          Use
                        </Button>
                      </div>
                      {template.competencies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.competencies.map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {c.name} ({c.weight}%)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { onSelectTemplate(null); setIsOpen(false); }}>
                No Template
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewTemplatesDialog;
