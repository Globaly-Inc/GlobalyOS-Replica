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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { LayoutTemplate, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BusinessCategory } from "@/constants/businessCategories";

interface AIGenerateCategoryStructureProps {
  selectedCategory: string | null;
  emptyCategoriesCount: number;
  allCategories: BusinessCategory[];
  existingDepartmentCategories: Set<string>;
}

export function AIGenerateCategoryStructure({
  selectedCategory,
  emptyCategoriesCount,
  allCategories,
  existingDepartmentCategories,
}: AIGenerateCategoryStructureProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"selecting" | "generating" | "done" | "error">("selecting");
  const [results, setResults] = useState({ generated: 0, failed: 0 });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Get empty categories
  const emptyCategories = allCategories.filter(c => !existingDepartmentCategories.has(c.value));

  const generateMutation = useMutation({
    mutationFn: async (categories: string[]) => {
      setStatus("generating");
      setProgress(0);
      let generated = 0;
      let failed = 0;
      const total = categories.length;

      for (const categoryValue of categories) {
        const category = allCategories.find(c => c.value === categoryValue);
        try {
          const { data, error } = await supabase.functions.invoke(
            "generate-category-structure",
            {
              body: {
                category: categoryValue,
                categoryLabel: category?.label || categoryValue,
              },
            }
          );

          if (error) throw error;

          if (data?.success) {
            generated++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error("Failed to generate for category:", categoryValue, err);
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
      toast.success(`Generated structure for ${data.generated} categories`);
    },
    onError: (error: Error) => {
      setStatus("error");
      toast.error(error.message);
    },
  });

  const handleOpen = () => {
    if (emptyCategoriesCount === 0) {
      toast.info("All categories already have departments");
      return;
    }
    
    // Pre-select based on context
    if (selectedCategory && !existingDepartmentCategories.has(selectedCategory)) {
      setSelectedCategories([selectedCategory]);
    } else {
      setSelectedCategories([]);
    }
    
    setStatus("selecting");
    setDialogOpen(true);
  };

  const handleGenerate = () => {
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }
    generateMutation.mutate(selectedCategories);
  };

  const handleClose = () => {
    if (status !== "generating") {
      setDialogOpen(false);
      setStatus("selecting");
      setProgress(0);
      setSelectedCategories([]);
    }
  };

  const toggleCategory = (value: string) => {
    setSelectedCategories(prev =>
      prev.includes(value)
        ? prev.filter(c => c !== value)
        : [...prev, value]
    );
  };

  const selectAll = () => {
    setSelectedCategories(emptyCategories.map(c => c.value));
  };

  const deselectAll = () => {
    setSelectedCategories([]);
  };

  return (
    <>
      <div className="space-y-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          disabled={emptyCategoriesCount === 0}
          className="w-full justify-start"
        >
          <LayoutTemplate className="h-4 w-4 mr-2" />
          Generate Structure ({emptyCategoriesCount})
        </Button>
        <p className="text-xs text-muted-foreground pl-1">
          Create departments & positions for empty categories
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Category Structure</DialogTitle>
            <DialogDescription>
              Select categories to generate departments and positions for
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {status === "selecting" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedCategories.length} of {emptyCategories.length} selected
                  </span>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-64 border rounded-md p-3">
                  <div className="space-y-2">
                    {emptyCategories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <div
                          key={category.value}
                          className="flex items-center space-x-3 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => toggleCategory(category.value)}
                        >
                          <Checkbox
                            checked={selectedCategories.includes(category.value)}
                            onCheckedChange={() => toggleCategory(category.value)}
                          />
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{category.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}

            {status === "generating" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Generating organizational structures...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {progress}% complete ({selectedCategories.length} categories)
                </p>
              </div>
            )}

            {status === "done" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <div className="text-center">
                  <h3 className="font-medium">Generation Complete</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created structure for {results.generated} categories
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
            {status === "selecting" ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={selectedCategories.length === 0}
                >
                  Generate ({selectedCategories.length})
                </Button>
              </>
            ) : (
              <Button
                onClick={handleClose}
                disabled={status === "generating"}
              >
                {status === "generating" ? "Please wait..." : "Close"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
