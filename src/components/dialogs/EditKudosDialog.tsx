import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useOrganization } from "@/hooks/useOrganization";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, X, Search } from "lucide-react";

// Helper to get plain text length from HTML
const getTextLength = (html: string): number => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim().length;
};

const kudosSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "Please select at least one team member"),
  comment: z.string()
    .refine((val) => getTextLength(val) >= 10, { message: "Message must be at least 10 characters" })
    .refine((val) => getTextLength(val) <= 5000, { message: "Message must be less than 5000 characters" }),
});

interface Employee {
  id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface EditKudosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kudosId: string;
  batchId?: string;
  initialComment: string;
  initialRecipientIds: string[];
  givenById: string;
  onSuccess?: () => void;
}

export const EditKudosDialog = ({
  open,
  onOpenChange,
  kudosId,
  batchId,
  initialComment,
  initialRecipientIds,
  givenById,
  onSuccess,
}: EditKudosDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectOpen, setSelectOpen] = useState(false);

  const [formData, setFormData] = useState({
    employeeIds: initialRecipientIds,
    comment: initialComment,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        employeeIds: initialRecipientIds,
        comment: initialComment,
      });
      setErrors({});
      setSearchQuery("");
    }
  }, [open, initialRecipientIds, initialComment]);

  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open, currentOrg]);

  const loadEmployees = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("employees")
      .select("id, profiles!inner(full_name, avatar_url)")
      .eq("organization_id", currentOrg.id)
      .neq("id", givenById) // Exclude the giver from recipients
      .order("profiles(full_name)");

    if (!error && data) {
      setEmployees(data as Employee[]);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(employeeId)
        ? prev.employeeIds.filter(id => id !== employeeId)
        : [...prev.employeeIds, employeeId]
    }));
  };

  const removeEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.filter(id => id !== employeeId)
    }));
  };

  const getSelectedNames = () => {
    return formData.employeeIds.map(id => {
      const emp = employees.find(e => e.id === id);
      return emp?.profiles.full_name || "";
    }).filter(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = kudosSchema.parse(formData);
      setLoading(true);

      // Get the giver's employee info for organization_id
      const { data: giverEmployee } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("id", givenById)
        .single();

      if (!giverEmployee) {
        toast({
          title: "Error",
          description: "Could not find the original kudos giver",
          variant: "destructive",
        });
        return;
      }

      // Delete all existing kudos in the batch (or single kudos)
      if (batchId) {
        await supabase.from("kudos").delete().eq("batch_id", batchId);
      } else {
        await supabase.from("kudos").delete().eq("id", kudosId);
      }

      // Create new batch_id if multiple recipients
      const newBatchId = validated.employeeIds.length > 1 ? crypto.randomUUID() : null;

      // Insert new kudos records
      const kudosRecords = validated.employeeIds.map(employeeId => ({
        employee_id: employeeId,
        given_by_id: givenById,
        comment: validated.comment,
        organization_id: giverEmployee.organization_id,
        batch_id: newBatchId,
      }));

      const { error } = await supabase.from("kudos").insert(kudosRecords);

      if (error) {
        throw error;
      }

      toast({
        title: "Kudos updated",
        description: "The kudos has been successfully updated.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
      } else if (err instanceof Error) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedNames = getSelectedNames();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Kudos</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Recipients *</Label>
            <Popover open={selectOpen} onOpenChange={setSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={selectOpen}
                  className="w-full justify-between font-normal h-auto min-h-10"
                >
                  <span className="text-muted-foreground">
                    {formData.employeeIds.length === 0 
                      ? "Choose team members..." 
                      : `${formData.employeeIds.length} selected`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search team members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-1">
                    {employees
                      .filter(emp => emp.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => toggleEmployee(employee.id)}
                        >
                          <Checkbox
                            checked={formData.employeeIds.includes(employee.id)}
                            className="pointer-events-none"
                          />
                          <Avatar className="h-6 w-6">
                            {employee.profiles.avatar_url && <AvatarImage src={employee.profiles.avatar_url} />}
                            <AvatarFallback className="text-xs bg-muted">
                              {employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{employee.profiles.full_name}</span>
                        </div>
                      ))}
                    {employees.filter(emp => emp.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No team members found</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            
            {selectedNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedNames.map((name, idx) => {
                  const employeeId = formData.employeeIds[idx];
                  return (
                    <Badge key={employeeId} variant="secondary" className="gap-1">
                      {name}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeEmployee(employeeId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
            {errors.employeeIds && <p className="text-sm text-destructive">{errors.employeeIds}</p>}
          </div>

          <div className="space-y-2">
            <Label>Message *</Label>
            <RichTextEditor
              value={formData.comment}
              onChange={(value) => setFormData({ ...formData, comment: value })}
              placeholder="Edit your kudos message..."
              minHeight="120px"
            />
            {errors.comment && <p className="text-sm text-destructive">{errors.comment}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
