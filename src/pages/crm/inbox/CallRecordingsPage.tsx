import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgPhoneNumbers } from '@/hooks/useTelephony';
import { useCallRecordings, useCallRecordingSettings, useGenerateCallSummary } from '@/hooks/useCallRecordings';
import { InboxSubNav } from '@/components/inbox/InboxSubNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Mic, Play, FileText, Sparkles, Settings, Phone, Clock, ChevronDown,
  Loader2, ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

const CallRecordingsPage = () => {
  const { currentOrg } = useOrganization();
  const { data: phoneNumbers = [] } = useOrgPhoneNumbers();
  const [selectedNumber, setSelectedNumber] = useState<string>('all');
  const { data: recordings = [], isLoading } = useCallRecordings(
    selectedNumber === 'all' ? undefined : selectedNumber
  );
  const { settings, isLoading: loadingSettings, updateSettings } = useCallRecordingSettings();
  const generateSummary = useGenerateCallSummary();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = {
    total: recordings.length,
    withTranscription: recordings.filter((r) => r.transcription_text).length,
    withSummary: recordings.filter((r) => r.ai_summary).length,
    totalDuration: recordings.reduce((s, r) => s + (r.duration_seconds || 0), 0),
  };

  return (
    <div>
      <InboxSubNav />
      <div className="container px-4 md:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Call Recordings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage recordings, transcriptions, and AI summaries
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

        <Tabs defaultValue="recordings">
          <TabsList>
            <TabsTrigger value="recordings" className="gap-1.5">
              <Mic className="h-3.5 w-3.5" /> Recordings
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recordings" className="space-y-4 mt-4">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2"><CardDescription className="text-xs flex items-center gap-1"><Mic className="h-3.5 w-3.5" /> Total Recordings</CardDescription></CardHeader>
                <CardContent>{isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{stats.total}</p>}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription className="text-xs flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Transcribed</CardDescription></CardHeader>
                <CardContent>{isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{stats.withTranscription}</p>}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription className="text-xs flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI Summaries</CardDescription></CardHeader>
                <CardContent>{isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{stats.withSummary}</p>}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardDescription className="text-xs flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Total Duration</CardDescription></CardHeader>
                <CardContent>{isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{Math.round(stats.totalDuration / 60)} min</p>}</CardContent>
              </Card>
            </div>

            {/* Recording list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Recordings</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : recordings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No recordings yet. Enable auto-recording in settings to start capturing calls.</p>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <div className="rounded-md border divide-y">
                      {recordings.map((rec) => (
                        <Collapsible
                          key={rec.id}
                          open={expandedId === rec.id}
                          onOpenChange={(o) => setExpandedId(o ? rec.id : null)}
                        >
                          <div className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${rec.direction === 'inbound' ? 'bg-green-100 dark:bg-green-950' : 'bg-blue-100 dark:bg-blue-950'}`}>
                                  <Phone className={`h-3.5 w-3.5 ${rec.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{rec.from_number || 'Unknown'} → {rec.to_number || 'Unknown'}</span>
                                    <Badge variant="outline" className="text-[10px]">{rec.direction}</Badge>
                                    {rec.transcription_text && <Badge variant="secondary" className="text-[10px] gap-0.5"><FileText className="h-2.5 w-2.5" /> Transcribed</Badge>}
                                    {rec.ai_summary && <Badge className="text-[10px] gap-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"><Sparkles className="h-2.5 w-2.5" /> Summary</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(rec.created_at), 'MMM d, yyyy HH:mm')} · {Math.round(rec.duration_seconds / 60 * 10) / 10} min
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {rec.recording_url && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                    <a href={rec.recording_url} target="_blank" rel="noopener noreferrer"><Play className="h-3.5 w-3.5" /></a>
                                  </Button>
                                )}
                                {!rec.ai_summary && rec.transcription_text && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs gap-1 h-7"
                                    onClick={() => generateSummary.mutate(rec.id)}
                                    disabled={generateSummary.isPending}
                                  >
                                    {generateSummary.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    Summarize
                                  </Button>
                                )}
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedId === rec.id ? 'rotate-180' : ''}`} />
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </div>
                          </div>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-3 border-t pt-3 bg-muted/20">
                              {rec.ai_summary && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3 text-purple-500" /> AI Summary</h4>
                                  <p className="text-sm text-muted-foreground">{rec.ai_summary}</p>
                                  {rec.ai_topics && rec.ai_topics.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {rec.ai_topics.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {rec.transcription_text && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Transcription</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{rec.transcription_text}</p>
                                </div>
                              )}
                              {!rec.transcription_text && !rec.ai_summary && (
                                <p className="text-xs text-muted-foreground italic">No transcription or summary available for this recording.</p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recording Rules</CardTitle>
                <CardDescription>Configure automatic call recording behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingSettings ? (
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Record all calls</Label>
                      <Switch
                        checked={settings?.auto_record_all ?? false}
                        onCheckedChange={(v) => updateSettings.mutate({ auto_record_all: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Record inbound calls only</Label>
                      <Switch
                        checked={settings?.auto_record_inbound ?? false}
                        onCheckedChange={(v) => updateSettings.mutate({ auto_record_inbound: v })}
                        disabled={settings?.auto_record_all}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Record outbound calls only</Label>
                      <Switch
                        checked={settings?.auto_record_outbound ?? false}
                        onCheckedChange={(v) => updateSettings.mutate({ auto_record_outbound: v })}
                        disabled={settings?.auto_record_all}
                      />
                    </div>
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Auto-transcribe recordings</Label>
                          <p className="text-xs text-muted-foreground">Automatically generate text transcriptions for new recordings</p>
                        </div>
                        <Switch
                          checked={settings?.auto_transcribe ?? false}
                          onCheckedChange={(v) => updateSettings.mutate({ auto_transcribe: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Auto-generate AI summaries</Label>
                          <p className="text-xs text-muted-foreground">Use AI to generate summaries with key topics after transcription</p>
                        </div>
                        <Switch
                          checked={settings?.auto_summarize ?? false}
                          onCheckedChange={(v) => updateSettings.mutate({ auto_summarize: v })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CallRecordingsPage;
