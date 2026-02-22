import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { format } from 'date-fns';
import type { CRMDeal } from '@/types/crm-pipeline';

interface Props {
  deals: CRMDeal[];
}

export function DealListView({ deals }: Props) {
  const { navigateOrg } = useOrgNavigation();

  return (
    <Card className="bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Deal</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!deals.length ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-12">No deals found</TableCell>
            </TableRow>
          ) : deals.map(deal => (
            <TableRow key={deal.id} className="cursor-pointer" onClick={() => navigateOrg(`/crm/deals/${deal.id}`)}>
              <TableCell className="font-medium">{deal.title}</TableCell>
              <TableCell>
                {deal.contact ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={deal.contact.avatar_url || ''} />
                      <AvatarFallback className="text-[10px]">{deal.contact.first_name?.[0]}{deal.contact.last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{deal.contact.first_name} {deal.contact.last_name}</span>
                  </div>
                ) : '—'}
              </TableCell>
              <TableCell>
                {deal.current_stage ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: (deal.current_stage as any)?.color || '#6366f1' }} />
                    <span className="text-sm">{(deal.current_stage as any)?.name}</span>
                  </div>
                ) : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={deal.priority === 'high' ? 'destructive' : deal.priority === 'medium' ? 'default' : 'secondary'} className="text-xs capitalize">
                  {deal.priority}
                </Badge>
              </TableCell>
              <TableCell>
                {deal.deal_value != null ? `${deal.currency} ${Number(deal.deal_value).toLocaleString()}` : '—'}
              </TableCell>
              <TableCell>
                {deal.assignee ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={deal.assignee.avatar_url || ''} />
                    <AvatarFallback className="text-[10px]">{deal.assignee.first_name?.[0]}{deal.assignee.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                ) : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(deal.updated_at), 'dd MMM yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
