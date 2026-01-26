import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  Users, 
  Megaphone, 
  Target, 
  Calendar, 
  Palmtree, 
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Database,
  CheckCircle2,
  Timer
} from "lucide-react";

interface AIKnowledgeSettingsProps {
  organizationId?: string;
}

interface AISettings {
  id?: string;
  wiki_enabled: boolean;
  chat_enabled: boolean;
  team_directory_enabled: boolean;
  announcements_enabled: boolean;
  kpis_enabled: boolean;
  calendar_enabled: boolean;
  leave_enabled: boolean;
  attendance_enabled: boolean;
  auto_reindex_enabled: boolean;
  auto_reindex_hour: number;
  last_auto_reindex_at: string | null;
}

const defaultSettings: AISettings = {
  wiki_enabled: true,
  chat_enabled: true,
  team_directory_enabled: true,
  announcements_enabled: true,
  kpis_enabled: true,
  calendar_enabled: true,
  leave_enabled: true,
  attendance_enabled: true,
  auto_reindex_enabled: false,
  auto_reindex_hour: 2,
  last_auto_reindex_at: null,
};

// Generate hour options for the schedule dropdown
const hourOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: hour,
    label: `${displayHour}:00 ${period}`,
  };
});

// Map settings keys to database content_type values in ai_content_index
const sourceTypeMapping: Record<string, string[]> = {
  wiki_enabled: ['wiki'],
  chat_enabled: ['chat'],
  team_directory_enabled: ['employee'],
  announcements_enabled: ['announcement', 'win'],
  kpis_enabled: ['kpi'],
  calendar_enabled: ['calendar'],
  leave_enabled: ['leave'],
  attendance_enabled: ['attendance'],
};

interface IndexStats {
  [sourceType: string]: {
    count: number;
    lastUpdated: string | null;
  };
}

interface ReindexProgress {
  currentSource: string | null;
  sourcesCompleted: string[];
  totalSources: number;
  recordsIndexed: number;
}

const knowledgeSources = [
  {
    key: "wiki_enabled" as keyof AISettings,
    label: "Wiki Content",
    description: "Documentation and knowledge base articles",
    accessNote: "Based on wiki permissions",
    icon: BookOpen,
  },
  {
    key: "chat_enabled" as keyof AISettings,
    label: "Chat History",
    description: "Messages from conversations and spaces",
    accessNote: "User's own conversations only",
    icon: MessageSquare,
  },
  {
    key: "team_directory_enabled" as keyof AISettings,
    label: "Team Directory",
    description: "Employee names, positions, departments",
    accessNote: "Public info visible to all",
    icon: Users,
  },
  {
    key: "announcements_enabled" as keyof AISettings,
    label: "Announcements & Wins",
    description: "Company announcements and team wins",
    accessNote: "Visible to all members",
    icon: Megaphone,
  },
  {
    key: "kpis_enabled" as keyof AISettings,
    label: "KPIs & Performance",
    description: "Key performance indicators and goals",
    accessNote: "Own KPIs + direct reports (managers)",
    icon: Target,
  },
  {
    key: "calendar_enabled" as keyof AISettings,
    label: "Calendar & Holidays",
    description: "Company events, holidays, and schedules",
    accessNote: "Visible to all members",
    icon: Calendar,
  },
  {
    key: "leave_enabled" as keyof AISettings,
    label: "Leave Information",
    description: "Leave requests and time-off data",
    accessNote: "Own leaves + direct reports (managers)",
    icon: Palmtree,
  },
  {
    key: "attendance_enabled" as keyof AISettings,
    label: "Attendance Data",
    description: "Check-in/out times and attendance patterns",
    accessNote: "Own data + direct reports (managers)",
    icon: Clock,
  },
];

// Friendly names for source types
const sourceTypeLabels: Record<string, string> = {
  wiki_page: "Wiki Content",
  chat_message: "Chat History",
  team_member: "Team Directory",
  announcement: "Announcements",
  kpi: "KPIs",
  calendar_event: "Calendar",
  leave_record: "Leave Info",
  attendance: "Attendance",
};

