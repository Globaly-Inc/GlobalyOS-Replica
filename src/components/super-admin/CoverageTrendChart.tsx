import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface TrendDataPoint {
  date: string;
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

interface CoverageTrendChartProps {
  data: TrendDataPoint[];
}

const CoverageTrendChart = ({ data }: CoverageTrendChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No trend data available
      </div>
    );
  }

  // Format data for chart (reverse to show oldest first)
  const chartData = [...data].reverse().map((point) => ({
    ...point,
    dateLabel: format(new Date(point.date), 'MMM d'),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="dateLabel" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          domain={[0, 100]} 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="lines" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))' }}
          name="Lines"
        />
        <Line 
          type="monotone" 
          dataKey="functions" 
          stroke="hsl(var(--success))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--success))' }}
          name="Functions"
        />
        <Line 
          type="monotone" 
          dataKey="branches" 
          stroke="hsl(var(--warning))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--warning))' }}
          name="Branches"
        />
        <Line 
          type="monotone" 
          dataKey="statements" 
          stroke="hsl(262 83% 58%)" 
          strokeWidth={2}
          dot={{ fill: 'hsl(262 83% 58%)' }}
          name="Statements"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CoverageTrendChart;
