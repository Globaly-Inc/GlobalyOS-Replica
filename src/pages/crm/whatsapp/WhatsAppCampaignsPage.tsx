import { useState } from 'react';
import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import { useWaCampaigns, useSendWaCampaign } from '@/hooks/useWhatsAppTemplates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Megaphone, Send, BarChart3, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-muted text-muted-foreground',
};

const WhatsAppCampaignsPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const { data: campaigns = [], isLoading } = useWaCampaigns(orgId);
  const sendMutation = useSendWaCampaign();
  const navigate = useNavigate();

  const handleSend = (campaignId: string) => {
    sendMutation.mutate(campaignId, {
      onSuccess: () => toast.success('Broadcast sent!'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-1">Broadcasts and drip sequences for WhatsApp outreach</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/crm/whatsapp/sequences')}>
              <ListOrdered className="h-4 w-4 mr-2" />
              Sequences
            </Button>
            <Button size="sm" onClick={() => navigate('/crm/whatsapp/campaigns/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Broadcast
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No broadcasts yet</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Create your first broadcast to send template messages to your WhatsApp contacts.
            </p>
            <Button className="mt-4" onClick={() => navigate('/crm/whatsapp/campaigns/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Broadcast
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {campaigns.map((c) => {
              const stats = c.stats as { total: number; sent: number; delivered: number; read: number; failed: number };
              return (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-foreground">{c.name}</h3>
                        <Badge className={`text-xs ${statusColors[c.status] || ''}`}>
                          {c.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {c.wa_templates && (
                          <span className="font-mono">{c.wa_templates.name}</span>
                        )}
                        <span>Created {format(new Date(c.created_at), 'MMM d, yyyy')}</span>
                        {c.status === 'sent' && stats && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {stats.sent} sent · {stats.delivered} delivered · {stats.read} read
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === 'sent' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/crm/whatsapp/campaigns/${c.id}`)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Report
                        </Button>
                      )}
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSend(c.id)}
                          disabled={sendMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Now
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
};

export default WhatsAppCampaignsPage;
