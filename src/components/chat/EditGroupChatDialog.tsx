import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, X, Loader2 } from "lucide-react";
import { useUpdateConversation } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditGroupChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentName: string;
  currentIconUrl: string | null;
  onUpdated: (name: string, iconUrl: string | null) => void;
}

const EditGroupChatDialog = ({ 
  open, 
  onOpenChange, 
  conversationId,
  currentName,
  currentIconUrl,
  onUpdated 
}: EditGroupChatDialogProps) => {
  const [name, setName] = useState(currentName);
  const [icon, setIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(currentIconUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { currentOrg } = useOrganization();
  const updateConversation = useUpdateConversation();

  useEffect(() => {
    if (open) {
      setName(currentName);
      setIconPreview(currentIconUrl);
      setIcon(null);
    }
  }, [open, currentName, currentIconUrl]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setIcon(file);
    if (iconPreview && iconPreview !== currentIconUrl) {
      URL.revokeObjectURL(iconPreview);
    }
    setIconPreview(URL.createObjectURL(file));
  };

  const removeIcon = () => {
    if (iconPreview && iconPreview !== currentIconUrl) {
      URL.revokeObjectURL(iconPreview);
    }
    setIcon(null);
    setIconPreview(null);
  };

  const handleSave = async () => {
    try {
      setIsUploading(true);
      let iconUrl: string | undefined = undefined;

      // Upload new icon if provided
      if (icon && currentOrg?.id) {
        const fileExt = icon.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${currentOrg.id}/group-icons/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, icon);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        iconUrl = publicUrl;
      } else if (iconPreview === null && currentIconUrl !== null) {
        // Icon was removed
        iconUrl = '';
      }

      await updateConversation.mutateAsync({
        conversationId,
        name: name || undefined,
        iconUrl,
      });

      onUpdated(name, iconUrl !== undefined ? (iconUrl || null) : currentIconUrl);
      onOpenChange(false);
      toast.success("Group updated");
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit group</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Group icon picker */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconSelect}
            />
            <div 
              className="relative h-20 w-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {iconPreview ? (
                <img 
                  src={iconPreview} 
                  alt="Group icon" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <Avatar className="h-full w-full">
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {getInitials(name || "GC")}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            {iconPreview && (
              <button
                type="button"
                className="absolute -top-1 -right-1 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  removeIcon();
                }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Click to change icon</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Group name</label>
          <Input
            placeholder="Enter group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateConversation.isPending || isUploading}
          >
            {(updateConversation.isPending || isUploading) ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditGroupChatDialog;