import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';

interface OfficeTeamListProps {
  officeId: string;
  officeName: string;
}

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  position: string;
  department: string;
}

export const OfficeTeamList = ({ officeId, officeName }: OfficeTeamListProps) => {
  const { currentOrg } = useOrganization();
  const { navigateOrg } = useOrgNavigation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadEmployees();
  }, [officeId, currentOrg?.id]);

  const loadEmployees = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);

    const { data: employeesData } = await supabase
      .from('employee_directory')
      .select('id, full_name, avatar_url, position, department')
      .eq('office_id', officeId)
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active')
      .order('full_name')
      .limit(20);

    if (!employeesData?.length) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    setEmployees(employeesData);

    const employeeIds = employeesData.map(e => e.id);

    // Fetch online statuses
    const { data: presences } = await supabase
      .from('chat_presence')
      .select('employee_id, is_online, last_seen_at')
      .in('employee_id', employeeIds);

    if (presences) {
      const now = new Date();
      const statusMap: Record<string, boolean> = {};
      presences.forEach((p: any) => {
        if (p.is_online && p.last_seen_at) {
          const lastSeen = new Date(p.last_seen_at);
          const isStale = (now.getTime() - lastSeen.getTime()) > 60000;
          statusMap[p.employee_id] = !isStale;
        }
      });
      setOnlineStatuses(statusMap);
    }

    setLoading(false);
  };

  const handleViewAll = () => {
    navigateOrg('/team');
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Users className="h-4 w-4" />
                Team Members
                <Badge variant="secondary" className="ml-2">{employees.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewAll(); }}>
                View All
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No employees in this office</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => navigateOrg(`/team/${employee.id}`)}
                    className="flex items-stretch gap-3 p-3 rounded-lg border bg-card hover:shadow-md hover:bg-muted/30 transition-all text-left"
                  >
                    <div className="relative flex-shrink-0 flex items-center">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={employee.avatar_url || undefined} />
                        <AvatarFallback>
                          {employee.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {onlineStatuses[employee.id] && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center min-w-0 gap-0.5">
                      <span className="font-medium text-sm truncate">{employee.full_name}</span>
                      <span className="text-xs text-muted-foreground truncate">{employee.position}</span>
                      <span className="text-xs text-muted-foreground/70 truncate">{employee.department}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
