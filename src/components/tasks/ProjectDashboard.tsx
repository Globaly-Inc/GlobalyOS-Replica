import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useProjectDashboardData } from '@/services/useProjectDashboard';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { CheckCircle2, TrendingUp, Users, FolderOpen, Loader2 } from 'lucide-react';
import type { TaskSpaceRow } from '@/types/task';

interface ProjectDashboardProps {
  spaceId: string;
  spaces: TaskSpaceRow[];
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
];

export function ProjectDashboard({ spaceId, spaces }: ProjectDashboardProps) {
  const { data, isLoading } = useProjectDashboardData(spaceId, spaces);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const donutData = [
    { name: 'Completed', value: data.completedTasks },
    { name: 'Remaining', value: data.totalTasks - data.completedTasks },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Completion Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Project Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{data.completionRate}%</span>
                  <span className="text-xs text-muted-foreground">{data.completedTasks}/{data.totalTasks} tasks</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sprint Velocity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Sprint Velocity (Last 6 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.velocity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sub-projects */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Sub-projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.subProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sub-projects yet</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {data.subProjects.map(sp => (
                  <div key={sp.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        <span>{sp.icon || '📂'}</span>
                        {sp.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sp.completedTasks}/{sp.totalTasks} · {sp.completionRate}%
                      </span>
                    </div>
                    <Progress value={sp.completionRate} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks by Assignee */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Tasks by Assignee
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.tasksByAssignee.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet</p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tasksByAssignee} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {data.tasksByAssignee.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
