import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email?: string;
  };
}

interface WikiTransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "folder" | "page";
  itemName: string;
  currentOwnerId: string;
  employees: Employee[];
  onTransfer: (newOwnerId: string) => Promise<void>;
  isTransferring?: boolean;
}

export const WikiTransferOwnershipDialog = ({
  open,
  onOpenChange,
  itemType,
  itemName,
  currentOwnerId,
  employees,
  onTransfer,
  isTransferring = false,
}: WikiTransferOwnershipDialogProps) => {
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Filter out current owner and filter by search
  const filteredEmployees = employees.filter(emp => {
    if (emp.id === currentOwnerId) return false;
    if (!search) return true;
    const name = emp.profiles?.full_name?.toLowerCase() || "";
    const email = emp.profiles?.email?.toLowerCase() || "";
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const handleTransfer = async () => {
    if (!selectedEmployee) return;
    await onTransfer(selectedEmployee.id);
    setSelectedEmployee(null);
    setSearch("");
  };

  const handleClose = () => {
    setSelectedEmployee(null);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <ArrowRightLeft className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Transfer Ownership</DialogTitle>
              <DialogDescription>
                Transfer "{itemName}" to another team member
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">This action cannot be undone</p>
              <p className="text-muted-foreground mt-1">
                The new owner will have full control over this {itemType}, including the ability to delete it or transfer ownership again.
              </p>
            </div>
          </div>

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

          {/* Employee List */}
          <ScrollArea className="h-[240px] border rounded-lg">
            <div className="p-1">
              {filteredEmployees.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {search ? "No matching team members found" : "No other team members available"}
                </div>
              ) : (
                filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmployee(emp)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      selectedEmployee?.id === emp.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-sm bg-primary/10 text-primary">
                        {emp.profiles?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.profiles?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.profiles?.email || ""}
                      </p>
                    </div>
                    {selectedEmployee?.id === emp.id && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isTransferring}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedEmployee || isTransferring}
            className="gap-2"
          >
            {isTransferring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" />
                Transfer Ownership
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
