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
      // Delete in order to respect foreign key constraints
      // 1. Delete feed reactions by this employee
      await supabase.from("feed_reactions").delete().eq("employee_id", employeeId);

      // 2. Delete update mentions by this employee
      await supabase.from("update_mentions").delete().eq("employee_id", employeeId);

      // 3. Delete update mentions of updates created by this employee
      const { data: employeeUpdates } = await supabase
        .from("updates")
        .select("id")
        .eq("employee_id", employeeId);
      
      if (employeeUpdates && employeeUpdates.length > 0) {
        const updateIds = employeeUpdates.map(u => u.id);
        await supabase.from("update_mentions").delete().in("update_id", updateIds);
        await supabase.from("feed_reactions").delete().in("target_id", updateIds);
      }

      // 4. Delete updates by this employee
      await supabase.from("updates").delete().eq("employee_id", employeeId);

      // 5. Delete kudos given by this employee
      await supabase.from("kudos").delete().eq("given_by_id", employeeId);

      // 6. Delete kudos received by this employee
      await supabase.from("kudos").delete().eq("employee_id", employeeId);

      // 7. Delete leave balance logs
      await supabase.from("leave_balance_logs").delete().eq("employee_id", employeeId);

      // 8. Delete leave type balances
      await supabase.from("leave_type_balances").delete().eq("employee_id", employeeId);

      // 9. Delete leave balances
      await supabase.from("leave_balances").delete().eq("employee_id", employeeId);

      // 10. Delete leave requests
      await supabase.from("leave_requests").delete().eq("employee_id", employeeId);

      // 11. Delete attendance records
      await supabase.from("attendance_records").delete().eq("employee_id", employeeId);

      // 12. Delete learning development records
      await supabase.from("learning_development").delete().eq("employee_id", employeeId);

      // 13. Delete employee documents
      await supabase.from("employee_documents").delete().eq("employee_id", employeeId);

      // 14. Delete employee projects
      await supabase.from("employee_projects").delete().eq("employee_id", employeeId);

      // 15. Delete position history
      await supabase.from("position_history").delete().eq("employee_id", employeeId);

      // 16. Delete profile summaries
      await supabase.from("profile_summaries").delete().eq("employee_id", employeeId);

      // 17. Delete achievements
      await supabase.from("achievements").delete().eq("employee_id", employeeId);

      // 18. Update direct reports to remove manager reference
      await supabase.from("employees").update({ manager_id: null }).eq("manager_id", employeeId);

      // 19. Delete notifications for this user
      await supabase.from("notifications").delete().eq("user_id", userId);

      // 20. Delete user roles
      await supabase.from("user_roles").delete().eq("user_id", userId);

      // 21. Delete organization members
      await supabase.from("organization_members").delete().eq("user_id", userId);

      // 22. Delete push subscriptions
      await supabase.from("push_subscriptions").delete().eq("user_id", userId);

      // 23. Delete the employee record
      const { error: employeeError } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId);

      if (employeeError) throw employeeError;

      // 24. Delete the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Team member deleted",
        description: `${employeeName} has been removed from the system.`,
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
          Delete Team Member
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{employeeName}</strong>?
            </p>
            <p className="text-destructive font-medium">
              This action cannot be undone. The following will be permanently deleted:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
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
