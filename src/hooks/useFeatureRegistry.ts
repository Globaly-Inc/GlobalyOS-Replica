import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type LucideIcon, Home, Users, Calendar, Clock, BarChart3, BookOpen, Star, TrendingUp, Bell, Settings, MessageSquare, CheckSquare, Briefcase, GitBranch, Wallet, Bot, UserPlus, MessageCircle, Phone, Inbox, FileText, Calculator } from "lucide-react";

export interface FeatureEntry {
  id: string;
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: "core" | "flagged";
  subscription_tiers: string[];
  internal_notes: string;
  sort_order: number;
}

// Map feature names to icons (icons can't be stored in DB)
const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  team_directory: Users,
  team_calendar: Calendar,
  leave_management: Clock,
  attendance: Clock,
  kpis_okrs: BarChart3,
  wiki: BookOpen,
  performance_reviews: Star,
  org_chart: Users,
  growth: TrendingUp,
  notifications: Bell,
  settings: Settings,
  chat: MessageSquare,
  tasks: CheckSquare,
  crm: Briefcase,
  workflows: GitBranch,
  payroll: Wallet,
  "ask-ai": Bot,
  hiring: UserPlus,
  whatsapp: MessageCircle,
  calls: Phone,
  omnichannel_inbox: Inbox,
  ai_responder: Bot,
  telephony: Phone,
  forms: FileText,
  accounting: Calculator,
  client_portal: Users,
  quotations: FileText,
};

export function useFeatureRegistry() {
  const [features, setFeatures] = useState<FeatureEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("feature_registry")
        .select("*")
        .order("sort_order");

      if (error) throw error;

      setFeatures(
        (data || []).map((row) => ({
          id: row.id,
          name: row.feature_name,
          label: row.label,
          description: row.description || "",
          icon: ICON_MAP[row.feature_name] || FileText,
          category: row.category as "core" | "flagged",
          subscription_tiers: row.subscription_tiers || [],
          internal_notes: row.internal_notes || "",
          sort_order: row.sort_order || 0,
        }))
      );
    } catch (err) {
      console.error("Error fetching feature registry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const coreFeatures = features.filter((f) => f.category === "core");
  const flaggedFeatures = features.filter((f) => f.category === "flagged");

  return { features, coreFeatures, flaggedFeatures, loading, refetch: fetchFeatures };
}
