import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Ticket, Percent, DollarSign, Copy, Loader2 } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applicable_plans: string[];
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

interface CouponFormData {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  applicable_plans: string[];
  valid_from: string;
  valid_until: string;
  max_uses: string;
  is_active: boolean;
}

const initialFormData: CouponFormData = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  applicable_plans: [],
  valid_from: new Date().toISOString().split("T")[0],
  valid_until: "",
  max_uses: "",
  is_active: true,
};

export function CouponManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);

  // Fetch coupons
  const { data: coupons, isLoading } = useQuery({
    queryKey: ["super-admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  // Fetch plans for applicable_plans dropdown
  const { data: plans } = useQuery({
    queryKey: ["subscription-plans-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("slug, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Create/update coupon mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      const payload = {
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        applicable_plans: data.applicable_plans.length > 0 ? data.applicable_plans : [],
        valid_from: data.valid_from,
        valid_until: data.valid_until || null,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        is_active: data.is_active,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(payload)
          .eq("id", editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingCoupon ? "Coupon updated" : "Coupon created");
      queryClient.invalidateQueries({ queryKey: ["super-admin-coupons"] });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save coupon");
    },
  });

  // Delete coupon mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coupon deleted");
      queryClient.invalidateQueries({ queryKey: ["super-admin-coupons"] });
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete coupon");
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-coupons"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update coupon");
    },
  });

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      applicable_plans: coupon.applicable_plans || [],
      valid_from: coupon.valid_from.split("T")[0],
      valid_until: coupon.valid_until ? coupon.valid_until.split("T")[0] : "",
      max_uses: coupon.max_uses?.toString() || "",
      is_active: coupon.is_active,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCoupon(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      toast.error("Valid discount value is required");
      return;
    }
    if (formData.discount_type === "percentage" && parseFloat(formData.discount_value) > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }
    saveMutation.mutate(formData);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return `$${coupon.discount_value.toFixed(2)}`;
  };

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return <Badge variant="outline">Exhausted</Badge>;
    }
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Coupon Codes</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage discount codes for subscriptions
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Plans</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons?.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <code className="font-mono font-medium">{coupon.code}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyCode(coupon.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {coupon.discount_type === "percentage" ? (
                        <Percent className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="font-medium">{getDiscountDisplay(coupon)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.applicable_plans.length === 0 ? (
                      <Badge variant="outline">All Plans</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {coupon.applicable_plans.slice(0, 2).map((plan) => (
                          <Badge key={plan} variant="secondary" className="text-xs">
                            {plan}
                          </Badge>
                        ))}
                        {coupon.applicable_plans.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{coupon.applicable_plans.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{coupon.current_uses}</span>
                    {coupon.max_uses && (
                      <span className="text-muted-foreground"> / {coupon.max_uses}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {coupon.valid_until
                      ? format(new Date(coupon.valid_until), "dd MMM yyyy")
                      : "No expiry"}
                  </TableCell>
                  <TableCell>{getStatusBadge(coupon)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: coupon.id, is_active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setCouponToDelete(coupon);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!coupons || coupons.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No coupons created yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Edit Coupon" : "Create Coupon"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SAVE20"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Internal notes about this coupon"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_value">Value *</Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === "percentage" ? "20" : "10.00"}
                  min="0"
                  step={formData.discount_type === "percentage" ? "1" : "0.01"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid From</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_uses">Max Uses (leave empty for unlimited)</Label>
              <Input
                id="max_uses"
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                placeholder="Unlimited"
                min="1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingCoupon ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the coupon "{couponToDelete?.code}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => couponToDelete && deleteMutation.mutate(couponToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
