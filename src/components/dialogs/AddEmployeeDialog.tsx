import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { z } from "zod";

const employeeSchema = z.object({
  position: z.string().trim().min(2, "Position is required").max(100, "Position must be less than 100 characters"),
  department: z.string().trim().min(2, "Department is required").max(100, "Department must be less than 100 characters"),
  joinDate: z.string().min(1, "Join date is required"),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  location: z.string().trim().max(200, "Location must be less than 200 characters").optional(),
  superpowers: z.string().max(500, "Superpowers must be less than 500 characters").optional(),
});

export const AddEmployeeDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    position: "",
    department: "",
    joinDate: "",
    phone: "",
    location: "",
    superpowers: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = employeeSchema.parse(formData);
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add an employee profile",
          variant: "destructive",
        });
        return;
      }

      const superpowersArray = validated.superpowers 
        ? validated.superpowers.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      const { error } = await supabase.from("employees").insert({
        user_id: user.id,
        position: validated.position,
        department: validated.department,
        join_date: validated.joinDate,
        phone: validated.phone || null,
        location: validated.location || null,
        superpowers: superpowersArray.length > 0 ? superpowersArray : null,
      });

      if (error) {
        if (error.message.includes("duplicate key")) {
          toast({
            title: "Error",
            description: "An employee profile already exists for this user",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success!",
          description: "Employee profile created successfully",
        });
        setFormData({
          position: "",
          department: "",
          joinDate: "",
          phone: "",
          location: "",
          superpowers: "",
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
          <Plus className="h-4 w-4" />
          Add Employee Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Employee Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="e.g., Project Assistant"
              required
            />
            {errors.position && <p className="text-sm text-destructive">{errors.position}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g., Project Management"
              required
            />
            {errors.department && <p className="text-sm text-destructive">{errors.department}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="joinDate">Join Date *</Label>
            <Input
              id="joinDate"
              type="date"
              value={formData.joinDate}
              onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
              required
            />
            {errors.joinDate && <p className="text-sm text-destructive">{errors.joinDate}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g., 9745944427"
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Kathmandu"
            />
            {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="superpowers">Superpowers (comma-separated)</Label>
            <Textarea
              id="superpowers"
              value={formData.superpowers}
              onChange={(e) => setFormData({ ...formData, superpowers: e.target.value })}
              placeholder="e.g., Project Coordination, Team Communication, Client Management"
              rows={3}
            />
            {errors.superpowers && <p className="text-sm text-destructive">{errors.superpowers}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
