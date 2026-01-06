import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CreditCard,
  Receipt,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  DollarSign,
  Eye,
  Loader2,
  MoreHorizontal,
  FileText,
  Ban,
} from "lucide-react";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";

interface OrgBillingTabProps {
  organizationId: string;
  organizationCode?: string;
}

export function OrgBillingTab({ organizationId, organizationCode }: OrgBillingTabProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "bank_transfer",
    reference_number: "",
    notes: "",
    invoice_id: "",
  });

  // Fetch payments
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["org-payments", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, invoices(invoice_number)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch invoices
  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["org-invoices", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("payments").insert({
        organization_id: organizationId,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null,
        invoice_id: paymentForm.invoice_id || null,
        status: "completed",
        processed_by: user?.id,
        processed_at: new Date().toISOString(),
      });
      
      if (error) throw error;

      // Log the activity
      await logActivity({
        organizationId,
        actionType: 'payment_recorded',
        entityType: 'payment',
        metadata: { 
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number || null
        }
      });

      // If payment is linked to invoice, mark invoice as paid
      if (paymentForm.invoice_id) {
        await supabase
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", paymentForm.invoice_id);
      }
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["org-payments", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["org-invoices", organizationId] });
      setRecordPaymentOpen(false);
      setPaymentForm({ amount: "", payment_method: "bank_transfer", reference_number: "", notes: "", invoice_id: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  // Update invoice status mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "paid") {
        updates.paid_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", invoiceId);
      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: 'invoice_updated',
        entityType: 'payment',
        entityId: invoiceId,
        changes: { status: { from: "previous", to: status } }
      });
    },
    onSuccess: () => {
      toast.success("Invoice updated");
      queryClient.invalidateQueries({ queryKey: ["org-invoices", organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update invoice");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
      active: { variant: "default", icon: CheckCircle },
      trialing: { variant: "secondary", icon: Clock },
      past_due: { variant: "destructive", icon: XCircle },
      canceled: { variant: "outline", icon: XCircle },
      unpaid: { variant: "destructive", icon: XCircle },
      completed: { variant: "default", icon: CheckCircle },
      pending: { variant: "secondary", icon: Clock },
      paid: { variant: "default", icon: CheckCircle },
      draft: { variant: "outline", icon: Clock },
      void: { variant: "outline", icon: Ban },
    };
    const config = variants[status] || { variant: "outline", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "bank_transfer": return <Banknote className="h-4 w-4" />;
      case "card": return <CreditCard className="h-4 w-4" />;
      case "cheque": return <Receipt className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const pendingInvoices = invoices?.filter((inv) => inv.status === "pending") || [];

  const isLoading = loadingPayments || loadingInvoices;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invoices Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>All invoices for this organization</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => setCreateInvoiceOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                  <TableCell className="font-medium">
                    ${Number(invoice.amount).toFixed(2)} {invoice.currency}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>
                    {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {invoice.status === "pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => updateInvoiceMutation.mutate({ invoiceId: invoice.id, status: "paid" })}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateInvoiceMutation.mutate({ invoiceId: invoice.id, status: "void" })}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Mark as Void
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!invoices || invoices.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Receipt className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payments received from this organization</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRecordPaymentOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-medium">
                    ${Number(payment.amount).toFixed(2)} {payment.currency}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.payment_method)}
                      <span className="capitalize">{payment.payment_method.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell>{payment.reference_number || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.invoices?.invoice_number || "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                </TableRow>
              ))}
              {(!payments || payments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Manual Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {pendingInvoices.length > 0 && (
              <div className="space-y-2">
                <Label>Link to Invoice (Optional)</Label>
                <Select
                  value={paymentForm.invoice_id}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, invoice_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {pendingInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} - ${Number(inv.amount).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                placeholder="Transaction ID, cheque number, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordPaymentMutation.mutate()}
              disabled={!paymentForm.amount || recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createInvoiceOpen}
        onOpenChange={setCreateInvoiceOpen}
        organizationId={organizationId}
        organizationCode={organizationCode}
      />
    </div>
  );
}
