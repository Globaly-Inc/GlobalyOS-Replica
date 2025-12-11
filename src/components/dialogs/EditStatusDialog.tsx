import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface EditStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  currentStatus: string;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: 'invited', label: 'Invited' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function EditStatusDialog({ 
  open, 
  onOpenChange, 
  employeeId, 
  currentStatus, 
  onSuccess 
}: EditStatusDialogProps) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!status) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status })
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Employee status changed to ${status}`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Employee Status</DialogTitle>
          <DialogDescription>
            Update the employment status for this team member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || status === currentStatus}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
