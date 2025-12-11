import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Heart, ChevronDown, X } from "lucide-react";
import { z } from "zod";
import { useOrganization } from "@/hooks/useOrganization";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const kudosSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "Please select at least one team member"),
  comment: z.string().trim().min(10, "Comment must be at least 10 characters").max(1000, "Comment must be less than 1000 characters"),
});

interface Employee {
  id: string;
  profiles: {
    full_name: string;
  };
}

export const GiveKudosDialog = ({ onSuccess, preselectedEmployeeId, variant = "default" }: { onSuccess?: () => void; preselectedEmployeeId?: string; variant?: "default" | "outline" }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectOpen, setSelectOpen] = useState(false);

  const [formData, setFormData] = useState({
    employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : [] as string[],
    comment: "",
  });

  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open]);

  useEffect(() => {
    if (preselectedEmployeeId) {
      setFormData(prev => ({ ...prev, employeeIds: [preselectedEmployeeId] }));
    }
  }, [preselectedEmployeeId]);

  const loadEmployees = async () => {
    if (!currentOrg) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("employees")
      .select("id, profiles!inner(full_name)")
      .eq("organization_id", currentOrg.id)
      .neq("user_id", user.id);

    if (!error && data) {
      setEmployees(data as Employee[]);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    if (preselectedEmployeeId) return;
    setFormData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(employeeId)
        ? prev.employeeIds.filter(id => id !== employeeId)
        : [...prev.employeeIds, employeeId]
    }));
  };

  const removeEmployee = (employeeId: string) => {
    if (preselectedEmployeeId) return;
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to give kudos",
          variant: "destructive",
        });
        return;
      }

      // Get the current user's employee record
      const { data: giverEmployee, error: giverError } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg?.id)
        .single();

      if (giverError || !giverEmployee) {
        toast({
          title: "Error",
          description: "You need to create your employee profile first",
          variant: "destructive",
        });
        return;
      }

      // Insert kudos for each selected employee
      const kudosRecords = validated.employeeIds.map(employeeId => ({
        employee_id: employeeId,
        given_by_id: giverEmployee.id,
        comment: validated.comment,
        organization_id: giverEmployee.organization_id,
      }));

      const { error } = await supabase.from("kudos").insert(kudosRecords);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Kudos given! 🎉",
          description: `Your appreciation has been shared with ${validated.employeeIds.length} team member${validated.employeeIds.length > 1 ? 's' : ''}`,
        });
        setFormData({
          employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : [],
          comment: "",
        });
        setOpen(false);
        onSuccess?.();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedNames = getSelectedNames();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className="gap-2">
          <Heart className="h-4 w-4" />
          Give Kudos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Give Kudos to Team Members</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Team Members *</Label>
            <Popover open={selectOpen} onOpenChange={setSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={selectOpen}
                  className="w-full justify-between font-normal h-auto min-h-10"
                  disabled={!!preselectedEmployeeId}
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
                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-1">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => toggleEmployee(employee.id)}
                      >
                        <Checkbox
                          checked={formData.employeeIds.includes(employee.id)}
                          onCheckedChange={() => toggleEmployee(employee.id)}
                        />
                        <span className="text-sm">{employee.profiles.full_name}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            
            {selectedNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedNames.map((name, idx) => (
                  <Badge key={formData.employeeIds[idx]} variant="secondary" className="gap-1">
                    {name}
                    {!preselectedEmployeeId && (
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeEmployee(formData.employeeIds[idx])}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            )}
            {errors.employeeIds && <p className="text-sm text-destructive">{errors.employeeIds}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Message *</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Share what you appreciate about this person..."
              rows={5}
              required
            />
            {errors.comment && <p className="text-sm text-destructive">{errors.comment}</p>}
            <p className="text-xs text-muted-foreground">
              {formData.comment.length}/1000 characters
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Sending..." : "Send Kudos"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
