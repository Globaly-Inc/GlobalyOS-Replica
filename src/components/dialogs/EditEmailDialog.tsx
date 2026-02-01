import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edgeFunctionUtils";
import { showErrorToast } from "@/lib/errorUtils";

interface EditEmailDialogProps {
  userId: string;
  currentEmail: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export const EditEmailDialog = ({
  userId,
  currentEmail,
  onSuccess,
  trigger,
}: EditEmailDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await invokeEdgeFunction("update-user-email", {
        userId,
        newEmail: email.trim(),
      }, {
        componentName: "EditEmailDialog",
        actionAttempted: "Update company email",
      });

      if (error) {
        throw error;
      }

      toast.success("Email updated successfully");
      setOpen(false);
      onSuccess();
    } catch (error) {
      showErrorToast(error, "Failed to update company email", {
        componentName: "EditEmailDialog",
        actionAttempted: "Update company email",
        errorType: "edge_function",
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-6 w-6">
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Company Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Company Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter company email"
            />
            <p className="text-xs text-muted-foreground">
              This will also update the user's login email.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};