import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { z } from "zod";

const kudosSchema = z.object({
  employeeId: z.string().uuid("Please select an employee"),
  comment: z.string().trim().min(10, "Comment must be at least 10 characters").max(1000, "Comment must be less than 1000 characters"),
});

interface Employee {
  id: string;
  profiles: {
    full_name: string;
  };
}

export const GiveKudosDialog = ({ onSuccess, preselectedEmployeeId }: { onSuccess?: () => void; preselectedEmployeeId?: string }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    employeeId: preselectedEmployeeId || "",
    comment: "",
  });

  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open]);

  useEffect(() => {
    if (preselectedEmployeeId) {
      setFormData(prev => ({ ...prev, employeeId: preselectedEmployeeId }));
    }
  }, [preselectedEmployeeId]);

  const loadEmployees = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("employees")
      .select("id, profiles!inner(full_name)")
      .neq("user_id", user.id);

    if (!error && data) {
      setEmployees(data as Employee[]);
    }
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
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (giverError || !giverEmployee) {
        toast({
          title: "Error",
          description: "You need to create your employee profile first",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("kudos").insert({
        employee_id: validated.employeeId,
        given_by_id: giverEmployee.id,
        comment: validated.comment,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Kudos given! 🎉",
          description: "Your appreciation has been shared with the team",
        });
        setFormData({
          employeeId: preselectedEmployeeId || "",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Heart className="h-4 w-4" />
          Give Kudos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Give Kudos to a Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Select Team Member *</Label>
            <Select
              value={formData.employeeId}
              onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
              disabled={!!preselectedEmployeeId}
            >
              <SelectTrigger id="employee">
                <SelectValue placeholder="Choose a team member" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.profiles.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId}</p>}
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
