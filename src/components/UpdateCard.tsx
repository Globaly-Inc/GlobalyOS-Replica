import { Update } from "@/types/employee";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { RichTextContent } from "./ui/rich-text-editor";
import { Trophy, Megaphone, Pencil, Trash2 } from "lucide-react";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import { FeedReactions } from "./FeedReactions";
import { cn } from "@/lib/utils";
import { OrgLink } from "./OrgLink";
import { useState, useEffect } from "react";
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
import { EditUpdateDialog } from "./dialogs/EditUpdateDialog";
import { VisibilityBadge } from "./feed/VisibilityBadge";

interface UpdateCardProps {
  update: Update & {
    accessScope?: string | null;
    updateOffices?: Array<{ office: { name: string } }>;
    updateDepartments?: Array<{ department: string }>;
    updateProjects?: Array<{ project: { name: string } }>;
  };
  onDelete?: () => void;
  onEdit?: () => void;
}

const typeConfig = {
  win: {
    icon: Trophy,
    label: "Win",
    borderColor: "border-l-amber-500",
    iconBg: "bg-amber-100 text-amber-600",
  },
  achievement: {
    icon: Trophy,
    label: "Achievement",
    borderColor: "border-l-emerald-500",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  announcement: {
    icon: Megaphone,
    label: "Announcement",
    borderColor: "border-l-blue-500",
    iconBg: "bg-blue-100 text-blue-600",
  },
};

export const UpdateCard = ({ update, onDelete, onEdit }: UpdateCardProps) => {
  const config = typeConfig[update.type];
  const Icon = config.icon;
  const { toast } = useToast();
  const { isAdmin, isHR } = useUserRole();
  const { formatDateTime } = useFormattedDate();
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const canEditDelete = isAdmin || isHR || currentEmployeeId === update.employeeId;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // First delete mentions
      await supabase.from("update_mentions").delete().eq("update_id", update.id);
      
      // Then delete the update
      const { error } = await supabase.from("updates").delete().eq("id", update.id);
      
      if (error) throw error;
      
      toast({
        title: "Post deleted",
        description: "The post has been successfully deleted.",
      });
      
      onDelete?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete the post",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className={cn(
        "bg-white dark:bg-card rounded-lg border border-border shadow-sm overflow-hidden",
        "border-l-4",
        config.borderColor
      )}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <OrgLink to={`/team/${update.employeeId}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative">
                <Avatar className="h-10 w-10 border border-border/50">
                  <AvatarImage src={update.avatar} alt={update.employeeName} />
                  <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
                    {update.employeeName.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-card" />
              </div>
              
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground">{update.employeeName}</p>
                  <VisibilityBadge 
                    accessScope={update.accessScope}
                    offices={update.updateOffices}
                    departments={update.updateDepartments}
                    projects={update.updateProjects}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(update.date, true)}
                </p>
              </div>
            </OrgLink>
            
            {/* Post type icon on right with hover actions */}
            <div 
              className="relative"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {isHovered && canEditDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowEditDialog(true)}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      config.iconBg,
                      "hover:opacity-80"
                    )}
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
                <div className={cn("p-2 rounded-full", config.iconBg)}>
                  <Icon className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          <RichTextContent content={update.content} className="text-sm mb-3" />
          
          {/* Tagged members */}
          {update.mentions && update.mentions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground">with</span>
              {update.mentions.map((mention, index) => (
                <OrgLink
                  key={mention.id}
                  to={`/team/${mention.employeeId}`}
                  className="flex items-center gap-1 hover:underline"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={mention.avatar} />
                    <AvatarFallback className="text-xs">
                      {mention.employeeName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground">
                    {mention.employeeName.split(" ")[0]}
                    {index < update.mentions!.length - 1 && ","}
                  </span>
                </OrgLink>
              ))}
            </div>
          )}
          
          {/* Image if present */}
          {update.imageUrl && (
            <div className="mb-3">
              <img 
                src={update.imageUrl} 
                alt="Post image" 
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}
          
          {/* Reactions */}
          <div className="pt-3 border-t border-border/50">
            <FeedReactions targetType="update" targetId={update.id} />
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
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

      <EditUpdateDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        updateId={update.id}
        initialContent={update.content}
        type={update.type}
        onSuccess={onDelete}
      />
    </>
  );
};
