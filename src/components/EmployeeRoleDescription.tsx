import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmployeeRoleDescriptionProps {
  employeeId: string;
  canEdit?: boolean;
  initialDescription?: string | null;
  initialGeneratedAt?: string | null;
}

export function EmployeeRoleDescription({
  employeeId,
  canEdit = false,
  initialDescription,
  initialGeneratedAt,
}: EmployeeRoleDescriptionProps) {
  const [description, setDescription] = useState<string | null>(initialDescription || null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt || null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!initialDescription && !loading && !generating) {
      fetchOrGenerate(false);
    }
  }, [employeeId]);

  useEffect(() => {
    setDescription(initialDescription || null);
    setGeneratedAt(initialGeneratedAt || null);
  }, [initialDescription, initialGeneratedAt]);

  const fetchOrGenerate = async (forceRegenerate: boolean) => {
    if (forceRegenerate) {
      setGenerating(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-employee-role-description', {
        body: { employeeId, forceRegenerate }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setDescription(data.description);
      setGeneratedAt(data.generatedAt);

      if (forceRegenerate) {
        toast({
          title: "Role description updated",
          description: "AI has generated a new personalized description.",
        });
      }
    } catch (err: any) {
      console.error('Error fetching role description:', err);
      if (forceRegenerate) {
        toast({
          title: "Generation failed",
          description: err.message || "Could not generate role description.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  if (loading && !description) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Role Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Role Description
          </CardTitle>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => fetchOrGenerate(true)}
              disabled={generating}
              title="Regenerate description"
            >
              {generating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-2">
              No role description yet
            </p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchOrGenerate(true)}
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Generate with AI
              </Button>
            )}
          </div>
        )}
        {generatedAt && description && (
          <p className="text-xs text-muted-foreground/60 mt-2">
            Generated {new Date(generatedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
