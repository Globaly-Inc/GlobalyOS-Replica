import { useParams } from 'react-router-dom';
import { Users, BarChart2, MousePointer2, XCircle, CheckCircle2, AlertTriangle, Link } from 'lucide-react';
import { PageBody } from '@/components/ui/page-body';
import { useCampaign, useCampaignRecipients } from '@/services/useCampaigns';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import type { CampaignStatus, CampaignEvent } from '@/types/campaigns';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Build opens/clicks over time grouped by day
function buildEngagementTimeline(events: Array<{ type: string; ts: string }>) {
  const byDay: Record<string, { date: string; opens: number; clicks: number }> = {};

  for (const ev of events) {
    if (!['opened', 'clicked'].includes(ev.type)) continue;
    const day = format(new Date(ev.ts), 'dd MMM');
    if (!byDay[day]) byDay[day] = { date: day, opens: 0, clicks: 0 };
    if (ev.type === 'opened') byDay[day].opens++;
    if (ev.type === 'clicked') byDay[day].clicks++;
  }

  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

// Extract top clicked URLs
function buildTopLinks(events: Array<{ type: string; ts: string; meta?: Record<string, any> }>) {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    if (ev.type === 'clicked' && ev.meta?.url) {
      const url = ev.meta.url;
      counts[url] = (counts[url] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }));
}

export default function CampaignReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign } = useCampaign(id);
  const { data: recipientsData } = useCampaignRecipients(id, 1, 1000);
  const recipients = recipientsData?.data ?? [];

  const total = recipients.length || campaign?.recipient_count || 0;
  const sent = recipients.filter(r => ['sent','delivered','opened','clicked'].includes(r.status)).length;
  const opened = recipients.filter(r => ['opened','clicked'].includes(r.status)).length;
  const clicked = recipients.filter(r => r.status === 'clicked').length;
  const bounced = recipients.filter(r => r.status === 'bounced').length;
  const unsubscribed = recipients.filter(r => r.status === 'unsubscribed').length;

  const openRate = total > 0 ? ((opened / total) * 100).toFixed(1) : '—';
  const clickRate = total > 0 ? ((clicked / total) * 100).toFixed(1) : '—';
  const bounceRate = total > 0 ? ((bounced / total) * 100).toFixed(1) : '—';

  // Flatten all events across recipients for timeline + links
  const allEvents: Array<{ type: string; ts: string; meta?: Record<string, any> }> = recipients.flatMap(r =>
    (r.events ?? []).map(ev => ev as { type: string; ts: string; meta?: Record<string, any> })
  );

  const timelineData = buildEngagementTimeline(allEvents);
  const topLinks = buildTopLinks(allEvents);

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

      {/* Stat cards — 6 metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Recipients', value: total, icon: Users, color: 'text-foreground' },
          { label: 'Delivered', value: sent, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Open Rate', value: `${openRate}%`, icon: BarChart2, color: 'text-blue-600' },
          { label: 'Click Rate', value: `${clickRate}%`, icon: MousePointer2, color: 'text-purple-600' },
          { label: 'Bounced', value: bounced, icon: AlertTriangle, color: 'text-red-500' },
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

      {/* Engagement Over Time chart */}
      {timelineData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-foreground mb-4">Engagement Over Time</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="opens" stroke="#3b82f6" strokeWidth={2} dot={false} name="Opens" />
              <Line type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Clicks" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Clicked Links */}
      {topLinks.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Link className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Top Clicked Links</p>
          </div>
          <div className="divide-y divide-border">
            {topLinks.map(({ url, count }) => (
              <div key={url} className="flex items-center justify-between px-4 py-2.5">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate max-w-[70%]"
                >
                  {url}
                </a>
                <span className="text-sm font-medium text-foreground ml-4 shrink-0">
                  {count} click{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipients table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">Recipients ({total})</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Last Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recipients.slice(0, 100).map(r => {
                const lastEvent = r.events?.length ? r.events[r.events.length - 1] : null;
                return (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-sm text-foreground">{r.email}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{r.full_name ?? '—'}</td>
                    <td className="px-4 py-2">
                      <RecipientStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {lastEvent ? format(new Date((lastEvent as any).ts), 'dd MMM HH:mm') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recipients.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No recipient data yet</div>
          )}
          {recipients.length > 100 && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground text-center">
              Showing first 100 of {recipients.length} recipients
            </div>
          )}
        </div>
      </div>
    </PageBody>
  );
}

function RecipientStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    queued:       { label: 'Queued',       class: 'bg-muted text-muted-foreground' },
    sent:         { label: 'Sent',         class: 'bg-blue-100 text-blue-700' },
    delivered:    { label: 'Delivered',    class: 'bg-green-100 text-green-700' },
    opened:       { label: 'Opened',       class: 'bg-emerald-100 text-emerald-700' },
    clicked:      { label: 'Clicked',      class: 'bg-purple-100 text-purple-700' },
    bounced:      { label: 'Bounced',      class: 'bg-red-100 text-red-700' },
    unsubscribed: { label: 'Unsubscribed', class: 'bg-orange-100 text-orange-700' },
    complaint:    { label: 'Complaint',    class: 'bg-red-100 text-red-700' },
    failed:       { label: 'Failed',       class: 'bg-destructive/10 text-destructive' },
  };
  const c = config[status] ?? { label: status, class: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${c.class}`}>
      {c.label}
    </span>
  );
}
