import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Play,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useRelativeTime } from '@/hooks/useRelativeTime';

interface TestRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  test_type: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  duration_ms: number | null;
}

interface HistoryRunListProps {
  testRuns: TestRun[];
  onRerunRun: (runId: string) => void;
  rerunningId: string | null;
}

const HistoryRunList = ({ testRuns, onRerunRun, rerunningId }: HistoryRunListProps) => {
  const { getShortRelativeTime } = useRelativeTime();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'cancelled':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-500 hover:bg-green-600">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-amber-600 border-amber-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPassRate = (run: TestRun) => {
    if (run.total_tests === 0) return 0;
    return Math.round((run.passed_tests / run.total_tests) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Test Run History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {testRuns.map((run) => {
              const passRate = getPassRate(run);
              const isRerunning = rerunningId === run.id;

              return (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{run.test_type} Tests</span>
                        {getStatusBadge(run.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span>{format(new Date(run.started_at), 'MMM d, yyyy h:mm a')}</span>
                        <span className="text-xs">({getShortRelativeTime(run.started_at)})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Pass Rate */}
                    <div className="text-center min-w-[80px]">
                      <div className={`text-xl font-bold ${
                        passRate >= 90 ? 'text-green-500' : 
                        passRate >= 70 ? 'text-amber-500' : 
                        'text-destructive'
                      }`}>
                        {passRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">Pass Rate</div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold">{run.total_tests}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-500">{run.passed_tests}</div>
                        <div className="text-xs text-muted-foreground">Passed</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-destructive">{run.failed_tests}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-medium">
                        {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>

                    {/* Rerun Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRerunRun(run.id)}
                      disabled={isRerunning || run.status === 'running'}
                      className="gap-1"
                    >
                      {isRerunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Rerun
                    </Button>
                  </div>
                </div>
              );
            })}

            {(!testRuns || testRuns.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No test history yet</p>
                <p className="text-sm mt-1">Run your first test to get started</p>
                <Button variant="outline" className="mt-4 gap-2">
                  <Play className="h-4 w-4" />
                  Run All Tests
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HistoryRunList;
