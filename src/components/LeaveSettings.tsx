import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface LeaveType {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_days: number;
  min_days_advance: number;
  applies_to_all_offices: boolean;
  is_active: boolean;
  office_ids?: string[];
}

interface Office {
  id: string;
  name: string;
  city: string | null;
}

export const LeaveSettings = ({ embedded = false }: { embedded?: boolean }) => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<string>("paid");
  const [formDescription, setFormDescription] = useState("");
  const [formDefaultDays, setFormDefaultDays] = useState("0");
  const [formMinDaysAdvance, setFormMinDaysAdvance] = useState("0");
  const [formAppliesToAll, setFormAppliesToAll] = useState(true);
  const [formSelectedOffices, setFormSelectedOffices] = useState<string[]>([]);
  
  const { currentOrg } = useOrganization();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (currentOrg) {
      loadLeaveTypes();
      loadOffices();
    }
  }, [currentOrg?.id]);

  const loadOffices = async () => {
    if (!currentOrg) return;
    
    const { data, error } = await supabase
      .from("offices")
      .select("id, name, city")
      .eq("organization_id", currentOrg.id)
      .order("name");

    if (!error && data) {
      setOffices(data);
    }
  };

  const loadLeaveTypes = async () => {
    if (!currentOrg) return;
    setLoading(true);

    const { data: types, error } = await supabase
      .from("leave_types")
      .select("*")
      .eq("organization_id", currentOrg.id)
      .order("name");

    if (error) {
      toast.error("Failed to load leave types");
      setLoading(false);
      return;
    }

    // Load office mappings for each leave type
    const typesWithOffices = await Promise.all(
      (types || []).map(async (type) => {
        if (!type.applies_to_all_offices) {
          const { data: officeData } = await supabase
            .from("leave_type_offices")
            .select("office_id")
            .eq("leave_type_id", type.id);
          
          return {
            ...type,
            office_ids: officeData?.map((o) => o.office_id) || [],
          };
        }
        return { ...type, office_ids: [] };
      })
    );

    setLeaveTypes(typesWithOffices);
    setLoading(false);
  };

  const resetForm = () => {
    setFormName("");
    setFormCategory("paid");
    setFormDescription("");
    setFormDefaultDays("0");
    setFormMinDaysAdvance("0");
    setFormAppliesToAll(true);
    setFormSelectedOffices([]);
    setEditingType(null);
  };

  const openEditDialog = (leaveType: LeaveType) => {
    setEditingType(leaveType);
    setFormName(leaveType.name);
    setFormCategory(leaveType.category);
    setFormDescription(leaveType.description || "");
    setFormDefaultDays(String(leaveType.default_days));
    setFormMinDaysAdvance(String(leaveType.min_days_advance));
    setFormAppliesToAll(leaveType.applies_to_all_offices);
    setFormSelectedOffices(leaveType.office_ids || []);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a leave type name");
      return;
    }

    if (!formAppliesToAll && formSelectedOffices.length === 0) {
      toast.error("Please select at least one office");
      return;
    }

    setSaving(true);

    try {
      const leaveTypeData = {
        organization_id: currentOrg?.id,
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim() || null,
        default_days: parseFloat(formDefaultDays) || 0,
        min_days_advance: parseInt(formMinDaysAdvance) || 0,
        applies_to_all_offices: formAppliesToAll,
      };

      let leaveTypeId: string;

      if (editingType) {
        // Update existing
        const { error } = await supabase
          .from("leave_types")
          .update(leaveTypeData)
          .eq("id", editingType.id);

        if (error) throw error;
        leaveTypeId = editingType.id;

        // Delete existing office mappings
        await supabase
          .from("leave_type_offices")
          .delete()
          .eq("leave_type_id", editingType.id);
      } else {
        // Create new
        const { data, error } = await supabase
          .from("leave_types")
          .insert(leaveTypeData)
          .select("id")
          .single();

        if (error) throw error;
        leaveTypeId = data.id;
      }

      // Add office mappings if not applying to all
      if (!formAppliesToAll && formSelectedOffices.length > 0) {
        const mappings = formSelectedOffices.map((officeId) => ({
          leave_type_id: leaveTypeId,
          office_id: officeId,
        }));

        const { error: mappingError } = await supabase
          .from("leave_type_offices")
          .insert(mappings);

        if (mappingError) throw mappingError;
      }

      toast.success(editingType ? "Leave type updated" : "Leave type created");
      setDialogOpen(false);
      resetForm();
      loadLeaveTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to save leave type");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (leaveType: LeaveType) => {
    const { error } = await supabase
      .from("leave_types")
      .update({ is_active: !leaveType.is_active })
      .eq("id", leaveType.id);

    if (error) {
      toast.error("Failed to update leave type");
    } else {
      toast.success(`Leave type ${leaveType.is_active ? "deactivated" : "activated"}`);
      loadLeaveTypes();
    }
  };

  const handleDelete = async (leaveType: LeaveType) => {
    if (!confirm(`Are you sure you want to delete "${leaveType.name}"?`)) return;

    const { error } = await supabase
      .from("leave_types")
      .delete()
      .eq("id", leaveType.id);

    if (error) {
      toast.error("Failed to delete leave type");
    } else {
      toast.success("Leave type deleted");
      loadLeaveTypes();
    }
  };

  const getOfficeNames = (officeIds: string[]) => {
    return officeIds
      .map((id) => offices.find((o) => o.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  if (!isAdmin) {
    if (embedded) {
      return (
        <p className="text-muted-foreground py-4">
          Only administrators can manage leave settings.
        </p>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Only administrators can manage leave settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dialogContent = (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Leave Type
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingType ? "Edit Leave Type" : "Add Leave Type"}
          </DialogTitle>
          <DialogDescription>
            Configure the leave type settings and office applicability
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Annual Leave, Sick Leave"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultDays">Default Days</Label>
              <Input
                id="defaultDays"
                type="number"
                min="0"
                step="0.5"
                value={formDefaultDays}
                onChange={(e) => setFormDefaultDays(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minDaysAdvance">Min. Days Advance</Label>
              <Input
                id="minDaysAdvance"
                type="number"
                min="0"
                step="1"
                value={formMinDaysAdvance}
                onChange={(e) => setFormMinDaysAdvance(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Applies to All Offices</Label>
                <p className="text-xs text-muted-foreground">
                  Enable for all offices or select specific ones
                </p>
              </div>
              <Switch
                checked={formAppliesToAll}
                onCheckedChange={setFormAppliesToAll}
              />
            </div>
            {!formAppliesToAll && offices.length > 0 && (
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                <Label className="text-sm">Select Offices</Label>
                <div className="grid gap-2 max-h-32 overflow-y-auto">
                  {offices.map((office) => (
                    <div key={office.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={office.id}
                        checked={formSelectedOffices.includes(office.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormSelectedOffices([...formSelectedOffices, office.id]);
                          } else {
                            setFormSelectedOffices(
                              formSelectedOffices.filter((id) => id !== office.id)
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={office.id}
                        className="text-sm cursor-pointer"
                      >
                        {office.name}
                        {office.city && (
                          <span className="text-muted-foreground ml-1">
                            ({office.city})
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!formAppliesToAll && offices.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No offices configured. Add offices first to enable per-office leave types.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingType ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const tableContent = (
    <>
      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : leaveTypes.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No leave types configured yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add leave types to enable leave management
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Default Days</TableHead>
              <TableHead>Min. Advance</TableHead>
              <TableHead>Applies To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveTypes.map((leaveType) => (
              <TableRow key={leaveType.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{leaveType.name}</span>
                    {leaveType.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {leaveType.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={leaveType.category === "paid" ? "default" : "secondary"}
                  >
                    {leaveType.category === "paid" ? "Paid" : "Unpaid"}
                  </Badge>
                </TableCell>
                <TableCell>{leaveType.default_days}</TableCell>
                <TableCell>{leaveType.min_days_advance} days</TableCell>
                <TableCell>
                  {leaveType.applies_to_all_offices ? (
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      All Offices
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {getOfficeNames(leaveType.office_ids || [])}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={leaveType.is_active ? "default" : "secondary"}
                    className={leaveType.is_active ? "bg-green-500" : ""}
                  >
                    {leaveType.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(leaveType)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(leaveType)}
                    >
                      <Switch
                        checked={leaveType.is_active}
                        className="scale-75"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(leaveType)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Configure leave types available in your organization
          </p>
          {dialogContent}
        </div>
        {tableContent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Types
            </CardTitle>
            <CardDescription>
              Configure leave types available in your organization
            </CardDescription>
          </div>
          {dialogContent}
        </div>
      </CardHeader>
      <CardContent>
        {tableContent}
      </CardContent>
    </Card>
  );
};
