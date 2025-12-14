import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { format } from "date-fns";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";
import {
  DollarSign,
  CreditCard,
  Building2,
  Receipt,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
} from "lucide-react";

export default function SuperAdminPayments() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "bank_transfer",
    reference_number: "",
    notes: "",
  });

  // Fetch all subscriptions
  const { data: subscriptions, isLoading: loadingSubscriptions } = useQuery({
    queryKey: ["super-admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          organizations (id, name, slug, owner_email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all payments
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["super-admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          organizations (id, name, slug),
          invoices (invoice_number)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all invoices
  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["super-admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          organizations (id, name, slug)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Record manual payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      organization_id: string;
      amount: number;
      payment_method: string;
      reference_number: string;
      notes: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("payments")
        .insert({
          organization_id: paymentData.organization_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number,
          notes: paymentData.notes,
          status: "completed",
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;

      // Update subscription to active if it was inactive
      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("organization_id", paymentData.organization_id)
        .in("status", ["past_due", "unpaid"]);

      return data;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["super-admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-subscriptions"] });
      setRecordPaymentOpen(false);
      setPaymentForm({ amount: "", payment_method: "bank_transfer", reference_number: "", notes: "" });
      setSelectedOrg(null);
    },
    onError: (error) => {
      toast.error("Failed to record payment: " + error.message);
    },
  });

  // Update subscription status mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscription updated");
      queryClient.invalidateQueries({ queryKey: ["super-admin-subscriptions"] });
    },
    onError: (error) => {
      toast.error("Failed to update subscription: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      active: { variant: "default", icon: CheckCircle },
      trialing: { variant: "secondary", icon: Clock },
      past_due: { variant: "destructive", icon: XCircle },
      canceled: { variant: "outline", icon: XCircle },
      unpaid: { variant: "destructive", icon: XCircle },
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

  // Summary stats
  const stats = {
    totalSubscriptions: subscriptions?.length || 0,
    activeSubscriptions: subscriptions?.filter(s => s.status === "active").length || 0,
    trialingSubscriptions: subscriptions?.filter(s => s.status === "trialing").length || 0,
    totalRevenue: payments?.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0) || 0,
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <SuperAdminPageHeader 
          title="Subscription Management" 
          description="Manage billing across all organizations" 
        />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trialing</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialingSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSubscriptions ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Billing</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions?.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{sub.organizations?.name}</div>
                            <div className="text-sm text-muted-foreground">{sub.organizations?.owner_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{sub.plan}</TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                        <TableCell>
                          {sub.current_period_end 
                            ? format(new Date(sub.current_period_end), "MMM d, yyyy")
                            : sub.trial_ends_at 
                              ? format(new Date(sub.trial_ends_at), "MMM d, yyyy")
                              : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrg(sub.organizations);
                                setRecordPaymentOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Payment
                            </Button>
                            {sub.status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSubscriptionMutation.mutate({ id: sub.id, status: "canceled" })}
                              >
                                Cancel
                              </Button>
                            )}
                            {(sub.status === "canceled" || sub.status === "past_due") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSubscriptionMutation.mutate({ id: sub.id, status: "active" })}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {subscriptions?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No subscriptions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
              {loadingPayments ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Organization</TableHead>
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
                        <TableCell>{payment.organizations?.name}</TableCell>
                        <TableCell className="font-medium">
                          ${Number(payment.amount).toLocaleString()} {payment.currency}
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
                    {payments?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Organization</TableHead>
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
                        <TableCell>{invoice.organizations?.name}</TableCell>
                        <TableCell className="font-medium">
                          ${Number(invoice.amount).toLocaleString()} {invoice.currency}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedOrg && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{selectedOrg.name}</div>
                <div className="text-sm text-muted-foreground">{selectedOrg.owner_email}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
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
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="Transaction ID, cheque number, etc."
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedOrg || !paymentForm.amount) {
                  toast.error("Please enter an amount");
                  return;
                }
                recordPaymentMutation.mutate({
                  organization_id: selectedOrg.id,
                  amount: parseFloat(paymentForm.amount),
                  payment_method: paymentForm.payment_method,
                  reference_number: paymentForm.reference_number,
                  notes: paymentForm.notes,
                });
              }}
              disabled={recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
