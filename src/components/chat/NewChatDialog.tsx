import { useState } from "react";
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
import { Search, Loader2 } from "lucide-react";
import { useEmployees } from "@/services/useEmployees";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useCreateConversation } from "@/services/useChat";
import { toast } from "sonner";
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
  
  const { data: employees = [], isLoading } = useEmployees();
  const { employee: currentEmployee } = useCurrentEmployee();
  const createConversation = useCreateConversation();

  const filteredEmployees = employees.filter(emp => {
    if (emp.id === currentEmployee?.id) return false;
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

  const handleCreate = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one person");
      return;
    }

    try {
      const isGroup = selectedEmployees.length > 1;
      const conversation = await createConversation.mutateAsync({
        participantIds: selectedEmployees,
        name: isGroup ? groupName : undefined,
        isGroup,
      });

      // Get the name for the chat
      let chatName = groupName;
      if (!isGroup) {
        const selectedEmp = employees.find(e => e.id === selectedEmployees[0]);
        chatName = selectedEmp?.profiles?.full_name || "Chat";
      }

      onChatCreated({
        type: 'conversation',
        id: conversation.id,
        name: chatName || "Group Chat",
        isGroup,
      });

      setSelectedEmployees([]);
      setGroupName("");
      setSearchQuery("");
      onOpenChange(false);
      toast.success("Chat created");
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create chat");
    }
  };

  const handleClose = () => {
    setSelectedEmployees([]);
    setGroupName("");
    setSearchQuery("");
    onOpenChange(false);
  };

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

        {/* Group name (if multiple selected) */}
        {selectedEmployees.length > 1 && (
          <Input
            placeholder="Group name (optional)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
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
            disabled={selectedEmployees.length === 0 || createConversation.isPending}
          >
            {createConversation.isPending ? (
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
