import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, Calendar, Loader2 } from "lucide-react";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";

interface OverviewStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  totalWikiPages: number;
  totalCalendarEvents: number;
}

const SuperAdminOverview = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch organization stats
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, plan');
      
      if (orgsError) throw orgsError;

      // Fetch user stats (profiles)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');
      
      if (usersError) throw usersError;

      // Fetch employees with active status
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, status');
      
      if (empError) throw empError;

      // Fetch wiki pages
      const { data: wikiPages, error: wikiError } = await supabase
        .from('wiki_pages')
        .select('id');
      
      if (wikiError) throw wikiError;

      // Fetch calendar events
      const { data: calendarEvents, error: calError } = await supabase
        .from('calendar_events')
        .select('id');
      
      if (calError) throw calError;

      const activeEmployees = employees?.filter(e => e.status === 'active') || [];

      setStats({
        totalOrganizations: orgs?.length || 0,
        activeOrganizations: orgs?.filter(o => o.plan !== 'inactive').length || 0,
        totalUsers: users?.length || 0,
        activeUsers: activeEmployees.length,
        totalWikiPages: wikiPages?.length || 0,
        totalCalendarEvents: calendarEvents?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Overview</h2>
          <p className="text-muted-foreground">
            Global view of all organisations and usage
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Organisations
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeOrganizations} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeUsers} active employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Wiki Pages
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalWikiPages}</div>
              <p className="text-xs text-muted-foreground">
                Across all organisations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Calendar Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCalendarEvents}</div>
              <p className="text-xs text-muted-foreground">
                Holidays & events
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminOverview;
