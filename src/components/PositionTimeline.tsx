import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight, DollarSign, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface TimelineEntry {
  id: string;
  position: string;
  department: string;
  salary: number | null;
  manager_id: string | null;
  effective_date: string;
  end_date: string | null;
  change_type: string;
  notes: string | null;
  manager?: {
    profiles: {
      full_name: string;
    };
  };
}

interface PositionTimelineProps {
  entries: TimelineEntry[];
  currentPosition: string;
  currentDepartment: string;
  currentSalary: number | null;
}

const changeTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  promotion: { label: "Promotion", color: "bg-green-500", icon: TrendingUp },
  lateral_move: { label: "Lateral Move", color: "bg-blue-500", icon: ArrowRight },
  salary_increase: { label: "Salary Increase", color: "bg-purple-500", icon: DollarSign },
  manager_change: { label: "Manager Change", color: "bg-orange-500", icon: UserCheck },
  initial: { label: "Joined", color: "bg-gray-500", icon: UserCheck },
};

export const PositionTimeline = ({ 
  entries, 
  currentPosition, 
  currentDepartment,
  currentSalary 
}: PositionTimelineProps) => {
  // Sort entries by effective_date descending (most recent first)
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
  );

  const formatSalary = (salary: number | null) => {
    if (!salary) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Position Timeline & Salary Progression
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          This information is only visible to managers and HR officers
        </p>
      </CardHeader>
      <CardContent>
        {/* Current Position */}
        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default">Current</Badge>
          </div>
          <h3 className="font-semibold text-lg">{currentPosition}</h3>
          <p className="text-sm text-muted-foreground">{currentDepartment}</p>
          {currentSalary && (
            <p className="text-sm font-medium mt-1">{formatSalary(currentSalary)}</p>
          )}
        </div>

        {/* Timeline */}
        {sortedEntries.length > 0 && (
          <div className="space-y-4">
            <div className="relative">
              {/* Timeline line */}
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              {sortedEntries.map((entry, index) => {
                const config = changeTypeConfig[entry.change_type] || changeTypeConfig.initial;
                const Icon = config.icon;
                const isLast = index === sortedEntries.length - 1;

                return (
                  <div key={entry.id} className="relative pl-12 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 top-1 w-4 h-4 rounded-full ${config.color} border-4 border-background`} />

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              <Icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(entry.effective_date), 'MMM d, yyyy')}
                              {entry.end_date && !isLast && (
                                <> - {format(new Date(entry.end_date), 'MMM d, yyyy')}</>
                              )}
                            </span>
                          </div>
                          <h4 className="font-semibold">{entry.position}</h4>
                          <p className="text-sm text-muted-foreground">{entry.department}</p>
                          
                          {entry.salary && (
                            <p className="text-sm font-medium mt-1">
                              {formatSalary(entry.salary)}
                            </p>
                          )}
                          
                          {entry.manager && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Manager: {entry.manager.profiles.full_name}
                            </p>
                          )}

                          {entry.notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
