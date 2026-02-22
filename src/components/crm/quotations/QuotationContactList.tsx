/**
 * QuotationContactList - Shows quotations linked to a specific contact
 * Can be embedded in a contact detail view or dialog
 */
import { FileText, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgLink } from '@/components/OrgLink';
import { useCRMQuotations, useCreateQuotation } from '@/services/useCRMQuotations';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import type { QuotationStatus } from '@/types/crm-quotation';

const statusColors: Record<QuotationStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viewed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  processed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  archived: 'bg-muted text-muted-foreground',
};

interface QuotationContactListProps {
  contactId: string;
  companyId?: string | null;
}

export const QuotationContactList = ({ contactId, companyId }: QuotationContactListProps) => {
  const { orgCode } = useParams<{ orgCode: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useCRMQuotations({ contact_id: contactId });
  const createMutation = useCreateQuotation();

  const quotations = data?.data || [];

  const handleCreate = async () => {
    const result = await createMutation.mutateAsync({
      contact_id: contactId,
      company_id: companyId || undefined,
    } as any);
    if (result?.id && orgCode) {
      navigate(`/org/${orgCode}/crm/quotations/${result.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">No quotations for this contact</p>
        <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Quotation
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-2">
        <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Quotation
        </Button>
      </div>
      {quotations.map(q => (
        <OrgLink key={q.id} to={`/crm/quotations/${q.id}`}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-sm">{q.quotation_number}</span>
                <Badge variant="secondary" className={statusColors[q.status]}>
                  {q.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                <span className="font-medium text-foreground tabular-nums">
                  {q.currency} {q.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="hidden sm:block">{format(new Date(q.created_at), 'dd MMM yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        </OrgLink>
      ))}
    </div>
  );
};
