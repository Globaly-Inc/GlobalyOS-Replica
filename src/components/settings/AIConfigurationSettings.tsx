import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Zap, Brain, Shield, Loader2, Save } from "lucide-react";

interface AIConfigurationSettingsProps {
  organizationId: string;
}

interface AIModelConfig {
  id: string;
  name: string;
  description: string;
  tier: "fast" | "balanced" | "powerful";
  costPer1k: string;
}

const AVAILABLE_MODELS: AIModelConfig[] = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fastest responses, great for simple queries",
    tier: "fast",
    costPer1k: "$0.10",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Best reasoning and complex analysis",
    tier: "powerful",
    costPer1k: "$1.00",
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    description: "Next-gen speed with improved quality",
    tier: "balanced",
    costPer1k: "$0.20",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    description: "OpenAI's efficient model",
    tier: "balanced",
    costPer1k: "$0.50",
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    description: "OpenAI's most capable model",
    tier: "powerful",
    costPer1k: "$3.00",
  },
];

const TIER_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  fast: { label: "⚡ Fast", variant: "secondary" },
  balanced: { label: "⚖️ Balanced", variant: "outline" },
  powerful: { label: "🧠 Powerful", variant: "default" },
};

export function AIConfigurationSettings({ organizationId }: AIConfigurationSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enabledModels, setEnabledModels] = useState<string[]>(["google/gemini-2.5-flash"]);
  const [defaultModel, setDefaultModel] = useState("google/gemini-2.5-flash");
  const [maxTokensPerQuery, setMaxTokensPerQuery] = useState(4000);
  const [maxTokensPerDayPerUser, setMaxTokensPerDayPerUser] = useState<number | null>(null);
  const [monthlyTokenBudget, setMonthlyTokenBudget] = useState<number | null>(null);
  const [costAlertsEnabled, setCostAlertsEnabled] = useState(true);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [generalQueriesEnabled, setGeneralQueriesEnabled] = useState(true);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-knowledge-settings", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_knowledge_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Update local state when settings load
  useEffect(() => {
    if (settings) {
      setEnabledModels(settings.allowed_models || ["google/gemini-2.5-flash"]);
      setDefaultModel(settings.default_model || "google/gemini-2.5-flash");
      setMaxTokensPerQuery(settings.max_tokens_per_query || 4000);
      setMaxTokensPerDayPerUser(settings.max_tokens_per_day_per_user);
      setMonthlyTokenBudget(settings.monthly_token_budget);
      setCostAlertsEnabled(settings.cost_alerts_enabled ?? true);
      setStreamingEnabled(settings.streaming_enabled ?? true);
      setGeneralQueriesEnabled(settings.general_queries_enabled ?? true);
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ai_knowledge_settings")
        .upsert({
          organization_id: organizationId,
          allowed_models: enabledModels,
          default_model: defaultModel,
          max_tokens_per_query: maxTokensPerQuery,
          max_tokens_per_day_per_user: maxTokensPerDayPerUser,
          monthly_token_budget: monthlyTokenBudget,
          cost_alerts_enabled: costAlertsEnabled,
          streaming_enabled: streamingEnabled,
          general_queries_enabled: generalQueriesEnabled,
        }, { onConflict: "organization_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-settings"] });
      toast({ title: "Settings saved", description: "AI configuration has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    },
  });

  const toggleModel = (modelId: string) => {
    setEnabledModels(prev => {
      if (prev.includes(modelId)) {
        const newModels = prev.filter(m => m !== modelId);
        if (defaultModel === modelId && newModels.length > 0) {
          setDefaultModel(newModels[0]);
        }
        return newModels;
      }
      return [...prev, modelId];
    });
  };

  if (isLoading) {
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
          AI Model Configuration
        </CardTitle>
        <CardDescription>
          Control which AI models are available and set usage limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available Models */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Available Models</Label>
          <p className="text-sm text-muted-foreground">
            Select which AI models team members can use
          </p>
          <div className="space-y-3">
            {AVAILABLE_MODELS.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={enabledModels.includes(model.id)}
                    onCheckedChange={() => toggleModel(model.id)}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <Badge variant={TIER_BADGES[model.tier].variant}>
                        {TIER_BADGES[model.tier].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{model.costPer1k}/1M tokens</div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Default Model */}
        <div className="space-y-2">
          <Label>Default Model</Label>
          <Select value={defaultModel} onValueChange={setDefaultModel}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enabledModels.map((modelId) => {
                const model = AVAILABLE_MODELS.find(m => m.id === modelId);
                return (
                  <SelectItem key={modelId} value={modelId}>
                    {model?.name || modelId}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Token Limits */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Token Limits
          </Label>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxPerQuery">Max tokens per query</Label>
              <Input
                id="maxPerQuery"
                type="number"
                value={maxTokensPerQuery}
                onChange={(e) => setMaxTokensPerQuery(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPerUser">Max tokens per user/day</Label>
              <Input
                id="maxPerUser"
                type="number"
                value={maxTokensPerDayPerUser || ""}
                onChange={(e) => setMaxTokensPerDayPerUser(e.target.value ? Number(e.target.value) : null)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyBudget">Monthly token budget</Label>
            <Input
              id="monthlyBudget"
              type="number"
              value={monthlyTokenBudget || ""}
              onChange={(e) => setMonthlyTokenBudget(e.target.value ? Number(e.target.value) : null)}
              placeholder="Unlimited"
              className="md:w-[300px]"
            />
          </div>
        </div>

        <Separator />

        {/* Feature Toggles */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Features</Label>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="streaming">Streaming responses</Label>
              <p className="text-sm text-muted-foreground">Show AI responses in real-time</p>
            </div>
            <Switch id="streaming" checked={streamingEnabled} onCheckedChange={setStreamingEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="general">General AI queries</Label>
              <p className="text-sm text-muted-foreground">Allow non-organization related questions</p>
            </div>
            <Switch id="general" checked={generalQueriesEnabled} onCheckedChange={setGeneralQueriesEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="alerts">Usage alerts</Label>
              <p className="text-sm text-muted-foreground">Email notifications at 80% and 100% usage</p>
            </div>
            <Switch id="alerts" checked={costAlertsEnabled} onCheckedChange={setCostAlertsEnabled} />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
