import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building, Users, Loader2 } from "lucide-react";

interface OrgOfficesTabProps {
  organizationId: string;
}

export function OrgOfficesTab({ organizationId }: OrgOfficesTabProps) {
  const { data: offices, isLoading } = useQuery({
    queryKey: ["org-offices", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offices")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Get employee counts per office
  const { data: employeeCounts } = useQuery({
    queryKey: ["org-office-employee-counts", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("office_id")
        .eq("organization_id", organizationId);
      if (error) throw error;
      
      // Count employees per office
      const counts: Record<string, number> = {};
      data?.forEach((emp) => {
        if (emp.office_id) {
          counts[emp.office_id] = (counts[emp.office_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!offices || offices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No offices configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {offices.map((office) => (
        <Card key={office.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{office.name}</CardTitle>
                  {office.city && office.country && (
                    <p className="text-sm text-muted-foreground">
                      {office.city}, {office.country}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {employeeCounts?.[office.id] || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {office.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{office.address}</span>
              </div>
            )}
            {!office.address && !office.city && (
              <p className="text-sm text-muted-foreground italic">
                No address configured
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
