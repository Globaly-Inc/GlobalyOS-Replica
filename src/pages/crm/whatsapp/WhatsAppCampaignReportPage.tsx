import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, CheckCircle, Eye, AlertCircle, MessageCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-muted text-muted-foreground',
};

const WhatsAppCampaignReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const navigate = useNavigate();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['wa-campaign', id],
    enabled: !!orgId && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_campaigns')
        .select('*, wa_templates(*)')
        .eq('id', id!)
        .eq('organization_id', orgId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <>
        <WhatsAppSubNav />
        <PageBody>
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        </PageBody>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <WhatsAppSubNav />
        <PageBody>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Campaign not found.</p>
            <Button variant="link" onClick={() => navigate('/crm/whatsapp/campaigns')}>
              Back to campaigns
            </Button>
          </div>
        </PageBody>
      </>
    );
  }

  const stats = campaign.stats as {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied: number;
  } | null;

  const chartData = stats
    ? [
        { name: 'Total', value: stats.total, fill: 'hsl(var(--muted-foreground))' },
        { name: 'Sent', value: stats.sent, fill: 'hsl(var(--primary))' },
        { name: 'Delivered', value: stats.delivered, fill: 'hsl(210, 80%, 55%)' },
        { name: 'Read', value: stats.read, fill: 'hsl(142, 70%, 45%)' },
        { name: 'Replied', value: stats.replied, fill: 'hsl(262, 60%, 55%)' },
        { name: 'Failed', value: stats.failed, fill: 'hsl(0, 70%, 55%)' },
      ]
    : [];

  const statCards = stats
    ? [
        { label: 'Sent', value: stats.sent, icon: Send, color: 'text-primary' },
        { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Read', value: stats.read, icon: Eye, color: 'text-green-600 dark:text-green-400' },
        { label: 'Replied', value: stats.replied, icon: MessageCircle, color: 'text-purple-600 dark:text-purple-400' },
        { label: 'Failed', value: stats.failed, icon: AlertCircle, color: 'text-destructive' },
      ]
    : [];

  const template = campaign.wa_templates as { name: string; category: string; language: string } | null;

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/crm/whatsapp/campaigns')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
                <Badge className={`text-xs ${statusColors[campaign.status] || ''}`}>
                  {campaign.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Created {format(new Date(campaign.created_at), 'MMM d, yyyy · h:mm a')}
                {campaign.completed_at &&
                  ` · Completed ${format(new Date(campaign.completed_at), 'MMM d, yyyy · h:mm a')}`}
              </p>
            </div>
          </div>

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {statCards.map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Bar chart */}
          {stats && stats.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--popover-foreground))',
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {template && (
                  <>
                    <div>
                      <dt className="text-muted-foreground">Template</dt>
                      <dd className="font-medium text-foreground font-mono">{template.name}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="font-medium text-foreground capitalize">{template.category}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Language</dt>
                      <dd className="font-medium text-foreground">{template.language}</dd>
                    </div>
                  </>
                )}
                <div>
                  <dt className="text-muted-foreground">Audience Source</dt>
                  <dd className="font-medium text-foreground capitalize">{campaign.audience_source || 'All contacts'}</dd>
                </div>
                {campaign.scheduled_at && (
                  <div>
                    <dt className="text-muted-foreground">Scheduled At</dt>
                    <dd className="font-medium text-foreground">
                      {format(new Date(campaign.scheduled_at), 'MMM d, yyyy · h:mm a')}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Throttle</dt>
                  <dd className="font-medium text-foreground">{campaign.throttle_per_second} msg/sec</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
};

export default WhatsAppCampaignReportPage;
