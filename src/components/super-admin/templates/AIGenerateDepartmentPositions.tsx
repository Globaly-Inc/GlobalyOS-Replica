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
import { Users, Loader2, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Department {
  id: string;
  business_category: string;
  name: string;
  description: string | null;
}

interface AIGenerateDepartmentPositionsProps {
  selectedCategory: string | null;
  departmentsNeedingPositions: Department[];
}

export function AIGenerateDepartmentPositions({
  selectedCategory,
  departmentsNeedingPositions,
}: AIGenerateDepartmentPositionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"selecting" | "generating" | "done" | "error">("selecting");
  const [results, setResults] = useState({ generated: 0, failed: 0, positions: 0 });
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (departmentIds: string[]) => {
      setStatus("generating");
      setProgress(0);
      let generated = 0;
      let failed = 0;
      let totalPositions = 0;
      const total = departmentIds.length;

      for (const deptId of departmentIds) {
        const dept = departmentsNeedingPositions.find(d => d.id === deptId);
        if (!dept) continue;

        try {
          const { data, error } = await supabase.functions.invoke(
            "bulk-generate-template-descriptions",
            {
              body: {
                type: "positions",
                department: dept.name,
                category: dept.business_category,
              },
            }
          );

          if (error) throw error;

          if (data?.positions && data.positions.length > 0) {
            // Insert the generated positions
            const positionRecords = data.positions.map((pos: { 
              name: string; 
              description: string; 
              responsibilities: string[] 
            }, index: number) => ({
              business_category: dept.business_category,
              department_name: dept.name,
              name: pos.name,
              description: pos.description,
              responsibilities: pos.responsibilities,
              sort_order: index + 1,
              is_active: true,
            }));

            const { error: insertError } = await supabase
              .from("template_positions")
              .insert(positionRecords);

            if (insertError) throw insertError;

            totalPositions += data.positions.length;
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

      setResults({ generated, failed, positions: totalPositions });
      return { generated, failed, positions: totalPositions };
    },
    onSuccess: (data) => {
      setStatus("done");
      queryClient.invalidateQueries({ queryKey: ["template-positions"] });
      toast.success(`Generated ${data.positions} positions for ${data.generated} departments`);
    },
    onError: (error: Error) => {
      setStatus("error");
      toast.error(error.message);
    },
  });

  const handleOpen = () => {
    if (departmentsNeedingPositions.length === 0) {
      toast.info("All departments already have positions");
      return;
    }
    setSelectedDepartments([]);
    setStatus("selecting");
    setDialogOpen(true);
  };

  const handleGenerate = () => {
    if (selectedDepartments.length === 0) {
      toast.error("Please select at least one department");
      return;
    }
    generateMutation.mutate(selectedDepartments);
  };

  const handleClose = () => {
    if (status !== "generating") {
      setDialogOpen(false);
      setStatus("selecting");
      setProgress(0);
      setSelectedDepartments([]);
    }
  };

  const toggleDepartment = (id: string) => {
    setSelectedDepartments(prev =>
      prev.includes(id)
        ? prev.filter(d => d !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedDepartments(departmentsNeedingPositions.map(d => d.id));
  };

  const deselectAll = () => {
    setSelectedDepartments([]);
  };

  // Group departments by category for better display
  const groupedDepartments = departmentsNeedingPositions.reduce((acc, dept) => {
    if (!acc[dept.business_category]) {
      acc[dept.business_category] = [];
    }
    acc[dept.business_category].push(dept);
    return acc;
  }, {} as Record<string, Department[]>);

  return (
    <>
      <div className="space-y-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          disabled={departmentsNeedingPositions.length === 0}
          className="w-full justify-start"
        >
          <Users className="h-4 w-4 mr-2" />
          Generate Positions ({departmentsNeedingPositions.length})
        </Button>
        <p className="text-xs text-muted-foreground pl-1">
          Add positions to departments without any
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Department Positions</DialogTitle>
            <DialogDescription>
              Select departments to generate positions for
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {status === "selecting" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedDepartments.length} of {departmentsNeedingPositions.length} selected
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
                  <div className="space-y-4">
                    {Object.entries(groupedDepartments).map(([category, depts]) => (
                      <div key={category}>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          {category}
                        </h4>
                        <div className="space-y-1">
                          {depts.map((dept) => (
                            <div
                              key={dept.id}
                              className="flex items-center space-x-3 p-2 rounded hover:bg-muted cursor-pointer"
                              onClick={() => toggleDepartment(dept.id)}
                            >
                              <Checkbox
                                checked={selectedDepartments.includes(dept.id)}
                                onCheckedChange={() => toggleDepartment(dept.id)}
                              />
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{dept.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {status === "generating" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Generating positions for departments...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {progress}% complete ({selectedDepartments.length} departments)
                </p>
              </div>
            )}

            {status === "done" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <div className="text-center">
                  <h3 className="font-medium">Generation Complete</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {results.positions} positions for {results.generated} departments
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
                  disabled={selectedDepartments.length === 0}
                >
                  Generate ({selectedDepartments.length})
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
