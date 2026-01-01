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
import { useEmploymentTypes } from "@/hooks/useEmploymentTypes";

type EmploymentType = string;

interface LeaveType {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_days: number;
  min_days_advance: number;
  applies_to_all_offices: boolean;
  is_active: boolean;
  is_system: boolean;
  office_ids?: string[];
  max_negative_days: number;
  applies_to_gender: 'all' | 'male' | 'female';
  applies_to_employment_types: EmploymentType[];
  carry_forward: boolean;
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
  const [formMaxNegativeDays, setFormMaxNegativeDays] = useState("0");
  const [formAppliesToGender, setFormAppliesToGender] = useState<'all' | 'male' | 'female'>('all');
  const [formAppliesToEmploymentTypes, setFormAppliesToEmploymentTypes] = useState<EmploymentType[]>([]);
  const [formCarryForward, setFormCarryForward] = useState(false);
  
  const { currentOrg } = useOrganization();
  const { isAdmin } = useUserRole();
  const { data: employmentTypesData = [] } = useEmploymentTypes();

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
            applies_to_gender: (type.applies_to_gender || 'all') as 'all' | 'male' | 'female',
            max_negative_days: type.max_negative_days || 0,
            applies_to_employment_types: type.applies_to_employment_types || ['trainee', 'intern', 'contract', 'employee'],
            carry_forward: type.carry_forward || false,
          };
        }
        return { 
          ...type, 
          office_ids: [],
          applies_to_gender: (type.applies_to_gender || 'all') as 'all' | 'male' | 'female',
          max_negative_days: type.max_negative_days || 0,
          applies_to_employment_types: type.applies_to_employment_types || ['trainee', 'intern', 'contract', 'employee'],
          carry_forward: type.carry_forward || false,
        };
      })
    );

    setLeaveTypes(typesWithOffices as LeaveType[]);
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
    setFormMaxNegativeDays("0");
    setFormAppliesToGender('all');
    setFormAppliesToEmploymentTypes(employmentTypesData.map(t => t.name));
    setFormCarryForward(false);
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
    setFormMaxNegativeDays(String(leaveType.max_negative_days || 0));
    setFormAppliesToGender(leaveType.applies_to_gender || 'all');
    setFormAppliesToEmploymentTypes(leaveType.applies_to_employment_types || ['trainee', 'intern', 'contract', 'employee']);
    setFormCarryForward(leaveType.carry_forward || false);
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
        max_negative_days: parseFloat(formMaxNegativeDays) || 0,
        applies_to_gender: formAppliesToGender,
        applies_to_employment_types: formAppliesToEmploymentTypes,
        carry_forward: formCarryForward,
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
    if (leaveType.is_system) {
      toast.error("System leave types cannot be deleted");
      return;
    }
    
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
        <div className="grid gap-5 py-4">
          {/* Name - Full width */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Annual Leave, Sick Leave"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          
          {/* Category and Gender - 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="appliesToGender">Applies to Gender</Label>
              <Select value={formAppliesToGender} onValueChange={(v) => setFormAppliesToGender(v as 'all' | 'male' | 'female')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="male">Male Only</SelectItem>
                  <SelectItem value="female">Female Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Employment Type Selector */}
          <div className="space-y-2">
            <Label>Applies to Employment Types</Label>
            <div className="flex flex-wrap gap-2">
              {employmentTypesData.map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  size="sm"
                  variant={formAppliesToEmploymentTypes.includes(type.name) ? "default" : "outline"}
                  onClick={() => {
                    if (formAppliesToEmploymentTypes.includes(type.name)) {
                      // Don't allow deselecting if it's the last one
                      if (formAppliesToEmploymentTypes.length > 1) {
                        setFormAppliesToEmploymentTypes(
                          formAppliesToEmploymentTypes.filter((t) => t !== type.name)
                        );
                      }
                    } else {
                      setFormAppliesToEmploymentTypes([...formAppliesToEmploymentTypes, type.name]);
                    }
                  }}
                >
                  {type.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select which employment types can use this leave type
            </p>
          </div>
          
          {/* Numeric fields - 3 columns with aligned labels */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Label htmlFor="defaultDays">Annual Leave Days</Label>
                <p className="text-xs text-muted-foreground">(Auto-credited Jan 1)</p>
              </div>
              <Input
                id="defaultDays"
                type="number"
                min="0"
                step="0.5"
                value={formDefaultDays}
                onChange={(e) => setFormDefaultDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Label htmlFor="maxNegativeDays">Max Negative Days</Label>
                <p className="text-xs text-muted-foreground">(0 = no negative)</p>
              </div>
              <Input
                id="maxNegativeDays"
                type="number"
                min="0"
                step="0.5"
                value={formMaxNegativeDays}
                onChange={(e) => setFormMaxNegativeDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Label htmlFor="minDaysAdvance">Min. Days Advance</Label>
                <p className="text-xs text-muted-foreground">(0 = any time)</p>
              </div>
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
          
          {/* Carry Forward Toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label>Carry Forward to Next Year</Label>
              <p className="text-xs text-muted-foreground">
                Unused balance (including negative) carries over to the next year
              </p>
            </div>
            <Switch
              checked={formCarryForward}
              onCheckedChange={setFormCarryForward}
            />
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
              <TableHead>Annual Days</TableHead>
              <TableHead>Max Negative</TableHead>
              <TableHead>Carry Forward</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Employment Types</TableHead>
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
                <TableCell>{leaveType.max_negative_days || 0}</TableCell>
                <TableCell>
                  {leaveType.carry_forward ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      Yes
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">No</span>
                  )}
                </TableCell>
                <TableCell>
                  {leaveType.applies_to_gender === 'all' ? (
                    <span className="text-muted-foreground text-sm">All</span>
                  ) : (
                    <Badge variant="outline" className="text-xs capitalize">
                      {leaveType.applies_to_gender}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {leaveType.applies_to_employment_types.length === 4 ? (
                    <span className="text-muted-foreground text-sm">All</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {leaveType.applies_to_employment_types.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs capitalize">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
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
                      disabled={leaveType.is_system}
                      title={leaveType.is_system ? "System leave types cannot be edited" : "Edit"}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(leaveType)}
                      disabled={leaveType.is_system}
                      title={leaveType.is_system ? "System leave types cannot be deactivated" : "Toggle active"}
                    >
                      <Switch
                        checked={leaveType.is_active}
                        className="scale-75"
                        disabled={leaveType.is_system}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(leaveType)}
                      className="text-destructive hover:text-destructive"
                      disabled={leaveType.is_system}
                      title={leaveType.is_system ? "System leave types cannot be deleted" : "Delete"}
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
          <div className="flex gap-2">
            {dialogContent}
          </div>
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
          <div className="flex gap-2">
            {dialogContent}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tableContent}
      </CardContent>
    </Card>
  );
};
