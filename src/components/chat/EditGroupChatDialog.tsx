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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, X, Loader2, UserPlus, UserMinus, Search } from "lucide-react";
import { 
  useUpdateConversation, 
  useConversationParticipants,
  useAddGroupMembers,
  useRemoveGroupMember
} from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmployees } from "@/services/useEmployees";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const { data: employeesData = [] } = useEmployees();
  const { data: participants = [] } = useConversationParticipants(conversationId);
  const updateConversation = useUpdateConversation();
  const addGroupMembers = useAddGroupMembers();
  const removeGroupMember = useRemoveGroupMember();

  // Type assertion to handle Supabase type inference issues
  const employees = (employeesData as unknown) as Array<{
    id: string;
    position: string;
    status: string;
    profiles: { full_name: string; avatar_url: string | null; email: string } | null;
  }>;

  const memberIds = participants.map(p => p.employee_id);
  const nonMembers = employees.filter(
    emp => !memberIds.includes(emp.id) && emp.status === 'active'
  );

  const filteredNonMembers = nonMembers.filter(emp => 
    emp.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setName(currentName);
      setIconPreview(currentIconUrl);
      setIcon(null);
      setSearchQuery("");
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

  const handleAddMember = async (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    const employeeName = employee?.profiles?.full_name || 'Unknown';
    
    try {
      setAddingMember(employeeId);
      
      await addGroupMembers.mutateAsync({
        conversationId,
        employeeIds: [employeeId],
        employeeNames: [employeeName]
      });

      toast.success("Member added");
    } catch (error) {
      showErrorToast(error, "Failed to add member", {
        componentName: "EditGroupChatDialog",
        actionAttempted: "Add group member",
        errorType: "database",
      });
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    const participant = participants.find(p => p.employee_id === employeeId);
    const employeeName = participant?.employee?.profiles?.full_name || 'Unknown';
    
    try {
      setRemovingMember(employeeId);
      
      await removeGroupMember.mutateAsync({
        conversationId,
        employeeId,
        employeeName
      });

      toast.success("Member removed");
    } catch (error) {
      showErrorToast(error, "Failed to remove member", {
        componentName: "EditGroupChatDialog",
        actionAttempted: "Remove group member",
        errorType: "database",
      });
    } finally {
      setRemovingMember(null);
    }
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
      showErrorToast(error, "Failed to update group", {
        componentName: "EditGroupChatDialog",
        actionAttempted: "Update group chat",
        errorType: "database",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit group</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="members">Members ({participants.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="flex flex-col items-center gap-4">
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

            <div className="flex justify-end gap-2 pt-2">
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
          </TabsContent>

          <TabsContent value="members" className="space-y-4 pt-4">
            {/* Current members */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Current members</label>
              <ScrollArea className="h-40 border rounded-lg">
                <div className="p-2 space-y-1">
                  {participants.map((participant) => {
                    const isCurrentUser = participant.employee_id === currentEmployee?.id;
                    return (
                      <div 
                        key={participant.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.employee?.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(participant.employee?.profiles?.full_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {participant.employee?.profiles?.full_name}
                            {isCurrentUser && <span className="text-muted-foreground ml-1">(you)</span>}
                          </p>
                        </div>
                        {!isCurrentUser && participants.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(participant.employee_id)}
                            disabled={removingMember === participant.employee_id}
                          >
                            {removingMember === participant.employee_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Add members */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Add members</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-40 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredNonMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchQuery ? "No matches found" : "All team members are in the group"}
                    </p>
                  ) : (
                    filteredNonMembers.map((employee) => (
                      <div 
                        key={employee.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(employee.profiles?.full_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {employee.profiles?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {employee.position}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleAddMember(employee.id)}
                          disabled={addingMember === employee.id}
                        >
                          {addingMember === employee.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditGroupChatDialog;
