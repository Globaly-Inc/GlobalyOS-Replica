import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2 } from "lucide-react";
import { useSpaceMembers, useAddSpaceMembers } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface AddSpaceMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
}

interface EmployeeItem {
  id: string;
  position: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const AddSpaceMembersDialog = ({
  open,
  onOpenChange,
  spaceId,
  spaceName,
}: AddSpaceMembersDialogProps) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { currentOrg } = useOrganization();
  const { data: members = [] } = useSpaceMembers(spaceId);
  const addMembers = useAddSpaceMembers();

  // Fetch employees directly with proper typing
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-for-space', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          position,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active');

      if (error) throw error;
      return (data || []) as unknown as EmployeeItem[];
    },
    enabled: !!currentOrg?.id && open,
  });

  const existingMemberIds = new Set(members.map(m => m.employee_id));
  
  const availableEmployees = employees.filter(emp => {
    if (existingMemberIds.has(emp.id)) return false;
    const name = emp.profiles?.full_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleEmployee = (empId: string) => {
    setSelectedIds(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one member to add");
      return;
    }

    try {
      await addMembers.mutateAsync({
        spaceId,
        employeeIds: selectedIds
      });
      toast.success(`Added ${selectedIds.length} member${selectedIds.length > 1 ? 's' : ''}`);
      setSelectedIds([]);
      setSearch("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add members");
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add members to {spaceName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected count */}
          {selectedIds.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </div>
          )}

          {/* Members list */}
          <ScrollArea className="h-[300px]">
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? "No matching team members" : "All team members are already in this space"}
              </div>
            ) : (
              <div className="space-y-1">
                {availableEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(emp.profiles?.full_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {emp.profiles?.full_name}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {emp.position}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedIds.length === 0 || addMembers.isPending}
            >
              {addMembers.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSpaceMembersDialog;
