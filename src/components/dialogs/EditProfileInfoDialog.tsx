import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditProfileInfoDialogProps {
  userId: string;
  currentName: string;
  currentEmail: string;
  onSuccess: () => void;
}

export const EditProfileInfoDialog = ({
  userId,
  currentName,
  currentEmail,
  onSuccess,
}: EditProfileInfoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update name in profiles table
      if (name !== currentName) {
        const { error: nameError } = await supabase
          .from("profiles")
          .update({ full_name: name })
          .eq("id", userId);
        
        if (nameError) throw nameError;
      }

      // Update email via edge function if changed
      if (email !== currentEmail) {
        const response = await supabase.functions.invoke("update-user-email", {
          body: { userId, newEmail: email },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }
        if (response.data?.error) {
          throw new Error(response.data.error);
        }
      }

      toast({ title: "Profile updated successfully" });
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
          <DialogTitle>Edit Profile Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
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
              Changing the email will update the user's login email as well.
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