// Helper to calculate next scheduled time
const getNextScheduledTime = (hour: number): string => {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  const isToday = next.toDateString() === now.toDateString();
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${isToday ? "Today" : "Tomorrow"} at ${displayHour}:00 ${period}`;
};

export const AIKnowledgeSettings = ({ organizationId }: AIKnowledgeSettingsProps) => {
  const { toast } = useToast();
  const { getShortRelativeTime } = useRelativeTime();
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [indexStats, setIndexStats] = useState<IndexStats>({});
  const [reindexProgress, setReindexProgress] = useState<ReindexProgress | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadSettings();
      loadIndexStats();
    }
  }, [organizationId]);

  // Polling for reindex progress
  useEffect(() => {
    if (reindexing && organizationId) {
      pollingRef.current = setInterval(pollReindexProgress, 1500);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [reindexing, organizationId]);

  const pollReindexProgress = async () => {
    if (!organizationId) return;
    
    try {
      const { data } = await supabase
        .from("ai_indexing_status")
        .select("status, current_source, sources_completed, total_sources, records_indexed")
        .eq("organization_id", organizationId)
        .maybeSingle();
      
      if (data) {
        setReindexProgress({
          currentSource: data.current_source,
          sourcesCompleted: data.sources_completed || [],
          totalSources: data.total_sources || 8,
          recordsIndexed: data.records_indexed || 0,
        });
        
        if (data.status === "completed" || data.status === "failed") {
          setReindexing(false);
          setReindexProgress(null);
          loadIndexStats();
          
          if (data.status === "completed") {
            toast({
              title: "Re-indexing complete",
              description: `Successfully indexed ${data.records_indexed || 0} records.`,
            });
          } else {
            toast({
              title: "Re-indexing failed",
              description: "Some content may not have been indexed. Please try again.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error: any) {
      console.error("Error polling reindex progress:", error);
    }
  };

  const loadIndexStats = async () => {
    if (!organizationId) return;
    
    try {
      const { data, error } = await supabase
        .from("ai_content_index")
        .select("content_type, last_updated")
        .eq("organization_id", organizationId);
      
      if (error) throw error;
      
      // Aggregate counts and find max last_updated per content_type
      const stats: IndexStats = {};
      data?.forEach((row) => {
        if (!stats[row.content_type]) {
          stats[row.content_type] = { count: 0, lastUpdated: null };
        }
        stats[row.content_type].count++;
        if (!stats[row.content_type].lastUpdated || 
            row.last_updated > stats[row.content_type].lastUpdated) {
          stats[row.content_type].lastUpdated = row.last_updated;
        }
      });
      
      setIndexStats(stats);
    } catch (error: any) {
      console.error("Error loading index stats:", error);
    }
  };

  const loadSettings = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_knowledge_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          wiki_enabled: data.wiki_enabled,
          chat_enabled: data.chat_enabled,
          team_directory_enabled: data.team_directory_enabled,
          announcements_enabled: data.announcements_enabled,
          kpis_enabled: data.kpis_enabled,
          calendar_enabled: data.calendar_enabled,
          leave_enabled: data.leave_enabled,
          attendance_enabled: data.attendance_enabled,
          auto_reindex_enabled: data.auto_reindex_enabled ?? false,
          auto_reindex_hour: data.auto_reindex_hour ?? 2,
          last_auto_reindex_at: data.last_auto_reindex_at,
        });
      }
    } catch (error: any) {
      console.error("Error loading AI settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof AISettings) => {
    if (key === "id") return;
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!organizationId) return;

    setSaving(true);
    try {
      const { id, ...settingsToSave } = settings;
      
      const { error } = await supabase
        .from("ai_knowledge_settings")
        .upsert({
          organization_id: organizationId,
          ...settingsToSave,
        }, { onConflict: "organization_id" });

      if (error) throw error;

      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "AI knowledge base settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReindex = async () => {
    if (!organizationId) return;

    setReindexing(true);
    setReindexProgress({
      currentSource: null,
      sourcesCompleted: [],
      totalSources: 8,
      recordsIndexed: 0,
    });
    
    try {
      const { error } = await supabase.functions.invoke("index-ai-content", {
        body: { organization_id: organizationId },
      });

      if (error) throw error;
      // Success handling is done in pollReindexProgress when status becomes "completed"
    } catch (error: any) {
      setReindexing(false);
      setReindexProgress(null);
      toast({
        title: "Error re-indexing",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCardStatus = (sourceType: string): 'waiting' | 'indexing' | 'complete' | null => {
    if (!reindexing || !reindexProgress) return null;
    
    if (reindexProgress.sourcesCompleted.includes(sourceType)) {
      return 'complete';
    }
    if (reindexProgress.currentSource === sourceType) {
      return 'indexing';
    }
    return 'waiting';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = reindexProgress 
    ? (reindexProgress.sourcesCompleted.length / reindexProgress.totalSources) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Knowledge Base Settings
        </CardTitle>
        <CardDescription>
          Configure which data sources the AI assistant can access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {knowledgeSources.map((source) => {
            const Icon = source.icon;
            const isEnabled = settings[source.key] as boolean;
            const sourceTypes = sourceTypeMapping[source.key];
            // Aggregate stats for all content types in this source
            const aggregatedStats = sourceTypes.reduce(
              (acc, type) => {
                const stat = indexStats[type];
                if (stat) {
                  acc.count += stat.count;
                  if (!acc.lastUpdated || (stat.lastUpdated && stat.lastUpdated > acc.lastUpdated)) {
                    acc.lastUpdated = stat.lastUpdated;
                  }
                }
                return acc;
              },
              { count: 0, lastUpdated: null as string | null }
            );
            // For card status, check first type in array
            const cardStatus = getCardStatus(sourceTypes[0]);
            
            return (
              <div
                key={source.key}
                className="flex items-start justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={source.key} className="text-sm font-medium cursor-pointer">
                      {source.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {source.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-normal">
                        Access: {source.accessNote}
                      </Badge>
                    </div>
                    {/* Index stats */}
                    <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {aggregatedStats.count} records
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {aggregatedStats.lastUpdated 
                          ? getShortRelativeTime(aggregatedStats.lastUpdated) 
                          : "Not yet indexed"}
                      </span>
                    </div>
                    {/* Reindex status per card */}
                    {cardStatus && (
                      <div className="pt-1">
                        {cardStatus === 'indexing' && (
                          <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Indexing...
                          </span>
                        )}
                        {cardStatus === 'complete' && (
                          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </span>
                        )}
                        {cardStatus === 'waiting' && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Waiting...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  id={source.key}
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(source.key)}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Changes take effect on next AI index. Use "Re-index Now" to update immediately.
          </p>
        </div>

        <Separator />

        {/* Automatic Re-indexing Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Automatic Re-indexing
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically update the AI knowledge base daily
              </p>
            </div>
            <Switch
              checked={settings.auto_reindex_enabled}
              onCheckedChange={(checked) => {
                setSettings(prev => ({ ...prev, auto_reindex_enabled: checked }));
                setHasChanges(true);
              }}
            />
          </div>

          {settings.auto_reindex_enabled && (
            <div className="space-y-3 pl-6 border-l-2 border-muted">
              <div className="flex items-center gap-3">
                <Label className="text-sm">Run at:</Label>
                <Select 
                  value={String(settings.auto_reindex_hour)} 
                  onValueChange={(v) => {
                    setSettings(prev => ({ ...prev, auto_reindex_hour: Number(v) }));
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(opt => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  (organization timezone)
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Last run: {settings.last_auto_reindex_at 
                    ? getShortRelativeTime(settings.last_auto_reindex_at) 
                    : "Never"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Next: {getNextScheduledTime(settings.auto_reindex_hour)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        {reindexing && reindexProgress && (
          <div className="space-y-2 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {reindexProgress.currentSource
                  ? `Indexing ${sourceTypeLabels[reindexProgress.currentSource] || reindexProgress.currentSource}...`
                  : "Starting..."}
              </span>
              <span className="text-muted-foreground">
                {reindexProgress.sourcesCompleted.length}/{reindexProgress.totalSources} sources
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {reindexProgress.recordsIndexed} records indexed
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleReindex}
            disabled={reindexing}
            className="gap-2"
          >
            {reindexing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {reindexing ? "Re-indexing..." : "Re-index Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
