import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface TemplateDepartment {
  id: string;
  business_category: string;
  name: string;
  description: string | null;
}

interface TemplatePosition {
  id: string;
  business_category: string;
  department_name: string;
  name: string;
  description: string | null;
  responsibilities: string[] | null;
}

interface AIBulkDescriptionGeneratorProps {
  selectedCategory: string | null;
  departments: TemplateDepartment[];
  positions: TemplatePosition[];
}

export function AIBulkDescriptionGenerator({
  selectedCategory,
  departments,
  positions,
}: AIBulkDescriptionGeneratorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [results, setResults] = useState({ generated: 0, failed: 0 });
  const queryClient = useQueryClient();

  // Count items needing descriptions
  const deptsNeedingDesc = departments.filter((d) => !d.description);
  const positionsNeedingDesc = positions.filter((p) => !p.description || !p.responsibilities?.length);

  const totalNeedingDesc = deptsNeedingDesc.length + positionsNeedingDesc.length;

  const generateMutation = useMutation({
    mutationFn: async () => {
      setStatus("generating");
      setProgress(0);
      let generated = 0;
      let failed = 0;
      const total = totalNeedingDesc;

      // Generate department descriptions
      for (const dept of deptsNeedingDesc) {
        try {
          const { data, error } = await supabase.functions.invoke(
            "bulk-generate-template-descriptions",
            {
              body: {
                type: "department",
                id: dept.id,
                name: dept.name,
                category: dept.business_category,
              },
            }
          );

          if (error) throw error;

          if (data?.description) {
            await supabase
              .from("template_departments")
              .update({ description: data.description })
              .eq("id", dept.id);
            generated++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error("Failed to generate for department:", dept.name, err);
          failed++;
        }
        setProgress(Math.round(((generated + failed) / total) * 100));
      }

      // Generate position descriptions
      for (const pos of positionsNeedingDesc) {
        try {
          const { data, error } = await supabase.functions.invoke(
            "bulk-generate-template-descriptions",
            {
              body: {
                type: "position",
                id: pos.id,
                name: pos.name,
                department: pos.department_name,
                category: pos.business_category,
              },
            }
          );

          if (error) throw error;

          if (data?.description) {
            await supabase
              .from("template_positions")
              .update({
                description: data.description,
                responsibilities: data.responsibilities || null,
              })
              .eq("id", pos.id);
            generated++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error("Failed to generate for position:", pos.name, err);
          failed++;
        }
        setProgress(Math.round(((generated + failed) / total) * 100));
      }

      setResults({ generated, failed });
      return { generated, failed };
    },
    onSuccess: (data) => {
      setStatus("done");
      queryClient.invalidateQueries({ queryKey: ["template-departments"] });
      queryClient.invalidateQueries({ queryKey: ["template-positions"] });
      toast.success(`Generated ${data.generated} descriptions`);
    },
    onError: (error: Error) => {
      setStatus("error");
      toast.error(error.message);
    },
  });

  const handleGenerate = () => {
    if (totalNeedingDesc === 0) {
      toast.info("All items already have descriptions");
      return;
    }
    setDialogOpen(true);
    generateMutation.mutate();
  };

  const handleClose = () => {
    if (status !== "generating") {
      setDialogOpen(false);
      setStatus("idle");
      setProgress(0);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={totalNeedingDesc === 0}
        className="w-full"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Generate ({totalNeedingDesc})
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Description Generator</DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? `Generating descriptions for ${selectedCategory}`
                : "Generating descriptions for all categories"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {status === "generating" && (
              <>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Generating descriptions...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {progress}% complete
                </p>
              </>
            )}

            {status === "done" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <h3 className="font-medium">Generation Complete</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generated {results.generated} descriptions
                    {results.failed > 0 && `, ${results.failed} failed`}
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div className="text-center">
                  <h3 className="font-medium">Generation Failed</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    An error occurred during generation
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={handleClose}
              disabled={status === "generating"}
            >
              {status === "generating" ? "Please wait..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
