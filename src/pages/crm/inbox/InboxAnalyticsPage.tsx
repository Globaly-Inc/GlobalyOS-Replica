import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, MessageSquare, Bot, Users, TrendingDown } from 'lucide-react';
import { ChannelBadge } from '@/components/inbox/ChannelBadge';
import type { InboxChannelType } from '@/types/inbox';

const InboxAnalyticsPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const { data: stats } = useQuery({
    queryKey: ['inbox-analytics', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [convRes, msgRes, aiRes, resolvedRes] = await Promise.all([
        supabase
          .from('inbox_conversations')
          .select('id, channel_type, status, created_at, first_response_at, resolved_at', { count: 'exact' })
          .eq('organization_id', orgId!)
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('inbox_messages')
          .select('id, direction, created_at', { count: 'exact' })
          .eq('organization_id', orgId!)
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('inbox_ai_events')
          .select('id, event_type, confidence', { count: 'exact' })
          .eq('organization_id', orgId!)
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('inbox_conversations')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId!)
          .eq('status', 'closed')
          .gte('created_at', thirtyDaysAgo),
      ]);

      const conversations = convRes.data || [];
      const messages = msgRes.data || [];
      const aiEvents = aiRes.data || [];

      // Calc avg first response time
      const withResponse = conversations.filter(
        (c: any) => c.first_response_at && c.created_at
      );
      const avgResponseMs =
        withResponse.length > 0
          ? withResponse.reduce(
              (sum: number, c: any) =>
                sum + (new Date(c.first_response_at).getTime() - new Date(c.created_at).getTime()),
              0
            ) / withResponse.length
          : 0;

      // Channel breakdown
      const byChannel: Record<string, number> = {};
      conversations.forEach((c: any) => {
        byChannel[c.channel_type] = (byChannel[c.channel_type] || 0) + 1;
      });

      return {
        totalConversations: convRes.count || 0,
        totalMessages: msgRes.count || 0,
        inboundMessages: messages.filter((m: any) => m.direction === 'inbound').length,
        outboundMessages: messages.filter((m: any) => m.direction === 'outbound').length,
        resolvedCount: resolvedRes.count || 0,
        aiAssists: aiRes.count || 0,
        aiAutoSends: aiEvents.filter((e: any) => e.event_type === 'auto_send').length,
        avgFirstResponseMin: Math.round(avgResponseMs / 60000),
        byChannel,
      };
    },
  });

  const statCards = [
    { label: 'Total Conversations', value: stats?.totalConversations ?? '—', icon: MessageSquare, color: 'text-blue-500' },
    { label: 'Avg First Response', value: stats?.avgFirstResponseMin ? `${stats.avgFirstResponseMin}m` : '—', icon: Clock, color: 'text-amber-500' },
    { label: 'Resolved (30d)', value: stats?.resolvedCount ?? '—', icon: TrendingDown, color: 'text-green-500' },
    { label: 'AI Assists', value: stats?.aiAssists ?? '—', icon: Bot, color: 'text-violet-500' },
    { label: 'Inbound Messages', value: stats?.inboundMessages ?? '—', icon: Users, color: 'text-cyan-500' },
    { label: 'Outbound Messages', value: stats?.outboundMessages ?? '—', icon: MessageSquare, color: 'text-primary' },
  ];

  return (
    <div className="py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inbox Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Last 30 days performance overview</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Channel breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Volume by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.byChannel && Object.keys(stats.byChannel).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.byChannel)
                  .sort((a, b) => b[1] - a[1])
                  .map(([channel, count]) => {
                    const max = Math.max(...Object.values(stats.byChannel));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={channel} className="flex items-center gap-3">
                        <ChannelBadge channel={channel as InboxChannelType} size="sm" showLabel />
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-medium w-10 text-right">{count}</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default InboxAnalyticsPage;
