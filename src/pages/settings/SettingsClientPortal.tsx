import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Globe, Shield, Sparkles, Users, Plus, Mail, MoreVertical, FolderOpen, Eye, UserX, RefreshCw, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';

const SettingsClientPortal = () => {
  const { currentOrg } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [offices, setOffices] = useState<any[]>([]);
  const [portalOffices, setPortalOffices] = useState<string[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteOffice, setInviteOffice] = useState('');
  const [inviting, setInviting] = useState(false);
  const [createCaseOpen, setCreateCaseOpen] = useState(false);
  const [caseClientId, setCaseClientId] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [casePriority, setCasePriority] = useState('normal');
  const [creatingCase, setCreatingCase] = useState(false);

  const orgId = currentOrg?.id;

  useEffect(() => {
    if (!orgId) return;
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    setClientsLoading(true);

    const [settingsRes, officesRes, portalOfficesRes, clientsRes] = await Promise.all([
      supabase.from('client_portal_settings').select('*').eq('organization_id', orgId).maybeSingle(),
      supabase.from('offices').select('id, name').eq('organization_id', orgId).order('name'),
      supabase.from('client_portal_offices').select('office_id').eq('organization_id', orgId),
      supabase.from('client_portal_users').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
    ]);

    setSettings(settingsRes.data || {
      is_enabled: false,
      branding_company_name: currentOrg?.name || '',
      branding_primary_color: '#3B82F6',
      branding_logo_url: '',
      otp_expiry_minutes: 10,
      otp_max_attempts: 5,
      otp_lockout_minutes: 15,
      ai_auto_reply_enabled: false,
      ai_confidence_threshold: 0.8,
    });
    setOffices(officesRes.data || []);
    setPortalOffices((portalOfficesRes.data || []).map((o: any) => o.office_id));
    setClients(clientsRes.data || []);
    setLoading(false);
    setClientsLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        is_enabled: settings.is_enabled,
        branding_company_name: settings.branding_company_name,
        branding_primary_color: settings.branding_primary_color,
        branding_logo_url: settings.branding_logo_url,
        otp_expiry_minutes: settings.otp_expiry_minutes,
        otp_max_attempts: settings.otp_max_attempts,
        otp_lockout_minutes: settings.otp_lockout_minutes,
        ai_auto_reply_enabled: settings.ai_auto_reply_enabled,
        ai_confidence_threshold: settings.ai_confidence_threshold,
      };

      const { error } = await supabase
        .from('client_portal_settings')
        .upsert(payload, { onConflict: 'organization_id' });

      if (error) throw error;

      // Update portal offices
      await supabase.from('client_portal_offices').delete().eq('organization_id', orgId);
      if (portalOffices.length > 0) {
        await supabase.from('client_portal_offices').insert(
          portalOffices.map(officeId => ({ organization_id: orgId, office_id: officeId }))
        );
      }

      toast.success('Portal settings saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteClient = async () => {
    if (!orgId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'invite-client',
          organizationId: orgId,
          email: inviteEmail.trim(),
          fullName: inviteName.trim() || undefined,
          officeId: inviteOffice || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Client invited successfully');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteOffice('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite client');
    } finally {
      setInviting(false);
    }
  };

  const handleClientAction = async (clientId: string, action: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body: any = { organizationId: orgId };

      if (action === 'suspend') {
        body.action = 'update-client-status';
        body.clientUserId = clientId;
        body.status = 'suspended';
      } else if (action === 'activate') {
        body.action = 'update-client-status';
        body.clientUserId = clientId;
        body.status = 'active';
      } else if (action === 'revoke-sessions') {
        body.action = 'revoke-sessions';
        body.clientUserId = clientId;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Action completed');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleCreateCase = async () => {
    if (!orgId || !caseClientId || !caseTitle.trim()) return;
    setCreatingCase(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create-case',
          organizationId: orgId,
          clientUserId: caseClientId,
          title: caseTitle.trim(),
          description: caseDescription.trim() || undefined,
          priority: casePriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Case created');
      setCreateCaseOpen(false);
      setCaseTitle('');
      setCaseDescription('');
      setCasePriority('normal');
      setCaseClientId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create case');
    } finally {
      setCreatingCase(false);
    }
  };

  const toggleOffice = (officeId: string) => {
    setPortalOffices(prev =>
      prev.includes(officeId) ? prev.filter(id => id !== officeId) : [...prev, officeId]
    );
  };

  const portalUrl = currentOrg?.slug
    ? `${window.location.origin}/org/${currentOrg.slug}/portal/login`
    : '';

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Client Portal" subtitle="Configure your client portal" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    invited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Portal"
        subtitle="Configure your client-facing portal for case tracking, messaging, and documents"
      />

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Globe className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Enable/Disable */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Portal Status</CardTitle>
                  <CardDescription>Enable or disable the client portal for your organization</CardDescription>
                </div>
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={v => setSettings({ ...settings, is_enabled: v })}
                />
              </div>
            </CardHeader>
            {settings.is_enabled && portalUrl && (
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Portal URL:</span>
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-xs">
                    {portalUrl}
                  </a>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Branding</CardTitle>
              <CardDescription>Customize how your portal looks to clients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={settings.branding_company_name || ''}
                    onChange={e => setSettings({ ...settings, branding_company_name: e.target.value })}
                    placeholder="Your Company"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.branding_primary_color || '#3B82F6'}
                      onChange={e => setSettings({ ...settings, branding_primary_color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.branding_primary_color || '#3B82F6'}
                      onChange={e => setSettings({ ...settings, branding_primary_color: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={settings.branding_logo_url || ''}
                  onChange={e => setSettings({ ...settings, branding_logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

          {/* Offices */}
          <Card>
            <CardHeader>
              <CardTitle>Applicable Offices</CardTitle>
              <CardDescription>Select which offices this portal applies to. Leave empty for all offices.</CardDescription>
            </CardHeader>
            <CardContent>
              {offices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No offices configured.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {offices.map(office => (
                    <button
                      key={office.id}
                      onClick={() => toggleOffice(office.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        portalOffices.includes(office.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      {office.name}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security</CardTitle>
              <CardDescription>OTP and session security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>OTP Expiry (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.otp_expiry_minutes || 10}
                    onChange={e => setSettings({ ...settings, otp_expiry_minutes: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max OTP Attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.otp_max_attempts || 5}
                    onChange={e => setSettings({ ...settings, otp_max_attempts: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lockout Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.otp_lockout_minutes || 15}
                    onChange={e => setSettings({ ...settings, otp_lockout_minutes: parseInt(e.target.value) || 15 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Responder</CardTitle>
              <CardDescription>Configure AI-assisted responses for client messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto AI Reply</p>
                  <p className="text-xs text-muted-foreground">
                    When enabled, AI will automatically respond to client messages if confidence is above threshold
                  </p>
                </div>
                <Switch
                  checked={settings.ai_auto_reply_enabled || false}
                  onCheckedChange={v => setSettings({ ...settings, ai_auto_reply_enabled: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Confidence Threshold: {Math.round((settings.ai_confidence_threshold || 0.8) * 100)}%</Label>
                <Slider
                  value={[settings.ai_confidence_threshold || 0.8]}
                  onValueChange={([v]) => setSettings({ ...settings, ai_confidence_threshold: v })}
                  min={0.5}
                  max={1}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground">
                  AI will only auto-reply when confidence is above this threshold. Lower values mean more auto-replies but potentially less accurate.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Portal Clients</h3>
              <p className="text-sm text-muted-foreground">Manage client accounts and their cases</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={createCaseOpen} onOpenChange={setCreateCaseOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Create Case
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Case</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Select value={caseClientId} onValueChange={setCaseClientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.filter(c => c.status === 'active' || c.status === 'invited').map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.full_name || c.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={caseTitle} onChange={e => setCaseTitle(e.target.value)} placeholder="Case title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={caseDescription} onChange={e => setCaseDescription(e.target.value)} placeholder="Optional description" />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={casePriority} onValueChange={setCasePriority}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateCase} disabled={creatingCase || !caseClientId || !caseTitle.trim()}>
                      {creatingCase ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Case
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Invite Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Client to Portal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="client@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Doe" />
                    </div>
                    {offices.length > 0 && (
                      <div className="space-y-2">
                        <Label>Office</Label>
                        <Select value={inviteOffice} onValueChange={setInviteOffice}>
                          <SelectTrigger><SelectValue placeholder="Select office (optional)" /></SelectTrigger>
                          <SelectContent>
                            {offices.map(o => (
                              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleInviteClient} disabled={inviting || !inviteEmail.trim()}>
                      {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                      Send Invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {clientsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">No clients yet. Invite your first client to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {clients.map(client => (
                    <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {(client.full_name || client.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{client.full_name || 'No name'}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusColors[client.status] || ''} variant="secondary">
                          {client.status}
                        </Badge>
                        {client.last_login_at && (
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            Last login: {new Date(client.last_login_at).toLocaleDateString()}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setCaseClientId(client.id); setCreateCaseOpen(true); }}>
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Create Case
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleClientAction(client.id, 'revoke-sessions')}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Revoke Sessions
                            </DropdownMenuItem>
                            {client.status === 'suspended' ? (
                              <DropdownMenuItem onClick={() => handleClientAction(client.id, 'activate')}>
                                <Eye className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleClientAction(client.id, 'suspend')}
                                className="text-destructive"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsClientPortal;
