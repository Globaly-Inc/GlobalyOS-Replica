import { useState } from 'react';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, FileText, Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useInvoiceSchedules } from '@/services/useAccountingInvoices';
import { OrgLink } from '@/components/OrgLink';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  generated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  skipped: 'bg-muted text-muted-foreground',
};

const InvoiceSchedules = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { navigateOrg } = useOrgNavigation();

  const { data: schedules = [], isLoading } = useInvoiceSchedules(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const handleProcessSchedules = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-invoice-schedules');
      if (error) throw error;
      toast.success(`Processed ${data?.processed || 0} schedules`);
      if (data?.errors?.length) {
        toast.warning(`${data.errors.length} schedule(s) had errors`);
      }
      queryClient.invalidateQueries({ queryKey: ['invoice-schedules'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to process schedules');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoice Schedules</h1>
          <p className="text-muted-foreground text-sm">Auto-generated invoices from deal fee instalments</p>
        </div>
        <Button onClick={handleProcessSchedules} disabled={processing}>
          {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Process Due Schedules
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Scheduled Invoices</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No invoice schedules found</p>
              <p className="text-sm">Schedules are created automatically from deal fee instalments</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auto Send</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule: any) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(schedule.scheduled_date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{schedule.crm_deals?.title || '—'}</TableCell>
                    <TableCell>{schedule.crm_deal_fees?.fee_name || '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[schedule.status] || ''} variant="secondary">
                        {schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{schedule.auto_send ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      {schedule.invoice_id ? (
                        <OrgLink to={`/accounting/invoices/${schedule.invoice_id}`} className="text-primary hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3" /> View
                        </OrgLink>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceSchedules;
