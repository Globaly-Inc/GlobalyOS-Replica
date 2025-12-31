import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Plane, Home, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { format } from 'date-fns';

interface OfficeOverviewStatsProps {
  officeId: string;
}

interface Stats {
  total: number;
  present: number;
  onLeave: number;
  remote: number;
  pendingRequests: number;
}

export const OfficeOverviewStats = ({ officeId }: OfficeOverviewStatsProps) => {
  const { currentOrg } = useOrganization();
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, onLeave: 0, remote: 0, pendingRequests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [officeId, currentOrg?.id]);

  const loadStats = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);

    // Use UTC date for consistency with database storage
    const today = new Date().toISOString().split('T')[0];

    // Get all active employees in this office
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('office_id', officeId)
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active');

    const totalCount = employees?.length || 0;
    const employeeIds = employees?.map(e => e.id) || [];

    if (employeeIds.length === 0) {
      setStats({ total: 0, present: 0, onLeave: 0, remote: 0, pendingRequests: 0 });
      setLoading(false);
      return;
    }

    // Get today's attendance records
    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('employee_id, status')
      .eq('date', today)
      .in('employee_id', employeeIds);

    const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
    const remoteCount = attendance?.filter(a => a.status === 'remote').length || 0;

    // Get approved leave for today
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('employee_id')
      .eq('status', 'approved')
      .in('employee_id', employeeIds)
      .lte('start_date', today)
      .gte('end_date', today);

    const onLeaveCount = leaves?.length || 0;

    // Get pending leave and WFH requests
    const { data: pendingLeave } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('status', 'pending')
      .in('employee_id', employeeIds);

    const { data: pendingWfh } = await supabase
      .from('wfh_requests')
      .select('id')
      .eq('status', 'pending')
      .in('employee_id', employeeIds);

    const pendingCount = (pendingLeave?.length || 0) + (pendingWfh?.length || 0);

    setStats({
      total: totalCount,
      present: presentCount,
      onLeave: onLeaveCount,
      remote: remoteCount,
      pendingRequests: pendingCount,
    });
    setLoading(false);
  };

  const statCards = [
    { label: 'Present', value: stats.present, icon: UserCheck, color: 'text-green-600 bg-green-100', percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0 },
    { label: 'On Leave', value: stats.onLeave, icon: Plane, color: 'text-amber-600 bg-amber-100', percentage: stats.total > 0 ? Math.round((stats.onLeave / stats.total) * 100) : 0 },
    { label: 'Remote', value: stats.remote, icon: Home, color: 'text-blue-600 bg-blue-100', percentage: stats.total > 0 ? Math.round((stats.remote / stats.total) * 100) : 0 },
    { label: 'Pending', value: stats.pendingRequests, icon: Clock, color: 'text-purple-600 bg-purple-100' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Today's Overview
          <span className="text-muted-foreground font-normal ml-auto text-sm">
            {stats.total} total employees
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/30">
              <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-2`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{loading ? '-' : stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
              {stat.percentage !== undefined && stats.total > 0 && (
                <div className="text-xs text-muted-foreground mt-1">{stat.percentage}%</div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
