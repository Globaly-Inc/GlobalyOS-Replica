import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const updateSchema = z.object({
  content: z.string().trim().min(10, "Content must be at least 10 characters").max(1000, "Content must be less than 1000 characters"),
  type: z.enum(["win", "announcement", "achievement"], { errorMap: () => ({ message: "Please select a type" }) }),
});

interface PostUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  canPostAnnouncement?: boolean;
}

export const PostUpdateDialog = ({ open, onOpenChange, onSuccess, canPostAnnouncement = false }: PostUpdateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    content: "",
    type: "win" as "win" | "announcement" | "achievement",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = updateSchema.parse(formData);
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to post",
          variant: "destructive",
        });
        return;
      }

      // Get the current user's employee record
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (employeeError || !employee) {
        toast({
          title: "Error",
          description: "You need to create your employee profile first",
          variant: "destructive",
        });
        return;
      }

      // Map announcement to update type for database compatibility
      const dbType = validated.type === "announcement" ? "update" : validated.type;

      const { error } = await supabase.from("updates").insert({
        employee_id: employee.id,
        content: validated.content,
        type: dbType,
        organization_id: employee.organization_id,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Posted! 🎉",
          description: validated.type === "announcement" 
            ? "Your announcement has been shared with the team"
            : "Your update has been shared with the team",
        });
        setFormData({
          content: "",
          type: "win",
        });
        onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share with Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "win" | "announcement" | "achievement") => 
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="win">🏆 Win</SelectItem>
                <SelectItem value="achievement">✨ Achievement</SelectItem>
                {canPostAnnouncement && (
                  <SelectItem value="announcement">📢 Announcement</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              {formData.type === "announcement" ? "Announcement" : "Your Update"} *
            </Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={
                formData.type === "announcement"
                  ? "Share an important announcement with the team..."
                  : "Share what you've been working on, a win, or an achievement..."
              }
              rows={5}
              required
            />
            {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
            <p className="text-xs text-muted-foreground">
              {formData.content.length}/1000 characters
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
