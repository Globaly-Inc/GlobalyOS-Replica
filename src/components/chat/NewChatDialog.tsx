import { useState, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, Camera, X } from "lucide-react";
import { useEmployees } from "@/services/useEmployees";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useCreateConversation, useConversations } from "@/services/chat";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import type { ActiveChat } from "@/types/chat";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chat: ActiveChat) => void;
}

const NewChatDialog = ({ open, onOpenChange, onChatCreated }: NewChatDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupIcon, setGroupIcon] = useState<File | null>(null);
  const [groupIconPreview, setGroupIconPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: employeesData = [], isLoading } = useEmployees();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();
  const createConversation = useCreateConversation();
  const { data: conversations = [] } = useConversations();

  // Type the employees data properly
  const employees = (employeesData as unknown) as Array<{
    id: string;
    position: string;
    department: string;
    status: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      email: string;
    };
  }>;

  const filteredEmployees = employees.filter(emp => {
    // Exclude current user and inactive employees
    if (emp.id === currentEmployee?.id) return false;
    if (emp.status !== 'active') return false;
    
    const name = emp.profiles?.full_name || "";
    const email = emp.profiles?.email || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
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

    setGroupIcon(file);
    setGroupIconPreview(URL.createObjectURL(file));
  };

  const removeIcon = () => {
    if (groupIconPreview) {
      URL.revokeObjectURL(groupIconPreview);
    }
    setGroupIcon(null);
    setGroupIconPreview(null);
  };

  const handleCreate = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one person");
      return;
    }

    try {
      setIsUploading(true);
      const isGroup = selectedEmployees.length > 1;

      // FOR 1:1 CHATS: Check if conversation already exists
      if (!isGroup) {
        const targetEmployeeId = selectedEmployees[0];
        const existingConv = conversations.find(conv => {
          if (conv.is_group) return false;
          return conv.participants?.some(p => p.employee_id === targetEmployeeId);
        });

        if (existingConv) {
          // Navigate to existing conversation instead of creating new
          const otherParticipant = existingConv.participants?.find(
            p => p.employee_id !== currentEmployee?.id
          );
          const name = otherParticipant?.employee?.profiles?.full_name || "Chat";
          
          onChatCreated({
            type: 'conversation',
            id: existingConv.id,
            name,
            isGroup: false,
          });
          
          // Reset and close
          setSelectedEmployees([]);
          setSearchQuery("");
          onOpenChange(false);
          toast.info("Opened existing conversation");
          return;
        }
      }

      let iconUrl: string | undefined;

      // Upload icon if provided (for group chats)
      if (isGroup && groupIcon && currentOrg?.id) {
        const fileExt = groupIcon.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${currentOrg.id}/group-icons/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, groupIcon);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        iconUrl = publicUrl;
      }

      const conversation = await createConversation.mutateAsync({
        participantIds: selectedEmployees,
        name: isGroup ? groupName : undefined,
        iconUrl,
        isGroup,
      });

      // Get names for the chat
      let chatName = groupName;
      const participantNames: string[] = [];
      
      if (!isGroup) {
        const selectedEmp = employees.find(e => e.id === selectedEmployees[0]);
        chatName = selectedEmp?.profiles?.full_name || "Chat";
      } else {
        selectedEmployees.forEach(empId => {
          const emp = employees.find(e => e.id === empId);
          if (emp?.profiles?.full_name) {
            const firstName = emp.profiles.full_name.split(' ')[0];
            participantNames.push(firstName);
          }
        });
      }

      onChatCreated({
        type: 'conversation',
        id: conversation.id,
        name: chatName || "Group Chat",
        isGroup,
        iconUrl,
        participantNames,
      });

      // Reset state
      setSelectedEmployees([]);
      setGroupName("");
      removeIcon();
      setSearchQuery("");
      onOpenChange(false);
      toast.success("Chat created");
    } catch (error) {
      showErrorToast(error, "Failed to create chat", {
        componentName: "NewChatDialog",
        actionAttempted: "Create chat",
        errorType: "database",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedEmployees([]);
    setGroupName("");
    removeIcon();
    setSearchQuery("");
    onOpenChange(false);
  };

  const isGroupChat = selectedEmployees.length > 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Group settings (if multiple selected) */}
        {isGroupChat && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
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
                  className="relative h-14 w-14 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {groupIconPreview ? (
                    <>
                      <img 
                        src={groupIconPreview} 
                        alt="Group icon" 
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeIcon();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Group name (optional)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add an icon and name for your group
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Selected count */}
        {selectedEmployees.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedEmployees.length} selected
          </p>
        )}

        {/* Employee list */}
        <ScrollArea className="h-[300px] -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No people found
            </p>
          ) : (
            <div className="space-y-1">
              {filteredEmployees.map((emp) => {
                const name = emp.profiles?.full_name || "Unknown";
                const isSelected = selectedEmployees.includes(emp.id);
                
                return (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => toggleEmployee(emp.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.position}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={selectedEmployees.length === 0 || createConversation.isPending || isUploading}
          >
            {(createConversation.isPending || isUploading) ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Start chat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;