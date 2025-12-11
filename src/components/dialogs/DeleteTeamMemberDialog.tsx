import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteTeamMemberDialogProps {
  employeeId: string;
  employeeName: string;
  userId: string;
}

export const DeleteTeamMemberDialog = ({
  employeeId,
  employeeName,
  userId,
}: DeleteTeamMemberDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("delete-team-member", {
        body: { employeeId, userId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete team member");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Team member deleted",
        description: `${employeeName} has been permanently removed from the system.`,
      });

      setOpen(false);
      navigate("/team");
    } catch (error: any) {
      console.error("Error deleting team member:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete team member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete User
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{employeeName}</strong>?
            </p>
            <p className="text-destructive font-medium">
              This action cannot be undone. The following will be permanently deleted:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>User account and login credentials</li>
              <li>All profile information</li>
              <li>All posts, wins, and announcements</li>
              <li>All kudos given and received</li>
              <li>All leave requests and balances</li>
              <li>All documents and attendance records</li>
              <li>All learning and development records</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
