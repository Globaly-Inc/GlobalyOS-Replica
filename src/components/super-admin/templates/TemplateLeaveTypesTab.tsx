import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Plus, Pencil, Trash2, Loader2, Globe, X, Check } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";
import { CountrySelector } from "@/components/ui/country-selector";

interface CountryDefault {
  id?: string;
  country_code: string;
  default_days: number;
}

interface TemplateLeaveType {
  id: string;
  country_code: string | null;
  name: string;
  category: string;
  description: string | null;
  default_days: number;
  min_days_advance: number;
  max_negative_days: number;
  applies_to_gender: string;
  applies_to_employment_types: string[] | null;
  carry_forward_mode: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  country_defaults?: CountryDefault[];
}

const CARRY_FORWARD_MODES = [
  { value: "none", label: "None - No carry forward" },
  { value: "positive_only", label: "Positive Only - Carry unused days" },
  { value: "negative_only", label: "Negative Only - Carry deficit" },
  { value: "all", label: "All - Carry any balance" },
];

const EMPLOYMENT_TYPE_OPTIONS = ["employee", "part_time", "contract", "trainee", "intern", "casual"];

export const TemplateLeaveTypesTab = () => {
  const queryClient = useQueryClient();
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<TemplateLeaveType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    country_code: "" as string | null,
    name: "",
    category: "paid" as "paid" | "unpaid",
    description: "",
    default_days: 0,
    min_days_advance: 0,
    max_negative_days: 0,
    applies_to_gender: "all",
    applies_to_employment_types: ["employee"] as string[],
    carry_forward_mode: "none",
    sort_order: 0,
    is_active: true,
  });

  // Country defaults state
  const [countryDefaults, setCountryDefaults] = useState<CountryDefault[]>([]);
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [newCountryCode, setNewCountryCode] = useState("");
  const [newCountryDays, setNewCountryDays] = useState(0);

  const { data: leaveTypes = [], isLoading } = useQuery({
    queryKey: ["template-leave-types", countryFilter],
    queryFn: async () => {
      let query = supabase
        .from("template_leave_types")
        .select(`
          *,
          country_defaults:template_leave_type_country_defaults(*)
        `)
        .order("country_code", { nullsFirst: true })
        .order("sort_order");

      if (countryFilter !== "all") {
        if (countryFilter === "global") {
          query = query.is("country_code", null);
        } else {
          query = query.eq("country_code", countryFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TemplateLeaveType[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        ...data,
        country_code: data.country_code || null,
      };

      let leaveTypeId = data.id;

      if (data.id) {
        const { error } = await supabase
          .from("template_leave_types")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: newType, error } = await supabase
          .from("template_leave_types")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        leaveTypeId = newType.id;
      }

      // Sync country defaults for global templates
      if (leaveTypeId && !payload.country_code) {
        // Get existing defaults
        const { data: existing } = await supabase
          .from("template_leave_type_country_defaults")
          .select("id, country_code")
          .eq("template_leave_type_id", leaveTypeId);

        // Delete removed ones
        const currentCodes = countryDefaults.map(c => c.country_code);
        const toDelete = existing?.filter(e => !currentCodes.includes(e.country_code)) || [];
        
        if (toDelete.length > 0) {
          await supabase
            .from("template_leave_type_country_defaults")
            .delete()
            .in("id", toDelete.map(d => d.id));
        }

        // Upsert current ones
        for (const cd of countryDefaults) {
          const { error } = await supabase
            .from("template_leave_type_country_defaults")
            .upsert({
              template_leave_type_id: leaveTypeId,
              country_code: cd.country_code,
              default_days: cd.default_days,
            }, { onConflict: "template_leave_type_id,country_code" });
          if (error) console.error("Error upserting country default:", error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-leave-types"] });
      toast.success(editingType ? "Leave type updated" : "Leave type created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Error saving leave type: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_leave_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-leave-types"] });
      toast.success("Leave type deleted");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error("Error deleting leave type: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      country_code: null,
      name: "",
      category: "paid",
      description: "",
      default_days: 0,
      min_days_advance: 0,
      max_negative_days: 0,
      applies_to_gender: "all",
      applies_to_employment_types: ["employee"],
      carry_forward_mode: "none",
      sort_order: 0,
      is_active: true,
    });
    setCountryDefaults([]);
    setEditingType(null);
    setShowAddCountry(false);
    setNewCountryCode("");
    setNewCountryDays(0);
  };

  const openEdit = (type: TemplateLeaveType) => {
    setEditingType(type);
    setFormData({
      country_code: type.country_code,
      name: type.name,
      category: type.category as "paid" | "unpaid",
      description: type.description || "",
      default_days: type.default_days,
      min_days_advance: type.min_days_advance,
      max_negative_days: type.max_negative_days,
      applies_to_gender: type.applies_to_gender,
      applies_to_employment_types: type.applies_to_employment_types || ["employee"],
      carry_forward_mode: type.carry_forward_mode,
      sort_order: type.sort_order,
      is_active: type.is_active,
    });
    // Load country defaults
    setCountryDefaults(type.country_defaults || []);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate({ ...formData, id: editingType?.id });
  };

  const toggleEmploymentType = (type: string) => {
    const current = formData.applies_to_employment_types;
    if (current.includes(type)) {
      setFormData({
        ...formData,
        applies_to_employment_types: current.filter(t => t !== type),
      });
    } else {
      setFormData({
        ...formData,
        applies_to_employment_types: [...current, type],
      });
    }
  };

  // Country defaults handlers
  const addCountryDefault = () => {
    if (!newCountryCode) {
      toast.error("Please select a country");
      return;
    }
    if (countryDefaults.some(cd => cd.country_code === newCountryCode)) {
      toast.error("This country already has a default");
      return;
    }
    setCountryDefaults([
      ...countryDefaults,
      { country_code: newCountryCode, default_days: newCountryDays }
    ]);
    setShowAddCountry(false);
    setNewCountryCode("");
    setNewCountryDays(0);
  };

  const updateCountryDefaultDays = (countryCode: string, days: number) => {
    setCountryDefaults(countryDefaults.map(cd =>
      cd.country_code === countryCode ? { ...cd, default_days: days } : cd
    ));
  };

  const removeCountryDefault = (countryCode: string) => {
    setCountryDefaults(countryDefaults.filter(cd => cd.country_code !== countryCode));
  };

  // Get unique countries from data
  const countriesInData = [...new Set(leaveTypes.map(t => t.country_code).filter(Boolean))] as string[];

  // Check if this is a global template (country-specific defaults only apply to global)
  const isGlobalTemplate = !formData.country_code;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Template Leave Types
            </CardTitle>
            <CardDescription>
              Manage leave type templates used during organization onboarding
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="global">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Global
                  </span>
                </SelectItem>
                {countriesInData.map(code => {
                  const country = COUNTRIES.find(c => c.code === code);
                  return (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2">
                        {getFlagEmoji(code)} {country?.name || code}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Leave Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leaveTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leave types found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Default Days</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((type) => {
                  const country = type.country_code
                    ? COUNTRIES.find(c => c.code === type.country_code)?.name || type.country_code
                    : "Global";
                  const countryOverridesCount = type.country_defaults?.length || 0;
                  return (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <Badge variant={type.country_code ? "outline" : "secondary"}>
                          {type.country_code ? country : (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" /> Global
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.category === "paid" ? "default" : "secondary"}>
                          {type.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          {type.default_days}
                          {countryOverridesCount > 0 && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                              +{countryOverridesCount} 🌍
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground capitalize">
                          {type.carry_forward_mode.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? "default" : "secondary"}>
                          {type.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(type)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(type.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Leave Type" : "Add Leave Type"}
            </DialogTitle>
            <DialogDescription>
              Configure leave type template settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={formData.country_code || "global"}
                  onValueChange={(v) => setFormData({ ...formData, country_code: v === "global" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Global (All Countries)
                      </span>
                    </SelectItem>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as "paid" | "unpaid" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Annual Leave"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Leave type description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Default Days</Label>
                <Input
                  type="number"
                  value={formData.default_days}
                  onChange={(e) => setFormData({ ...formData, default_days: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Days Advance</Label>
                <Input
                  type="number"
                  value={formData.min_days_advance}
                  onChange={(e) => setFormData({ ...formData, min_days_advance: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Negative Days</Label>
                <Input
                  type="number"
                  value={formData.max_negative_days}
                  onChange={(e) => setFormData({ ...formData, max_negative_days: Number(e.target.value) })}
                  min={0}
                />
              </div>
            </div>

            {/* Country-Specific Default Days Section - Only for Global templates */}
            {isGlobalTemplate && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div>
                  <Label className="text-sm font-medium">Country-Specific Default Days</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Override the default days for specific countries
                  </p>
                </div>

                {countryDefaults.length > 0 && (
                  <div className="space-y-2">
                    {/* Sort country defaults alphabetically by country name */}
                    {[...countryDefaults]
                      .sort((a, b) => {
                        const countryA = COUNTRIES.find(c => c.code === a.country_code)?.name || a.country_code;
                        const countryB = COUNTRIES.find(c => c.code === b.country_code)?.name || b.country_code;
                        return countryA.localeCompare(countryB);
                      })
                      .map((cd) => {
                      const country = COUNTRIES.find(c => c.code === cd.country_code);
                      return (
                        <div
                          key={cd.country_code}
                          className="flex items-center gap-3 p-2 bg-background rounded border"
                        >
                          <span className="text-lg">{getFlagEmoji(cd.country_code)}</span>
                          <span className="flex-1 text-sm font-medium">
                            {country?.name || cd.country_code}
                          </span>
                          <Input
                            type="number"
                            value={cd.default_days}
                            onChange={(e) => updateCountryDefaultDays(cd.country_code, Number(e.target.value))}
                            className="w-20 h-8 text-center"
                            min={0}
                          />
                          <span className="text-xs text-muted-foreground">days</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeCountryDefault(cd.country_code)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showAddCountry ? (
                  <div className="flex items-center gap-2 p-2 bg-background rounded border">
                    <CountrySelector
                      value={newCountryCode}
                      onChange={setNewCountryCode}
                      valueType="code"
                      placeholder="Select country"
                      className="flex-1"
                      excludeCountries={countryDefaults.map(cd => cd.country_code)}
                    />
                    <Input
                      type="number"
                      value={newCountryDays}
                      onChange={(e) => setNewCountryDays(Number(e.target.value))}
                      placeholder="Days"
                      className="w-20 h-9 text-center"
                      min={0}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-primary"
                      onClick={addCountryDefault}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        setShowAddCountry(false);
                        setNewCountryCode("");
                        setNewCountryDays(0);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCountry(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Country Override
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Applies to Gender</Label>
                <Select
                  value={formData.applies_to_gender}
                  onValueChange={(v) => setFormData({ ...formData, applies_to_gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male Only</SelectItem>
                    <SelectItem value="female">Female Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Carry Forward Mode</Label>
                <Select
                  value={formData.carry_forward_mode}
                  onValueChange={(v) => setFormData({ ...formData, carry_forward_mode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRY_FORWARD_MODES.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Applies to Employment Types</Label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPE_OPTIONS.map(type => (
                  <Badge
                    key={type}
                    variant={formData.applies_to_employment_types.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleEmploymentType(type)}
                  >
                    {type.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingType ? "Save Changes" : "Create Leave Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this leave type template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
