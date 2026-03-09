import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useProjectDashboardData } from '@/services/useProjectDashboard';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CheckCircle2, Users, FolderOpen, List, Loader2, Paperclip, Download, FileIcon } from 'lucide-react';
import type { TaskSpaceRow } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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

        {/* Project Attachments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              Project Attachments
              <span className="text-xs text-muted-foreground font-normal">({data.attachments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No attachments yet</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {data.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-md hover:bg-muted/50 text-xs">
                    <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{att.fileName}</span>
                      <span className="text-muted-foreground text-[10px]">{att.taskTitle}</span>
                    </div>
                    <span className="text-muted-foreground shrink-0">{formatFileSize(att.fileSize)}</span>
                    <span className="text-muted-foreground shrink-0">{format(new Date(att.createdAt), 'MMM d')}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5"
                      onClick={() => {
                        const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(att.filePath);
                        const a = document.createElement('a');
                        a.href = urlData.publicUrl;
                        a.download = att.fileName;
                        a.target = '_blank';
                        a.click();
                      }}
                    >
                      <Download className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                {data.subProjects.map((sp) => (
                  <div key={sp.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        {isImageIcon(sp.icon) ? (
                          <img src={sp.icon} alt="" className="h-4 w-4 rounded object-cover inline" />
                        ) : (
                          <span>{sp.icon || '📂'}</span>
                        )}
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
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} className="text-muted-foreground" />
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
