import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgPhoneNumbers } from '@/hooks/useTelephony';
import { useCallCampaigns, useCampaignContacts, useCreateCampaign, useUpdateCampaignStatus } from '@/hooks/useCallCampaigns';
import { useDialCampaignContact } from '@/hooks/useCallMonitoring';
import { CallsSubNav } from '@/components/calls/CallsSubNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  PhoneCall, Plus, Play, Pause, CheckCircle, XCircle, Users, Clock, Loader2, BarChart3, PhoneOutgoing,
} from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

const CallCampaignsPage = () => {
  const { currentOrg } = useOrganization();
  const { data: phoneNumbers = [] } = useOrgPhoneNumbers();
  const { data: campaigns = [], isLoading } = useCallCampaigns();
  const createCampaign = useCreateCampaign();
  const updateStatus = useUpdateCampaignStatus();
  const dialNext = useDialCampaignContact();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const { data: contacts = [] } = useCampaignContacts(selectedCampaignId ?? undefined);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPhoneId, setNewPhoneId] = useState('');
  const [newContacts, setNewContacts] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const contactLines = newContacts.split('\n').filter(Boolean).map((line) => {
      const parts = line.split(',').map((s) => s.trim());
      return { phone_number: parts[0], contact_name: parts[1] || undefined };
    });
    await createCampaign.mutateAsync({
      name: newName,
      description: newDesc || undefined,
      phone_number_id: newPhoneId || undefined,
      contacts: contactLines,
    });
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    setNewContacts('');
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  return (
    <div>
      <CallsSubNav />
      <div className="container px-4 md:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Call Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-1">Power dialer and outbound call campaigns</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <PhoneCall className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create a call campaign to auto-dial contacts from your CRM.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => {
              const progress = c.total_contacts > 0 ? Math.round((c.completed_calls / c.total_contacts) * 100) : 0;
              return (
                <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setSelectedCampaignId(c.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{c.name}</CardTitle>
                      <Badge className={`text-[10px] ${statusColors[c.status] || ''}`}>{c.status}</Badge>
                    </div>
                    {c.description && <CardDescription className="text-xs">{c.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={progress} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold">{c.total_contacts}</p>
                        <p className="text-[10px] text-muted-foreground">Contacts</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{c.connected_calls}</p>
                        <p className="text-[10px] text-muted-foreground">Connected</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-destructive">{c.failed_calls}</p>
                        <p className="text-[10px] text-muted-foreground">Failed</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), 'MMM d, yyyy')}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Campaign detail dialog */}
        <Dialog open={!!selectedCampaignId} onOpenChange={(o) => !o && setSelectedCampaignId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedCampaign?.name}
                {selectedCampaign && <Badge className={`text-[10px] ${statusColors[selectedCampaign.status] || ''}`}>{selectedCampaign.status}</Badge>}
              </DialogTitle>
            </DialogHeader>
            {selectedCampaign && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {selectedCampaign.status === 'draft' && (
                    <Button size="sm" className="gap-1" onClick={() => updateStatus.mutate({ id: selectedCampaign.id, status: 'active' })}>
                      <Play className="h-3.5 w-3.5" /> Start Campaign
                    </Button>
                  )}
                  {selectedCampaign.status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => dialNext.mutate({ campaign_id: selectedCampaign.id, organization_id: currentOrg!.id })}
                        disabled={dialNext.isPending}
                      >
                        {dialNext.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PhoneOutgoing className="h-3.5 w-3.5" />}
                        Dial Next
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus.mutate({ id: selectedCampaign.id, status: 'paused' })}>
                        <Pause className="h-3.5 w-3.5" /> Pause
                      </Button>
                    </>
                  )}
                  {selectedCampaign.status === 'paused' && (
                    <Button size="sm" className="gap-1" onClick={() => updateStatus.mutate({ id: selectedCampaign.id, status: 'active' })}>
                      <Play className="h-3.5 w-3.5" /> Resume
                    </Button>
                  )}
                  {(selectedCampaign.status === 'active' || selectedCampaign.status === 'paused') && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus.mutate({ id: selectedCampaign.id, status: 'completed' })}>
                      <CheckCircle className="h-3.5 w-3.5" /> Complete
                    </Button>
                  )}
                </div>

                <div className="rounded-md border divide-y max-h-[400px] overflow-y-auto">
                  {contacts.map((ct) => (
                    <div key={ct.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{ct.contact_name || ct.phone_number}</p>
                          <p className="text-xs text-muted-foreground font-mono">{ct.phone_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{ct.status}</Badge>
                        {ct.duration_seconds != null && ct.duration_seconds > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {Math.round(ct.duration_seconds / 60 * 10) / 10}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No contacts in this campaign</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create campaign dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Call Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Campaign Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Q1 Outreach" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Caller ID (Phone Number)</Label>
                <Select value={newPhoneId} onValueChange={setNewPhoneId}>
                  <SelectTrigger><SelectValue placeholder="Select number" /></SelectTrigger>
                  <SelectContent>
                    {phoneNumbers.map((pn) => (
                      <SelectItem key={pn.id} value={pn.id}>{pn.friendly_name || pn.phone_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Contacts (one per line: phone,name)</Label>
                <Textarea
                  value={newContacts}
                  onChange={(e) => setNewContacts(e.target.value)}
                  rows={6}
                  placeholder={"+15551234567,John Doe\n+15559876543,Jane Smith"}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || createCampaign.isPending}>
                {createCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CallCampaignsPage;
