import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

interface Office {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
}

interface EditOfficeDialogProps {
  employeeId: string;
  currentOfficeId: string | null;
  onSuccess: () => void;
}

export const EditOfficeDialog = ({ employeeId, currentOfficeId, onSuccess }: EditOfficeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeId, setOfficeId] = useState(currentOfficeId || "none");
  const { toast } = useToast();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (open) {
      loadOffices();
      setOfficeId(currentOfficeId || "none");
    }
  }, [open, currentOfficeId]);

  const loadOffices = async () => {
    if (!currentOrg?.id) return;
    
    const { data } = await supabase
      .from("offices")
      .select("id, name, city, country")
      .eq("organization_id", currentOrg.id)
      .order("name");

    if (data) {
      setOffices(data);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ office_id: officeId === "none" ? null : officeId })
        .eq("id", employeeId);

      if (error) throw error;

      toast({
        title: "Office Updated",
        description: "The office assignment has been updated successfully.",
      });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update office",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2">
          <Edit2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Office</DialogTitle>
          <DialogDescription>
            Select an office for this team member.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Office</Label>
            <Select value={officeId} onValueChange={setOfficeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No office</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                    {office.city && ` - ${office.city}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
