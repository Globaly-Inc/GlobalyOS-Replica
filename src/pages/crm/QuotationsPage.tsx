import { useState } from 'react';
import { Search, Plus, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageBody } from '@/components/ui/page-body';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { OrgLink } from '@/components/OrgLink';
import { useCRMQuotations, useCreateQuotation } from '@/services/useCRMQuotations';
import type { QuotationStatus } from '@/types/crm-quotation';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';

const statusColors: Record<QuotationStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viewed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  processed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const statusTabs: Array<{ label: string; value: QuotationStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Approved', value: 'approved' },
  { label: 'Processed', value: 'processed' },
  { label: 'Expired', value: 'expired' },
];

const QuotationsPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const { orgCode } = useParams<{ orgCode: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useCRMQuotations({ search, status: statusFilter });
  const createMutation = useCreateQuotation();

  const quotations = data?.data || [];

  const handleCreate = async () => {
    const result = await createMutation.mutateAsync({});
    if (result?.id && orgCode) {
      navigate(`/org/${orgCode}/crm/quotations/${result.id}`);
    }
  };

  return (
    <PageBody>
      <PageHeader title="Quotations" subtitle="Create and manage client quotations with multi-option pricing">
        <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
          <Plus className="h-4 w-4" /> New Quotation
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as QuotationStatus | 'all')}>
          <TabsList>
            {statusTabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : quotations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">No quotations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first quotation to get started</p>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" /> Create Quotation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {quotations.map(q => (
            <OrgLink key={q.id} to={`/crm/quotations/${q.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{q.quotation_number}</span>
                        <Badge variant="secondary" className={statusColors[q.status]}>
                          {q.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {q.contact
                          ? `${q.contact.first_name} ${q.contact.last_name || ''}`
                          : q.company?.name || 'No contact assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground shrink-0">
                    <span className="font-medium text-foreground">
                      {q.currency} {q.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="hidden sm:block">
                      {format(new Date(q.created_at), 'dd MMM yyyy')}
                    </span>
                    {q.assignee && (
                      <span className="hidden md:block">
                        {q.assignee.first_name} {q.assignee.last_name}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </OrgLink>
          ))}
        </div>
      )}
    </PageBody>
  );
};

export default QuotationsPage;
