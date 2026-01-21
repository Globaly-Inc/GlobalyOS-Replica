import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, X, Lightbulb, Building2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LearningRecord {
  id: string;
  business_category: string;
  department_name: string | null;
  position_name: string | null;
  position_department: string | null;
  action: string;
  organization_id: string;
  created_at: string;
  processed_at: string | null;
  added_to_templates: boolean;
}

interface TemplateLearningPanelProps {
  learningRecords: LearningRecord[];
  isLoading: boolean;
}

export function TemplateLearningPanel({
  learningRecords,
  isLoading,
}: TemplateLearningPanelProps) {
  const queryClient = useQueryClient();

  // Add to templates mutation
  const addToTemplatesMutation = useMutation({
    mutationFn: async (record: LearningRecord) => {
      if (record.department_name && !record.position_name) {
        // Add as department
        const { error } = await supabase
          .from("template_departments")
          .upsert(
            {
              business_category: record.business_category,
              name: record.department_name,
            },
            { onConflict: "business_category,name" }
          );
        if (error) throw error;
      } else if (record.position_name) {
        // Add as position
        const departmentName = record.position_department || "General";
        
        // Ensure department exists first
        await supabase
          .from("template_departments")
          .upsert(
            {
              business_category: record.business_category,
              name: departmentName,
            },
            { onConflict: "business_category,name" }
          );

        const { error } = await supabase
          .from("template_positions")
          .upsert(
            {
              business_category: record.business_category,
              department_name: departmentName,
              name: record.position_name,
            },
            { onConflict: "business_category,department_name,name" }
          );
        if (error) throw error;
      }

      // Mark as processed
      const { error: updateError } = await supabase
        .from("org_structure_learning")
        .update({
          processed_at: new Date().toISOString(),
          added_to_templates: true,
        })
        .eq("id", record.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-learning"] });
      queryClient.invalidateQueries({ queryKey: ["template-departments"] });
      queryClient.invalidateQueries({ queryKey: ["template-positions"] });
      toast.success("Added to templates");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from("org_structure_learning")
        .update({
          processed_at: new Date().toISOString(),
          added_to_templates: false,
        })
        .eq("id", recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-learning"] });
      toast.success("Record dismissed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk add all
  const bulkAddMutation = useMutation({
    mutationFn: async () => {
      for (const record of learningRecords) {
        await addToTemplatesMutation.mutateAsync(record);
      }
    },
    onSuccess: () => {
      toast.success("All records added to templates");
    },
  });

  // Group by type for display
  const departmentRecords = learningRecords.filter(
    (r) => r.department_name && !r.position_name
  );
  const positionRecords = learningRecords.filter((r) => r.position_name);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (learningRecords.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No pending additions</h3>
          <p className="text-sm text-muted-foreground">
            User-created departments and positions will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Pending User Additions</h3>
          <p className="text-sm text-muted-foreground">
            Review and add custom items from organizations to the template database
          </p>
        </div>
        <Button
          onClick={() => bulkAddMutation.mutate()}
          disabled={bulkAddMutation.isPending}
        >
          {bulkAddMutation.isPending && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Add All to Templates
        </Button>
      </div>

      {/* Department Records */}
      {departmentRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Custom Departments ({departmentRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge variant="outline">{record.business_category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.department_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.action === "added" ? "default" : "secondary"}
                      >
                        {record.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(record.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToTemplatesMutation.mutate(record)}
                          disabled={addToTemplatesMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissMutation.mutate(record.id)}
                          disabled={dismissMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Position Records */}
      {positionRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Custom Positions ({positionRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position Name</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positionRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge variant="outline">{record.business_category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {record.position_department || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.position_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.action === "added" ? "default" : "secondary"}
                      >
                        {record.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(record.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToTemplatesMutation.mutate(record)}
                          disabled={addToTemplatesMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissMutation.mutate(record.id)}
                          disabled={dismissMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
