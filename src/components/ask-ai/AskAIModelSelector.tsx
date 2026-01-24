import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Zap, Brain, Rocket } from "lucide-react";

interface AskAIModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  allowedModels?: string[];
  disabled?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  description: string;
  tier: "fast" | "balanced" | "powerful";
  icon: typeof Zap;
}

const ALL_MODELS: ModelOption[] = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini Flash",
    description: "Fast & efficient",
    tier: "fast",
    icon: Zap,
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini Flash Lite",
    description: "Fastest, basic tasks",
    tier: "fast",
    icon: Zap,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini Pro",
    description: "Advanced reasoning",
    tier: "powerful",
    icon: Brain,
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    description: "Next-gen fast",
    tier: "balanced",
    icon: Rocket,
  },
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    description: "Next-gen powerful",
    tier: "powerful",
    icon: Brain,
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    description: "Most capable",
    tier: "powerful",
    icon: Sparkles,
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    description: "Balanced performance",
    tier: "balanced",
    icon: Sparkles,
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    description: "Efficient & fast",
    tier: "fast",
    icon: Zap,
  },
];

const TIER_COLORS = {
  fast: "text-green-500",
  balanced: "text-blue-500",
  powerful: "text-purple-500",
};

export const AskAIModelSelector = ({
  value,
  onChange,
  allowedModels,
  disabled,
}: AskAIModelSelectorProps) => {
  const availableModels = allowedModels
    ? ALL_MODELS.filter((m) => allowedModels.includes(m.id))
    : ALL_MODELS;

  const selectedModel = ALL_MODELS.find((m) => m.id === value) || ALL_MODELS[0];
  const SelectedIcon = selectedModel.icon;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[180px] h-8 text-xs">
        <div className="flex items-center gap-1.5">
          <SelectedIcon className={`h-3.5 w-3.5 ${TIER_COLORS[selectedModel.tier]}`} />
          <SelectValue>{selectedModel.name}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((model) => {
          const Icon = model.icon;
          return (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${TIER_COLORS[model.tier]}`} />
                <div>
                  <span className="font-medium">{model.name}</span>
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    {model.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
