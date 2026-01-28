import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Loader2, Shield, Info } from "lucide-react";
import { useSpaceMembers, useAddSpaceMembers } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmployeeSystemRoles, isExemptFromAutoSync } from "@/hooks/useExemptRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";

interface AddSpaceMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
  autoSyncEnabled?: boolean;
}

interface EmployeeItem {
  id: string;
  user_id: string;
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
  autoSyncEnabled = false,
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
          user_id,
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

  // Get all employee IDs to check their system roles
  const allEmployeeIds = useMemo(() => employees.map(e => e.id), [employees]);
  const { data: roleMap, isLoading: loadingRoles } = useEmployeeSystemRoles(allEmployeeIds, currentOrg?.id || null);

  const existingMemberIds = new Set(members.map(m => m.employee_id));
  
  // Filter available employees
  const availableEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Exclude existing members
      if (existingMemberIds.has(emp.id)) return false;
      
      // When auto-sync is enabled, only show exempt roles (Owner, Admin, HR)
      if (autoSyncEnabled && roleMap) {
        const role = roleMap.get(emp.id);
        if (!role || !isExemptFromAutoSync(role)) {
          return false;
        }
      }
      
      // Apply search filter
      const name = emp.profiles?.full_name || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [employees, existingMemberIds, autoSyncEnabled, roleMap, search]);

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

    // Get employee names for system event logging
    const employeeNames = selectedIds.map(id => {
      const emp = availableEmployees.find(e => e.id === id);
      return emp?.profiles?.full_name || 'Unknown';
    });

    try {
      await addMembers.mutateAsync({
        spaceId,
        employeeIds: selectedIds,
        employeeNames
      });
      toast.success(`Added ${selectedIds.length} member${selectedIds.length > 1 ? 's' : ''}`);
      setSelectedIds([]);
      setSearch("");
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, "Failed to add members", {
        componentName: "AddSpaceMembersDialog",
        actionAttempted: "Add space members",
        errorType: "database",
      });
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearch("");
    onOpenChange(false);
  };

  const isLoading = loadingEmployees || loadingRoles;

  // Get role badge for exempt members
  const getRoleBadge = (empId: string) => {
    if (!autoSyncEnabled || !roleMap) return null;
    const role = roleMap.get(empId);
    if (!role || !isExemptFromAutoSync(role)) return null;
    
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600">
        <Shield className="h-3 w-3 mr-1" />
        {roleLabel}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {autoSyncEnabled ? `Add exempt members to ${spaceName}` : `Add members to ${spaceName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-sync info banner */}
          {autoSyncEnabled && (
            <Alert className="bg-muted/50 border-border">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Auto-sync is enabled. Only Owner, Admin, and HR members can be added manually.
              </AlertDescription>
            </Alert>
          )}

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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search 
                  ? "No matching team members" 
                  : autoSyncEnabled 
                    ? "No exempt members available to add"
                    : "All team members are already in this space"
                }
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {emp.profiles?.full_name}
                        </span>
                        {getRoleBadge(emp.id)}
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
