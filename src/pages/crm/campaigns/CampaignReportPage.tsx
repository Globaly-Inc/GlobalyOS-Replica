import { useParams } from 'react-router-dom';
import { Users, BarChart2, MousePointer2, XCircle, CheckCircle2 } from 'lucide-react';
import { PageBody } from '@/components/ui/page-body';
import { useCampaign, useCampaignRecipients } from '@/services/useCampaigns';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import type { CampaignStatus } from '@/types/campaigns';
import { format } from 'date-fns';

export default function CampaignReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign } = useCampaign(id);
  const { data: recipientsData } = useCampaignRecipients(id, 1, 500);
  const recipients = recipientsData?.data ?? [];

  const total = recipients.length || campaign?.recipient_count || 0;
  const sent = recipients.filter(r => ['sent','delivered','opened','clicked'].includes(r.status)).length;
  const opened = recipients.filter(r => ['opened','clicked'].includes(r.status)).length;
  const clicked = recipients.filter(r => r.status === 'clicked').length;
  const bounced = recipients.filter(r => r.status === 'bounced').length;
  const unsubscribed = recipients.filter(r => r.status === 'unsubscribed').length;

  const openRate = total > 0 ? ((opened / total) * 100).toFixed(1) : '—';
  const clickRate = total > 0 ? ((clicked / total) * 100).toFixed(1) : '—';

  return (
    <PageBody>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{campaign?.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {campaign?.sent_at && `Sent ${format(new Date(campaign.sent_at), 'dd MMM yyyy HH:mm')}`}
          </p>
        </div>
        {campaign && <CampaignStatusBadge status={campaign.status as CampaignStatus} />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Recipients', value: total, icon: Users, color: 'text-foreground' },
          { label: 'Delivered', value: sent, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Open Rate', value: `${openRate}%`, icon: BarChart2, color: 'text-blue-600' },
          { label: 'Click Rate', value: `${clickRate}%`, icon: MousePointer2, color: 'text-purple-600' },
          { label: 'Unsubscribed', value: unsubscribed, icon: XCircle, color: 'text-orange-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recipients table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">Recipients</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recipients.slice(0, 100).map(r => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 text-sm text-foreground">{r.email}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{r.full_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className="text-xs font-medium capitalize text-muted-foreground">{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recipients.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No recipient data yet</div>
          )}
        </div>
      </div>
    </PageBody>
  );
}
