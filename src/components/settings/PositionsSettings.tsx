import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Plus, Pencil, Trash2, Loader2, Sparkles, X, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useDepartments } from "@/hooks/useOrganizationData";

interface Position {
  id: string;
  name: string;
  department: string | null;
  description: string | null;
  responsibilities: string[] | null;
  ai_generated_at: string | null;
  created_at: string;
}

export const PositionsSettings = () => {
  const { currentOrg } = useOrganization();
  const { data: departments = [] } = useDepartments();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [positionName, setPositionName] = useState("");
  const [positionDepartment, setPositionDepartment] = useState("");
  const [positionDescription, setPositionDescription] = useState("");
  const [positionResponsibilities, setPositionResponsibilities] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  // Delete confirmation state
  const [deletePositionId, setDeletePositionId] = useState<string | null>(null);

  // Bulk AI update state
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const { data: positionsData, error } = await supabase
        .from("positions")
        .select("id, name, department, description, responsibilities, ai_generated_at, created_at")
        .eq("organization_id", currentOrg.id)
        .order("name");

      if (error) throw error;
      setPositions(positionsData || []);
    } catch (error: any) {
      toast.error("Error loading positions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDescription = async (mode: "generate" | "improve" = "generate") => {
    if (!currentOrg || !positionName.trim()) {
      toast.error("Position name required");
      return;
    }

    setGeneratingAI(true);
    try {
      const keywordsArray = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const { data, error } = await supabase.functions.invoke('generate-position-description', {
        body: {
          positionId: editingPosition?.id,
          positionName: positionName.trim(),
          department: positionDepartment.trim() || null,
          keywords: keywordsArray,
          organizationId: currentOrg.id,
          forceRegenerate: true,
          mode,
          existingDescription: mode === "improve" ? positionDescription : undefined,
          existingResponsibilities: mode === "improve" ? positionResponsibilities : undefined,
          industry: currentOrg.industry, // Pass organization's industry for better context
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setPositionDescription(data.description || "");
      setPositionResponsibilities(data.responsibilities || []);

      toast.success(mode === "improve" ? "Description improved" : "Description generated");
    } catch (error: any) {
      toast.error("Error generating description: " + error.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSavePosition = async () => {
    if (!currentOrg || !positionName.trim()) return;
    setSaving(true);
    try {
      const positionData = {
        name: positionName.trim(),
        department: positionDepartment.trim() || null,
        description: positionDescription.trim() || null,
        responsibilities: positionResponsibilities.filter(r => r.trim()),
        ai_generated_at: positionDescription ? new Date().toISOString() : null,
      };

      if (editingPosition) {
        const { error } = await supabase
          .from("positions")
          .update(positionData)
          .eq("id", editingPosition.id);

        if (error) throw error;
        toast.success("Position updated");
      } else {
        const { error } = await supabase.from("positions").insert({
          ...positionData,
          organization_id: currentOrg.id,
        });

        if (error) throw error;
        toast.success("Position created");
      }

      resetDialog();
      loadData();
    } catch (error: any) {
      toast.error("Error saving position: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePosition = async () => {
    if (!deletePositionId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("positions")
        .delete()
        .eq("id", deletePositionId);

      if (error) throw error;
      toast.success("Position deleted");
      setDeletePositionId(null);
      loadData();
    } catch (error: any) {
      toast.error("Error deleting position: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAIUpdate = async () => {
    if (!currentOrg) return;

    const emptyPositions = positions.filter(
      p => !p.description || !p.responsibilities?.length
    );

    if (emptyPositions.length === 0) {
      toast.success("All positions already have AI-generated content");
      return;
    }

    setBulkUpdating(true);
    setBulkProgress({ current: 0, total: emptyPositions.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < emptyPositions.length; i++) {
      const position = emptyPositions[i];
      setBulkProgress({ current: i + 1, total: emptyPositions.length });

      try {
        const { data, error } = await supabase.functions.invoke('generate-position-description', {
          body: {
            positionId: position.id,
            positionName: position.name,
            department: position.department,
            keywords: [],
            organizationId: currentOrg.id,
            forceRegenerate: true,
            mode: "generate",
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const { error: updateError } = await supabase
          .from("positions")
          .update({
            description: data.description,
            responsibilities: data.responsibilities,
            ai_generated_at: new Date().toISOString(),
          })
          .eq("id", position.id);

        if (updateError) throw updateError;
        successCount++;
      } catch (error) {
        console.error(`Error updating position ${position.name}:`, error);
        errorCount++;
      }
    }

    setBulkUpdating(false);
    loadData();

    if (successCount > 0) {
      toast.success(`Updated ${successCount} position${successCount > 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to update ${errorCount} position${errorCount > 1 ? 's' : ''}`);
    }
  };

  const handleAddResponsibility = () => {
    setPositionResponsibilities([...positionResponsibilities, ""]);
  };

  const handleRemoveResponsibility = (index: number) => {
    setPositionResponsibilities(positionResponsibilities.filter((_, i) => i !== index));
  };

  const handleResponsibilityChange = (index: number, value: string) => {
    const updated = [...positionResponsibilities];
    updated[index] = value;
    setPositionResponsibilities(updated);
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingPosition(null);
    setPositionName("");
    setPositionDepartment("");
    setPositionDescription("");
    setPositionResponsibilities([]);
    setKeywords("");
  };

  const openEditPosition = (position: Position) => {
    setEditingPosition(position);
    setPositionName(position.name);
    setPositionDepartment(position.department || "");
    setPositionDescription(position.description || "");
    setPositionResponsibilities(position.responsibilities || []);
    setKeywords("");
    setDialogOpen(true);
  };

  const openNewPosition = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const emptyPositionsCount = positions.filter(
    p => !p.description || !p.responsibilities?.length
  ).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Positions
            </CardTitle>
            <CardDescription>
              Manage positions and job descriptions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {emptyPositionsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkAIUpdate}
                disabled={bulkUpdating}
              >
                {bulkUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {bulkProgress.current}/{bulkProgress.total}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    AI Update ({emptyPositionsCount})
                  </>
                )}
              </Button>
            )}
            <Button onClick={openNewPosition} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No positions yet</p>
              <p className="text-sm">Add positions to your organization</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>
                      {pos.department ? (
                        <Badge variant="outline">{pos.department}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pos.description ? (
                        <div className="flex items-center gap-1">
                          {pos.ai_generated_at && (
                            <Sparkles className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {pos.description}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No description</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditPosition(pos)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletePositionId(pos.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Position Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPosition ? "Edit Position" : "Add Position"}
            </DialogTitle>
            <DialogDescription>
              Define the position details and generate AI descriptions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="positionName">Position Name *</Label>
                <Input
                  id="positionName"
                  value={positionName}
                  onChange={(e) => setPositionName(e.target.value)}
                  placeholder="e.g., Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="positionDepartment">Department</Label>
                <Select
                  value={positionDepartment}
                  onValueChange={setPositionDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">AI Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., React, TypeScript, team lead"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleGenerateDescription("generate")}
                disabled={generatingAI || !positionName.trim()}
              >
                {generatingAI ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Description
              </Button>
              {positionDescription && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGenerateDescription("improve")}
                  disabled={generatingAI}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Improve
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="positionDescription">Description</Label>
              <Textarea
                id="positionDescription"
                value={positionDescription}
                onChange={(e) => setPositionDescription(e.target.value)}
                placeholder="Position description..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Responsibilities</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddResponsibility}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {positionResponsibilities.map((resp, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={resp}
                      onChange={(e) => handleResponsibilityChange(index, e.target.value)}
                      placeholder="Enter responsibility..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveResponsibility(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Cancel
            </Button>
            <Button onClick={handleSavePosition} disabled={saving || !positionName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingPosition ? "Save Changes" : "Add Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePositionId}
        onOpenChange={() => setDeletePositionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this position? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePosition}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
