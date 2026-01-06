import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface EditUserRoleDialogProps {
  userId: string;
  currentRole: AppRole | null;
  onSuccess: () => void;
}

export const EditUserRoleDialog = ({
  userId,
  currentRole,
  onSuccess,
}: EditUserRoleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<AppRole>(currentRole || "user");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    setRole(currentRole || "user");
  }, [currentRole]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (currentRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId)
          .eq("organization_id", currentOrg?.id);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role,
            organization_id: currentOrg?.id,
          });
        
        if (error) throw error;
      }

      toast({ title: "User role updated successfully" });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Member</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Owner: Full access + billing. Admin: Full access. HR: Can manage employee data. Member: Standard access.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
