import { InboxSubNav } from '@/components/inbox/InboxSubNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Headphones, Mic, PhoneCall, Users, Eye, MessageSquare } from 'lucide-react';

const MONITOR_MODES = [
  {
    mode: 'listen',
    label: 'Listen',
    icon: Headphones,
    description: 'Silently monitor a live call without the agent or caller knowing.',
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  {
    mode: 'whisper',
    label: 'Whisper',
    icon: MessageSquare,
    description: 'Speak to the agent only — the caller cannot hear you.',
    color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  },
  {
    mode: 'barge',
    label: 'Barge',
    icon: PhoneCall,
    description: 'Join the call as a third participant — both agent and caller can hear you.',
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
];

const CallMonitoringPage = () => {
  return (
    <div>
      <InboxSubNav />
      <div className="container px-4 md:px-8 py-6 space-y-6">
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
            </CardTitle>
            <CardDescription>Currently active calls across your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <PhoneCall className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No active calls</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                When agents are on calls, they will appear here. You can then join any call in listen, whisper, or barge mode.
              </p>
              <p className="text-xs text-muted-foreground mt-4 max-w-md">
                Call monitoring requires a Twilio Conference-based setup. Active calls will be displayed here in real-time once configured.
              </p>
            </div>
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
      </div>
    </div>
  );
};

export default CallMonitoringPage;
