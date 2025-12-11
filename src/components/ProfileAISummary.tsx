import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileAISummaryProps {
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
  };
}

export const ProfileAISummary = ({ employee }: ProfileAISummaryProps) => {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-profile-summary", {
        body: { employee },
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
    generateSummary();
  }, [employee.name]);

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-5 w-5" />
          AI Summary
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateSummary}
          disabled={loading}
          className="text-white hover:bg-white/20 hover:text-white h-8 px-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/80">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Generating summary...
          </div>
        ) : summary ? (
          <p className="text-sm leading-relaxed text-white/95">{summary}</p>
        ) : (
          <p className="text-sm text-white/70 italic">Click regenerate to create a summary.</p>
        )}
      </div>
    </Card>
  );
};
