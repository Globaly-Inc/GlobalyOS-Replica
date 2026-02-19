import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { SetupWizard } from '@/components/whatsapp/SetupWizard';
import { useOrganization } from '@/hooks/useOrganization';
import { useWaConversations } from '@/hooks/useWhatsAppInbox';
import { useWaContacts } from '@/hooks/useWhatsAppAutomations';
import { useWaCampaigns, useWaTemplates } from '@/hooks/useWhatsAppTemplates';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageCircle, Users, FileText, Megaphone, Inbox, CheckCircle,
  AlertCircle, Clock, ArrowRight, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const WhatsAppOverviewPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const navigate = useNavigate();

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['wa-account', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from('wa_accounts')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('status', 'connected')
        .maybeSingle();
      return data;
    },
  });

  const { data: conversations = [] } = useWaConversations(orgId);
  const { data: contacts = [] } = useWaContacts(orgId);
  const { data: templates = [] } = useWaTemplates(orgId);
  const { data: campaigns = [] } = useWaCampaigns(orgId);

  const isConnected = !!account;

  // Stats
  const openConvs = conversations.filter((c) => c.status === 'open' || c.status === 'assigned').length;
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const optedIn = contacts.filter((c) => c.opt_in_status === 'opted_in').length;
  const approvedTemplates = templates.filter((t) => t.status === 'approved').length;
  const sentCampaigns = campaigns.filter((c) => c.status === 'sent').length;

  if (accountLoading) return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </PageBody>
    </>
  );

  if (!isConnected) {
    return (
      <>
        <WhatsAppSubNav />
        <PageBody>
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
              <p className="text-muted-foreground mt-1">
                Connect your WhatsApp Business Account to message customers, run campaigns, and automate conversations.
              </p>
            </div>
            <SetupWizard />
          </div>
        </PageBody>
      </>
    );
  }

  const statCards = [
    {
      title: 'Open Conversations',
      value: openConvs,
      sub: `${unreadCount} unread`,
      icon: Inbox,
      href: '/crm/whatsapp/inbox',
      color: 'text-primary',
    },
    {
      title: 'Contacts',
      value: contacts.length,
      sub: `${optedIn} opted in`,
      icon: Users,
      href: '/crm/whatsapp/contacts',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Templates',
      value: templates.length,
      sub: `${approvedTemplates} approved`,
      icon: FileText,
      href: '/crm/whatsapp/templates',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Broadcasts',
      value: campaigns.length,
      sub: `${sentCampaigns} sent`,
      icon: Megaphone,
      href: '/crm/whatsapp/campaigns',
      color: 'text-amber-600 dark:text-amber-400',
    },
  ];

  // Recent conversations
  const recentConvs = conversations.slice(0, 5);

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">WhatsApp Overview</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Connected as <span className="font-medium text-foreground">{account.display_name || account.display_phone}</span>
              </p>
            </div>
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" /> Connected
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <Card
                key={s.title}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(s.href)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate('/crm/whatsapp/inbox')}>
                  <MessageCircle className="h-4 w-4 mr-2" /> Open Inbox
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/crm/whatsapp/templates')}>
                  <FileText className="h-4 w-4 mr-2" /> Create Template
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/crm/whatsapp/campaigns/new')}>
                  <Megaphone className="h-4 w-4 mr-2" /> New Broadcast
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/crm/whatsapp/contacts')}>
                  <Users className="h-4 w-4 mr-2" /> Manage Contacts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Conversations */}
          {recentConvs.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Conversations</CardTitle>
                <Button variant="link" size="sm" className="text-xs" onClick={() => navigate('/crm/whatsapp/inbox')}>
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentConvs.map((conv) => {
                    const contact = (conv as any).wa_contacts;
                    const name = contact?.name || contact?.phone || 'Unknown';
                    const statusIcon = {
                      open: <AlertCircle className="h-3.5 w-3.5 text-amber-500" />,
                      assigned: <CheckCircle className="h-3.5 w-3.5 text-blue-500" />,
                      resolved: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
                      closed: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
                    }[conv.status] || null;

                    return (
                      <div
                        key={conv.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate('/crm/whatsapp/inbox')}
                      >
                        <div className="flex items-center gap-3">
                          {statusIcon}
                          <div>
                            <p className="text-sm font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{conv.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {conv.unread_count > 0 && (
                            <Badge variant="default" className="text-xs h-5 min-w-[20px] px-1.5">
                              {conv.unread_count}
                            </Badge>
                          )}
                          {conv.last_message_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(conv.last_message_at), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageBody>
    </>
  );
};

export default WhatsAppOverviewPage;
