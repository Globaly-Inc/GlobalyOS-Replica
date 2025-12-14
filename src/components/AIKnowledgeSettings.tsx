import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertCircle
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
};

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

export const AIKnowledgeSettings = ({ organizationId }: AIKnowledgeSettingsProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadSettings();
    }
  }, [organizationId]);

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
    try {
      const { error } = await supabase.functions.invoke("index-ai-content", {
        body: { organization_id: organizationId },
      });

      if (error) throw error;

      toast({
        title: "Re-indexing started",
        description: "AI knowledge base is being updated. This may take a few minutes.",
      });
    } catch (error: any) {
      toast({
        title: "Error re-indexing",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReindexing(false);
    }
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
            
            return (
              <div
                key={source.key}
                className="flex items-start justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={source.key} className="text-sm font-medium cursor-pointer">
                      {source.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {source.description}
                    </p>
                    <Badge variant="outline" className="text-xs font-normal">
                      Access: {source.accessNote}
                    </Badge>
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
