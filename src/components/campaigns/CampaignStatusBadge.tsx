import { Badge } from '@/components/ui/badge';
import type { CampaignStatus } from '@/types/campaigns';
import { cn } from '@/lib/utils';

const config: Record<CampaignStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-muted text-muted-foreground hover:bg-muted' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  sending:   { label: 'Sending',   className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  sent:      { label: 'Sent',      className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  failed:    { label: 'Failed',    className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  archived:  { label: 'Archived',  className: 'bg-muted text-muted-foreground/60 hover:bg-muted' },
};

interface Props {
  status: CampaignStatus;
  className?: string;
}

export const CampaignStatusBadge = ({ status, className }: Props) => {
  const { label, className: statusClass } = config[status] ?? config.draft;
  return (
    <Badge className={cn('text-xs font-medium border-0', statusClass, className)}>
      {label}
    </Badge>
  );
};
