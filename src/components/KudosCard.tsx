import { Kudos } from "@/types/employee";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { RichTextContent } from "./ui/rich-text-editor";
import { formatDateTime } from "@/lib/utils";
import { FeedReactions } from "./FeedReactions";
import { Heart, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { EditKudosDialog } from "./dialogs/EditKudosDialog";


interface KudosCardProps {
  kudos: Kudos;
  onDelete?: () => void;
}

export const KudosCard = ({ kudos, onDelete }: KudosCardProps) => {
  const getFirstName = (fullName: string) => fullName.split(" ")[0];
  const { toast } = useToast();
  const { isAdmin, isHR } = useUserRole();
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  
  const allRecipients = [
    getFirstName(kudos.employeeName),
    ...(kudos.otherRecipients?.map(getFirstName) || [])
  ];
  const recipientText = allRecipients.join(", ");

  // Memoize recipient IDs to prevent unnecessary re-renders
  const allRecipientIds = useMemo(() => [
    kudos.employeeId,
    ...(kudos.otherRecipientIds || [])
  ], [kudos.employeeId, kudos.otherRecipientIds]);

  useEffect(() => {
    const fetchCurrentEmployee = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (employee) {
        setCurrentEmployeeId(employee.id);
      }
    };
    fetchCurrentEmployee();
  }, []);

  // Can edit/delete if admin, HR, or the person who gave the kudos
  const canEditDelete = isAdmin || isHR || currentEmployeeId === kudos.givenById;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("kudos").delete().eq("id", kudos.id);
      
      if (error) throw error;
      
      toast({
        title: "Kudos deleted",
        description: "The kudos has been successfully deleted.",
      });
      
      onDelete?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete the kudos",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div 
        className="bg-white dark:bg-card rounded-lg border border-border shadow-sm overflow-hidden border-l-4 border-l-pink-500 flex flex-col"
      >
        <div className="p-4 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/50">
                {kudos.givenByAvatar && <AvatarImage src={kudos.givenByAvatar} />}
                <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
                  {kudos.givenBy.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <p className="font-semibold text-sm text-foreground">{kudos.givenBy}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(kudos.date)}
                </p>
              </div>
            </div>
            
            {/* Post type icon on right with hover actions */}
            <div 
              className="relative"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={(e) => e.stopPropagation()}
            >
              {isHovered && canEditDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowEditDialog(true)}
                    className="p-2 rounded-full bg-pink-100 text-pink-600 hover:opacity-80 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="p-2 rounded-full bg-red-100 text-red-600 hover:opacity-80 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="p-2 rounded-full bg-pink-100 text-pink-600">
                  <Heart className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              🙌 Kudos to {recipientText}
            </p>
            <div className="line-clamp-5">
              <RichTextContent content={kudos.comment} className="text-sm" />
            </div>
          </div>
        </div>
        
        {/* Reactions */}
        <div className="px-4 py-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
          <FeedReactions targetType="kudos" targetId={kudos.id} />
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Kudos</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this kudos? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEditDialog && (
        <EditKudosDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          kudosId={kudos.id}
          batchId={kudos.batchId}
          initialComment={kudos.comment}
          initialRecipientIds={allRecipientIds}
          givenById={kudos.givenById}
          onSuccess={onDelete}
        />
      )}

    </>
  );
};
