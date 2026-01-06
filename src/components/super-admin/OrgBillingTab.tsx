import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface OrgBillingTabProps {
  organizationId: string;
}

export function OrgBillingTab({ organizationId }: OrgBillingTabProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [activeTab, setActiveTab] = useState("subscription");
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "bank_transfer",
    reference_number: "",
    notes: "",
  });

  // Fetch subscription
  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ["org-subscription", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
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

      // Update subscription to active if needed
      if (subscription && ["past_due", "unpaid"].includes(subscription.status)) {
        await supabase
          .from("subscriptions")
          .update({ status: "active" })
          .eq("id", subscription.id);
          
        await logActivity({
          organizationId,
          actionType: 'subscription_updated',
          entityType: 'subscription',
          entityId: subscription.id,
          changes: { status: { from: subscription.status, to: 'active' } }
        });
      }
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["org-payments", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["org-subscription", organizationId] });
      setRecordPaymentOpen(false);
      setPaymentForm({ amount: "", payment_method: "bank_transfer", reference_number: "", notes: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!subscription) return;
      const previousStatus = subscription.status;
      const { error } = await supabase
        .from("subscriptions")
        .update({ status })
        .eq("id", subscription.id);
      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: status === 'canceled' ? 'subscription_canceled' : 'subscription_updated',
        entityType: 'subscription',
        entityId: subscription.id,
        changes: { status: { from: previousStatus, to: status } }
      });
    },
    onSuccess: () => {
      toast.success("Subscription updated");
      queryClient.invalidateQueries({ queryKey: ["org-subscription", organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update subscription");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      active: { variant: "default", icon: CheckCircle },
      trialing: { variant: "secondary", icon: Clock },
      past_due: { variant: "destructive", icon: XCircle },
      canceled: { variant: "outline", icon: XCircle },
      unpaid: { variant: "destructive", icon: XCircle },
      completed: { variant: "default", icon: CheckCircle },
      pending: { variant: "secondary", icon: Clock },
      paid: { variant: "default", icon: CheckCircle },
      draft: { variant: "outline", icon: Clock },
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

  const isLoading = loadingSubscription || loadingPayments || loadingInvoices;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Current Subscription</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordPaymentOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium capitalize">{subscription.plan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {getStatusBadge(subscription.status)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Billing Cycle</p>
                      <p className="font-medium capitalize">{subscription.billing_cycle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Period End</p>
                      <p className="font-medium">
                        {subscription.current_period_end
                          ? format(new Date(subscription.current_period_end), "MMM d, yyyy")
                          : subscription.trial_ends_at
                            ? format(new Date(subscription.trial_ends_at), "MMM d, yyyy")
                            : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    {subscription.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateSubscriptionMutation.mutate({ status: "canceled" })}
                      >
                        Cancel Subscription
                      </Button>
                    )}
                    {["canceled", "past_due", "unpaid"].includes(subscription.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateSubscriptionMutation.mutate({ status: "active" })}
                      >
                        Activate Subscription
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No subscription found for this organization.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
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
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
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
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invoices || invoices.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
