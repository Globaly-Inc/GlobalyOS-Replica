import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { mockInvoices } from '@/data/subscriptions-mock';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const invoiceStatusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-blue-100 text-blue-800',
  past_due: 'bg-red-100 text-red-800',
  voided: 'bg-gray-100 text-gray-600',
  partially_paid: 'bg-amber-100 text-amber-800',
};

const agingData = [
  { bucket: '0-30 days', amount: 18420 },
  { bucket: '31-60 days', amount: 7840 },
  { bucket: '61-90 days', amount: 3210 },
  { bucket: '90+ days', amount: 1650 },
];

const InvoiceTable = ({ invoices }: { invoices: typeof mockInvoices }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Invoice #</TableHead>
        <TableHead>Organization</TableHead>
        <TableHead>Amount</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Issue Date</TableHead>
        <TableHead>Due Date</TableHead>
        <TableHead>Paid</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {invoices.map((inv) => (
        <TableRow key={inv.id}>
          <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
          <TableCell className="font-medium">{inv.org_name}</TableCell>
          <TableCell>${inv.amount.toLocaleString()}</TableCell>
          <TableCell><Badge className={cn('border-0', invoiceStatusColors[inv.status])}>{inv.status}</Badge></TableCell>
          <TableCell className="text-muted-foreground text-sm">{inv.issue_date}</TableCell>
          <TableCell className="text-muted-foreground text-sm">{inv.due_date}</TableCell>
          <TableCell className="text-muted-foreground text-sm">{inv.paid_at || '—'}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const SuperAdminBilling = () => (
  <SubscriptionsLayout>
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Billing & Invoices</h2>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({mockInvoices.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({mockInvoices.filter(i => i.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="past_due">Past Due ({mockInvoices.filter(i => i.status === 'past_due').length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({mockInvoices.filter(i => i.status === 'paid').length})</TabsTrigger>
          <TabsTrigger value="voided">Voided ({mockInvoices.filter(i => i.status === 'voided').length})</TabsTrigger>
        </TabsList>
        <div className="bg-card rounded-lg border mt-4">
          <TabsContent value="all" className="m-0"><InvoiceTable invoices={mockInvoices} /></TabsContent>
          <TabsContent value="pending" className="m-0"><InvoiceTable invoices={mockInvoices.filter(i => i.status === 'pending')} /></TabsContent>
          <TabsContent value="past_due" className="m-0"><InvoiceTable invoices={mockInvoices.filter(i => i.status === 'past_due')} /></TabsContent>
          <TabsContent value="paid" className="m-0"><InvoiceTable invoices={mockInvoices.filter(i => i.status === 'paid')} /></TabsContent>
          <TabsContent value="voided" className="m-0"><InvoiceTable invoices={mockInvoices.filter(i => i.status === 'voided')} /></TabsContent>
        </div>
      </Tabs>

      {/* Receivables Aging */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-3">Receivables Aging</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="bucket" width={90} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="amount" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </SubscriptionsLayout>
);

export default SuperAdminBilling;
