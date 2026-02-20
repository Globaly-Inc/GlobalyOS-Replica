import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useActiveCalls, useMonitorCall } from '@/hooks/useCallMonitoring';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Headphones, Mic, PhoneCall, Users, Eye, MessageSquare, Loader2, Phone,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const MONITOR_MODES = [
  {
    mode: 'listen' as const,
    label: 'Listen',
    icon: Headphones,
    description: 'Silently monitor a live call without the agent or caller knowing.',
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  {
    mode: 'whisper' as const,
    label: 'Whisper',
    icon: MessageSquare,
    description: 'Speak to the agent only — the caller cannot hear you.',
    color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  },
  {
    mode: 'barge' as const,
    label: 'Barge',
    icon: PhoneCall,
    description: 'Join the call as a third participant — both agent and caller can hear you.',
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
];

const CallMonitoringPage = () => {
  const { currentOrg } = useOrganization();
  const { data: activeCalls = [], isLoading } = useActiveCalls();
  const monitorCall = useMonitorCall();
  const [showMonitorDialog, setShowMonitorDialog] = useState(false);
  const [selectedCallSid, setSelectedCallSid] = useState('');
  const [selectedMode, setSelectedMode] = useState<'listen' | 'whisper' | 'barge'>('listen');
  const [supervisorNumber, setSupervisorNumber] = useState('');

  const handleMonitor = () => {
    if (!selectedCallSid || !currentOrg) return;
    monitorCall.mutate(
      {
        organization_id: currentOrg.id,
        call_sid: selectedCallSid,
        mode: selectedMode,
        supervisor_number: supervisorNumber || undefined,
      },
      {
        onSuccess: () => setShowMonitorDialog(false),
      }
    );
  };

  return (
    <div className="py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Call Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor live calls with listen, whisper, and barge modes
          </p>
        </div>

        {/* Monitoring modes explanation */}
        <div className="grid gap-4 md:grid-cols-3">
          {MONITOR_MODES.map((m) => {
            const ModeIcon = m.icon;
            return (
              <Card key={m.mode}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${m.color}`}>
                      <ModeIcon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm">{m.label} Mode</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Live calls dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" /> Live Calls
              {activeCalls.length > 0 && (
                <Badge variant="default" className="text-[10px]">{activeCalls.length} active</Badge>
              )}
            </CardTitle>
            <CardDescription>Currently active calls across your organization (auto-refreshes every 5s)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : activeCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <PhoneCall className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-1">No active calls</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  When agents are on calls, they will appear here. You can then join any call in listen, whisper, or barge mode.
                </p>
              </div>
            ) : (
              <div className="rounded-md border divide-y bg-card">
                {activeCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        call.direction === 'inbound'
                          ? 'bg-green-100 dark:bg-green-950'
                          : 'bg-blue-100 dark:bg-blue-950'
                      }`}>
                        <Phone className={`h-3.5 w-3.5 ${
                          call.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {call.from_number || 'Unknown'} → {call.to_number || 'Unknown'}
                          </span>
                          <Badge variant="outline" className="text-[10px]">{call.direction}</Badge>
                          <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 animate-pulse">
                            Live
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Started {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {MONITOR_MODES.map((m) => {
                        const ModeIcon = m.icon;
                        return (
                          <Button
                            key={m.mode}
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 h-7"
                            onClick={() => {
                              setSelectedCallSid(call.twilio_sid);
                              setSelectedMode(m.mode);
                              setShowMonitorDialog(true);
                            }}
                          >
                            <ModeIcon className="h-3 w-3" />
                            {m.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supervisor tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Supervisor Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 rounded-lg border bg-muted/30">
                <h4 className="text-sm font-medium mb-1">Quality Assurance</h4>
                <p className="text-xs text-muted-foreground">Use Listen mode to evaluate agent performance without interrupting the call.</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <h4 className="text-sm font-medium mb-1">Real-time Coaching</h4>
                <p className="text-xs text-muted-foreground">Use Whisper mode to guide agents during difficult calls — the customer won't hear you.</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <h4 className="text-sm font-medium mb-1">Escalation Handling</h4>
                <p className="text-xs text-muted-foreground">Use Barge mode to directly intervene when a customer escalation requires supervisor attention.</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <h4 className="text-sm font-medium mb-1">Training</h4>
                <p className="text-xs text-muted-foreground">New agents can benefit from supervisors listening in and providing whisper guidance during their first calls.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitor dialog */}
        <Dialog open={showMonitorDialog} onOpenChange={setShowMonitorDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Call — {MONITOR_MODES.find((m) => m.mode === selectedMode)?.label} Mode</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Monitoring Mode</Label>
                <Select value={selectedMode} onValueChange={(v) => setSelectedMode(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONITOR_MODES.map((m) => (
                      <SelectItem key={m.mode} value={m.mode}>{m.label} — {m.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Your Phone Number (to receive the call)</Label>
                <Input
                  value={supervisorNumber}
                  onChange={(e) => setSupervisorNumber(e.target.value)}
                  placeholder="+15551234567"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  You'll receive a call on this number to join the live call.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMonitorDialog(false)}>Cancel</Button>
              <Button
                onClick={handleMonitor}
                disabled={!supervisorNumber.trim() || monitorCall.isPending}
              >
                {monitorCall.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Join Call
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default CallMonitoringPage;
