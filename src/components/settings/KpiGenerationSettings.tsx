import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Trash2, 
  Loader2, 
  History,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  organizationId?: string;
}

export const KpiGenerationSettings = ({ organizationId }: Props) => {
  const navigate = useNavigate();
  const { buildOrgPath } = useOrgNavigation();
  const [isCleaning, setIsCleaning] = useState(false);

  // Fetch stuck jobs count
  const { data: stuckJobs, isLoading, refetch } = useQuery({
    queryKey: ["stuck-kpi-jobs", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // Get jobs that have been processing for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("kpi_generation_jobs")
        .select("id, progress, progress_message, started_at, last_heartbeat, created_at")
        .eq("organization_id", organizationId)
        .eq("status", "processing")
        .or(`last_heartbeat.lt.${tenMinutesAgo},last_heartbeat.is.null`)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Filter to only include jobs older than 10 min based on heartbeat or started_at
      return (data || []).filter(job => {
        const heartbeat = job.last_heartbeat || job.started_at;
        if (!heartbeat) return true; // No heartbeat = stuck
        const ageMinutes = (Date.now() - new Date(heartbeat).getTime()) / 60000;
        return ageMinutes > 10;
      });
    },
    enabled: !!organizationId,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Clear all stuck jobs
  const handleClearStuckJobs = async () => {
    if (!stuckJobs?.length || !organizationId) return;
    
    setIsCleaning(true);
    try {
      const { error } = await supabase
        .from("kpi_generation_jobs")
        .update({
          status: 'failed',
          error_message: 'Cancelled: exceeded timeout (admin action)',
          completed_at: new Date().toISOString()
        })
        .in("id", stuckJobs.map(j => j.id));
      
      if (error) throw error;
      
      toast.success(`Cleared ${stuckJobs.length} stuck job${stuckJobs.length > 1 ? 's' : ''}`);
      refetch();
    } catch (err) {
      console.error("Failed to clear stuck jobs:", err);
      toast.error("Failed to clear stuck jobs");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stuck Jobs Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI KPI Generation
          </CardTitle>
          <CardDescription>
            Manage bulk KPI generation jobs and clean up stuck processes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stuck Jobs Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : stuckJobs && stuckJobs.length > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <div>
                <p className="font-medium">
                  {isLoading 
                    ? "Checking for stuck jobs..." 
                    : stuckJobs && stuckJobs.length > 0 
                      ? `${stuckJobs.length} stuck job${stuckJobs.length > 1 ? 's' : ''} found`
                      : "No stuck jobs"
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {stuckJobs && stuckJobs.length > 0 
                    ? "These jobs have been processing for over 10 minutes without updates"
                    : "All generation jobs are running normally"
                  }
                </p>
              </div>
            </div>
            {stuckJobs && stuckJobs.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearStuckJobs}
                disabled={isCleaning}
                className="gap-2"
              >
                {isCleaning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Clear Stuck Jobs
              </Button>
            )}
          </div>

          {/* Stuck Jobs List */}
          {stuckJobs && stuckJobs.length > 0 && (
            <div className="space-y-2">
              {stuckJobs.map(job => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                      {job.progress}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {job.progress_message || "Unknown status"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {job.id.slice(0, 8)}...
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => navigate(buildOrgPath("/kpi/bulk-create"))}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Create Bulk KPIs
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(buildOrgPath("/kpi/generation-history"))}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              View History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
