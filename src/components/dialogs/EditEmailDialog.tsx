import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditEmailDialogProps {
  userId: string;
  currentEmail: string;
  onSuccess: () => void;
}

export const EditEmailDialog = ({
  userId,
  currentEmail,
  onSuccess,
}: EditEmailDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("update-user-email", {
        body: { userId, newEmail: email.trim() },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: "Email updated successfully" });
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
