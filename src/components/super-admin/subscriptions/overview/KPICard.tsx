import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string;
  delta: string;
  deltaType: 'positive' | 'negative' | 'neutral';
  sparklineData?: number[];
}

const KPICard = ({ title, value, delta, deltaType, sparklineData }: KPICardProps) => {
  const color = deltaType === 'positive' ? 'hsl(var(--chart-2))' : deltaType === 'negative' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))';

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 relative overflow-hidden">
      <div className="border-b-2 border-primary absolute bottom-0 left-0 right-0" />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className={cn('text-xs font-medium mt-0.5', deltaType === 'positive' ? 'text-emerald-600' : deltaType === 'negative' ? 'text-destructive' : 'text-muted-foreground')}>
            {delta}
          </p>
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-20 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.map((v, i) => ({ v, i }))}>
                <defs>
                  <linearGradient id={`spark-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color} fill={`url(#spark-${title.replace(/\s/g, '')})`} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
