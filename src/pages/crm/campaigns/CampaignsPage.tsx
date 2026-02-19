import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Mail, Send, TrendingUp, Users, Search, MoreHorizontal, Copy, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageBody } from '@/components/ui/page-body';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import {
  useCampaigns,
  useDeleteCampaign,
  useDuplicateCampaign,
  useUpdateCampaign,
} from '@/services/useCampaigns';
import type { EmailCampaign, CampaignStatus } from '@/types/campaigns';

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'archived', label: 'Archived' },
];

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { orgCode } = useParams<{ orgCode: string }>();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useCampaigns(statusFilter);
  const deleteMutation = useDeleteCampaign();
  const duplicateMutation = useDuplicateCampaign();
  const updateMutation = useUpdateCampaign();

  const campaigns = (data?.data ?? []).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const sentCampaigns = (data?.data ?? []).filter(c => c.status === 'sent');
  const totalSent = sentCampaigns.reduce((a, c) => a + c.recipient_count, 0);

  const handleDelete = async (campaign: EmailCampaign) => {
    if (!confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(campaign.id);
      toast.success('Campaign deleted');
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  const handleDuplicate = async (campaign: EmailCampaign) => {
    try {
      const copy = await duplicateMutation.mutateAsync(campaign);
      toast.success('Campaign duplicated');
      navigate(`/org/${orgCode}/crm/campaigns/${copy.id}`);
    } catch {
      toast.error('Failed to duplicate campaign');
    }
  };

  const handleArchive = async (campaign: EmailCampaign) => {
    try {
      await updateMutation.mutateAsync({ id: campaign.id, status: 'archived' });
      toast.success('Campaign archived');
    } catch {
      toast.error('Failed to archive');
    }
  };

  return (
    <PageBody>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Email Campaigns</h1>
            <p className="text-sm text-muted-foreground">Design, send and track bulk email campaigns</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/org/${orgCode}/crm/campaigns/new`)} className="gap-2">
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: data?.count ?? 0, icon: Mail },
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Send },
          { label: 'Campaigns Sent', value: sentCampaigns.length, icon: TrendingUp },
          { label: 'Avg Recipients', value: sentCampaigns.length > 0 ? Math.round(totalSent / sentCampaigns.length) : 0, icon: Users },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {statusFilters.map(f => (
            <Button
              key={f.value}
              size="sm"
              variant={statusFilter === f.value ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Campaigns list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first email campaign to start engaging your contacts.</p>
          <Button onClick={() => navigate(`/org/${orgCode}/crm/campaigns/new`)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
          <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Recipients</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Open %</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Click %</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Created</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map(campaign => {
                const rc = campaign.recipient_count || 0;
                const openRate = rc > 0 && campaign.status === 'sent' ? '—' : null;
                const clickRate = rc > 0 && campaign.status === 'sent' ? '—' : null;
                return (
                <tr
                  key={campaign.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/org/${orgCode}/crm/campaigns/${campaign.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{campaign.name}</p>
                    {campaign.subject && <p className="text-xs text-muted-foreground mt-0.5">{campaign.subject}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <CampaignStatusBadge status={campaign.status as CampaignStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-muted-foreground">{campaign.recipient_count.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    {campaign.status === 'sent' ? (
                      <a
                        href={`/org/${orgCode}/crm/campaigns/${campaign.id}/report`}
                        onClick={e => { e.stopPropagation(); navigate(`/org/${orgCode}/crm/campaigns/${campaign.id}/report`); }}
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">—</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{format(new Date(campaign.created_at), 'dd MMM yyyy')}</span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/org/${orgCode}/crm/campaigns/${campaign.id}`)}>
                          Edit
                        </DropdownMenuItem>
                        {campaign.status === 'sent' && (
                          <DropdownMenuItem onClick={() => navigate(`/org/${orgCode}/crm/campaigns/${campaign.id}/report`)}>
                            View Report
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicate(campaign)}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        {campaign.status !== 'archived' && (
                          <DropdownMenuItem onClick={() => handleArchive(campaign)}>
                            <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(campaign)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageBody>
  );
}
