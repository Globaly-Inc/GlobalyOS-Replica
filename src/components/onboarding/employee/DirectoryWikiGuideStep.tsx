/**
 * Employee Onboarding - Directory & Wiki Guide Step
 * Brief intro to team directory, org chart, and wiki
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, ArrowLeft, Users, Network, BookOpen, Search, FolderOpen, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  position: string;
  department: string;
}

const MiniEmployeeCard = ({ employee }: { employee: TeamMember }) => (
  <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-blue-950/40 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
    <Avatar className="h-10 w-10 border-2 border-blue-200 dark:border-blue-700">
      <AvatarImage src={employee.avatar_url || undefined} />
      <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 text-sm font-medium">
        {employee.full_name.split(' ').map(n => n[0]).join('')}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <p className="font-medium text-sm text-blue-900 dark:text-blue-100 truncate">
        {employee.full_name}
      </p>
      <p className="text-xs text-blue-600 dark:text-blue-300 truncate">
        {employee.position} • {employee.department}
      </p>
    </div>
  </div>
);

interface DirectoryWikiGuideStepProps {
  onContinue: () => void;
  onBack?: () => void;
  isNavigating?: boolean;
}

export function DirectoryWikiGuideStep({ onContinue, onBack, isNavigating = false }: DirectoryWikiGuideStepProps) {
  const { currentOrg } = useOrganization();

  // Fetch active employees from employee_directory
  const { data: activeEmployees = [] } = useQuery({
    queryKey: ['onboarding-team-preview', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      const { data } = await supabase
        .from('employee_directory')
        .select('id, full_name, avatar_url, position, department')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(2);
      
      return (data || []) as TeamMember[];
    },
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch pending team members from org_onboarding_data
  const { data: pendingMembers = [] } = useQuery({
    queryKey: ['onboarding-pending-team', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      const { data } = await supabase
        .from('org_onboarding_data')
        .select('team_members')
        .eq('organization_id', currentOrg.id)
        .maybeSingle();
      
      if (!data?.team_members) return [];
      
      // Map to TeamMember format
      return (data.team_members as { full_name?: string; avatar_url?: string; position?: string; department?: string }[])
        .slice(0, 2)
        .map((m, i) => ({
          id: `pending-${i}`,
          full_name: m.full_name || '',
          avatar_url: m.avatar_url || null,
          position: m.position || '',
          department: m.department || '',
        })) as TeamMember[];
    },
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Combine active + pending, limit to 2
  const teamMembers = useMemo(() => {
    const combined = [...activeEmployees, ...pendingMembers];
    return combined.slice(0, 2);
  }, [activeEmployees, pendingMembers]);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
          <Users className="h-8 w-8 text-cyan-600" />
        </div>
        <CardTitle className="text-2xl">Find People & Knowledge</CardTitle>
        <CardDescription className="text-base">
          Everything you need to know, all in one place
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Three main features */}
        <div className="grid gap-4">
          {/* Team Directory */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Team Directory</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Find colleagues by name, department, or role. View profiles and contact details.
                </p>
                
                {/* Team Preview Section */}
                {teamMembers.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Meet your team
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {teamMembers.map((member) => (
                        <MiniEmployeeCard key={member.id} employee={member} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Org Chart */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Org Chart</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Visualize the organizational structure. See reporting lines and teams.
                </p>
              </div>
            </div>
          </div>

          {/* Wiki */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">Wiki & Knowledge Base</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Access policies, how-tos, documentation, and everything you need to know.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick tips */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Use search to find anything quickly</span>
          </div>
          <div className="flex-1 flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Wiki pages are organized in folders</span>
          </div>
        </div>

        <div className="flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack} disabled={isNavigating} className="h-12 px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={onContinue} disabled={isNavigating} className="flex-1 h-12 text-base font-semibold" size="lg">
            {isNavigating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Please wait...
              </>
            ) : (
              <>
                Almost Done
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
