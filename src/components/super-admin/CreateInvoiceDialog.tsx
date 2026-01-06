import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";
import type { Json } from "@/integrations/supabase/types";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationCode?: string;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  organizationId,
  organizationCode,
}: CreateInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [form, setForm] = useState({
    amount: "",
    description: "",
    due_date: "",
    currency: "USD",
    notes: "",
  });

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const orgCode = organizationCode?.substring(0, 4).toUpperCase() || "ORG";
    return `INV-${orgCode}-${year}${month}-${random}`;
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const invoiceNumber = generateInvoiceNumber();
      const lineItems: Json = [
        {
          description: form.description || "Service charge",
          amount: parseFloat(form.amount),
          quantity: 1,
        },
      ];

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          amount: parseFloat(form.amount),
          currency: form.currency,
          status: "pending",
          due_date: form.due_date || null,
          line_items: lineItems,
          notes: form.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: "payment_recorded",
        entityType: "payment",
        entityId: data.id,
        metadata: {
          invoice_number: invoiceNumber,
          amount: parseFloat(form.amount),
          currency: form.currency,
        },
      });

      return data;
    },
    onSuccess: (data) => {
      toast.success(`Invoice ${data.invoice_number} created`);
      queryClient.invalidateQueries({ queryKey: ["org-invoices", organizationId] });
      onOpenChange(false);
      setForm({ amount: "", description: "", due_date: "", currency: "USD", notes: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create invoice");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create a manual invoice for this organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(value) => setForm({ ...form, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Monthly subscription, Setup fee, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes for this invoice..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createInvoiceMutation.mutate()}
            disabled={!form.amount || createInvoiceMutation.isPending}
          >
            {createInvoiceMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
