import { useState, useMemo } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgPhoneNumbers, useTelephonyUsage } from '@/hooks/useTelephony';
import { CallsSubNav } from '@/components/calls/CallsSubNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, MessageSquare, PhoneIncoming, PhoneOutgoing, Clock, DollarSign, Activity } from 'lucide-react';
import { format } from 'date-fns';

const TelephonyUsagePage = () => {
  const { currentOrg } = useOrganization();
  const { data: phoneNumbers = [] } = useOrgPhoneNumbers();
  const [selectedNumber, setSelectedNumber] = useState<string>('all');
  const { data: usageLogs = [], isLoading } = useTelephonyUsage(
    selectedNumber === 'all' ? undefined : selectedNumber
  );

  const stats = useMemo(() => {
    const smsIn = usageLogs.filter((l: any) => l.event_type === 'sms_inbound');
    const smsOut = usageLogs.filter((l: any) => l.event_type === 'sms_outbound');
    const callIn = usageLogs.filter((l: any) => l.event_type === 'call_inbound');
    const callOut = usageLogs.filter((l: any) => l.event_type === 'call_outbound');
    const totalSegments = usageLogs.reduce((sum: number, l: any) => sum + (l.segments || 0), 0);
    const totalMinutes = usageLogs.reduce((sum: number, l: any) => sum + (l.duration_seconds || 0), 0) / 60;
    const totalCost = usageLogs.reduce((sum: number, l: any) => sum + (l.cost || 0), 0);

    return {
      smsInbound: smsIn.length,
      smsOutbound: smsOut.length,
      callInbound: callIn.length,
      callOutbound: callOut.length,
      totalSegments,
      totalMinutes: Math.round(totalMinutes * 10) / 10,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  }, [usageLogs]);

  const eventTypeLabel: Record<string, { label: string; icon: typeof Phone; color: string }> = {
    sms_inbound: { label: 'SMS In', icon: MessageSquare, color: 'text-green-600' },
    sms_outbound: { label: 'SMS Out', icon: MessageSquare, color: 'text-blue-600' },
    call_inbound: { label: 'Call In', icon: PhoneIncoming, color: 'text-green-600' },
    call_outbound: { label: 'Call Out', icon: PhoneOutgoing, color: 'text-blue-600' },
  };

  return (
    <div>
      <CallsSubNav />
      <div className="container px-4 md:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Telephony Usage</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor SMS & Voice usage across your phone numbers
            </p>
          </div>
          <Select value={selectedNumber} onValueChange={setSelectedNumber}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All numbers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Numbers</SelectItem>
              {phoneNumbers.map((pn) => (
                <SelectItem key={pn.id} value={pn.id}>
                  {pn.friendly_name || pn.phone_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" /> SMS Messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div>
                  <p className="text-2xl font-bold">{stats.smsInbound + stats.smsOutbound}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.smsInbound} in · {stats.smsOutbound} out · {stats.totalSegments} segments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Phone className="h-3.5 w-3.5" /> Voice Calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div>
                  <p className="text-2xl font-bold">{stats.callInbound + stats.callOutbound}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.callInbound} in · {stats.callOutbound} out
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" /> Call Minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{stats.totalMinutes} min</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <DollarSign className="h-3.5 w-3.5" /> Estimated Cost
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage log table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : usageLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No usage activity yet. Send an SMS or make a call to see data here.
              </p>
            ) : (
              <div className="rounded-md border divide-y">
                {usageLogs.map((log: any) => {
                  const meta = eventTypeLabel[log.event_type] || { label: log.event_type, icon: Activity, color: 'text-muted-foreground' };
                  const IconComp = meta.icon;
                  const logMeta = (log.metadata || {}) as Record<string, any>;
                  return (
                    <div key={log.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <IconComp className={`h-4 w-4 ${meta.color}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{meta.label}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {log.direction}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {log.from_number} → {log.to_number}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {log.segments > 0 && <span>{log.segments} seg</span>}
                          {log.duration_seconds > 0 && <span>{Math.round(log.duration_seconds / 60 * 10) / 10} min</span>}
                          {log.cost > 0 && <span>${log.cost.toFixed(3)}</span>}
                          {logMeta.recording_url && (
                            <a
                              href={logMeta.recording_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              🎙️ Recording
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TelephonyUsagePage;
