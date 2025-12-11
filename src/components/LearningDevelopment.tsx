import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, Award, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface LearningDevelopmentProps {
  employeeId: string;
}

export const LearningDevelopment = ({ employeeId }: LearningDevelopmentProps) => {
  const { data: learningRecords, isLoading } = useQuery({
    queryKey: ["learning-development", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_development")
        .select("*")
        .eq("employee_id", employeeId)
        .order("completion_date", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading learning records...</div>;
  }

  if (!learningRecords || learningRecords.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-6">No learning records yet.</p>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "planned":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "certification":
        return <Award className="h-4 w-4" />;
      case "course":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {learningRecords.map((record) => (
        <div
          key={record.id}
          className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {getTypeIcon(record.type)}
                <h4 className="font-semibold">{record.title}</h4>
              </div>
              {record.provider && (
                <p className="text-sm text-muted-foreground">{record.provider}</p>
              )}
              {record.description && (
                <p className="text-sm text-muted-foreground">{record.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-sm">
                {record.completion_date && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Completed: {formatDate(record.completion_date)}</span>
                  </div>
                )}
                {record.expiry_date && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Expires: {formatDate(record.expiry_date)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor(record.status)}>
                {record.status.replace("_", " ")}
              </Badge>
              {record.cost && (
                <span className="text-sm text-muted-foreground">
                  ${Number(record.cost).toLocaleString()}
                </span>
              )}
              <Badge variant="outline" className="capitalize">
                {record.type}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
