import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileAISummaryProps {
  employeeId: string;
  employee: {
    name: string;
    position: string;
    department: string;
    joinDate: string;
    office?: string;
    superpowers?: string[];
    projects?: string[];
    kudosCount: number;
    recentKudos?: string[];
    directReportsCount: number;
    managerName?: string;
    organizationId?: string;
  };
  compact?: boolean;
}

export const ProfileAISummary = ({ employeeId, employee, compact = false }: ProfileAISummaryProps) => {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const { toast } = useToast();

  const generateSummary = async (forceRegenerate = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-profile-summary", {
        body: { employee, employeeId, forceRegenerate },
      });

      if (error) throw error;
      
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setSummary(data.summary);
      setIsCached(data.cached);
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Failed to generate summary",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSummary(false);
  }, [employeeId]);

  return (
    <div className={`hidden sm:block rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white ${compact ? '' : 'overflow-hidden'}`}>
      <div className={`flex items-center justify-between ${compact ? 'px-3 py-2' : 'px-5 py-4'} border-b border-white/20`}>
        <h2 className={`flex items-center gap-2 ${compact ? 'text-sm' : 'text-base'} font-semibold`}>
          <Sparkles className={compact ? "h-4 w-4" : "h-5 w-5"} />
          AI Summary
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generateSummary(true)}
          disabled={loading}
          className={`text-white hover:bg-white/20 hover:text-white ${compact ? 'h-6 w-6 p-0' : 'h-8 px-2'}`}
          title="Regenerate summary"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className={compact ? "px-3 py-2" : "p-4"}>
        {loading ? (
          <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-white/80`}>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Generating...
          </div>
        ) : summary ? (
          <p className={`${compact ? 'text-xs' : 'text-sm'} leading-relaxed text-white/95`}>{summary}</p>
        ) : (
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-white/70 italic`}>Click to generate summary.</p>
        )}
      </div>
    </div>
  );
};
