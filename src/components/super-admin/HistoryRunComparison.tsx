import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  GitCompare, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

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

interface TestResult {
  id: string;
  run_id: string;
  test_name: string;
  test_file: string;
  test_suite: string | null;
  test_category: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration_ms: number | null;
  error_message: string | null;
}

interface HistoryRunComparisonProps {
  testRuns: TestRun[];
  testResults: TestResult[];
  onRerunRun: (runId: string) => void;
}

interface StatusChange {
  testName: string;
  testFile: string;
  oldStatus: string;
  newStatus: string;
  changeType: 'fixed' | 'broken' | 'unchanged';
}

const HistoryRunComparison = ({ testRuns, testResults, onRerunRun }: HistoryRunComparisonProps) => {
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const handleToggleRun = (runId: string) => {
    setSelectedRuns((prev) => {
      if (prev.includes(runId)) {
        return prev.filter((id) => id !== runId);
      }
      if (prev.length >= 2) {
        // Replace oldest selection
        return [prev[1], runId];
      }
      return [...prev, runId];
    });
  };

  const comparisonData = useMemo(() => {
    if (selectedRuns.length !== 2) return null;

    const [oldRunId, newRunId] = selectedRuns;
    const oldRun = testRuns.find((r) => r.id === oldRunId);
    const newRun = testRuns.find((r) => r.id === newRunId);

    if (!oldRun || !newRun) return null;

    // Get results for both runs
    const oldResults = testResults.filter((r) => r.run_id === oldRunId);
    const newResults = testResults.filter((r) => r.run_id === newRunId);

    // Build a map of test names to status for comparison
    const oldStatusMap = new Map(
      oldResults.map((r) => [`${r.test_file}::${r.test_name}`, r.status])
    );
    const newStatusMap = new Map(
      newResults.map((r) => [`${r.test_file}::${r.test_name}`, r.status])
    );

    // Find status changes
    const changes: StatusChange[] = [];
    const allTestKeys = new Set([...oldStatusMap.keys(), ...newStatusMap.keys()]);

    allTestKeys.forEach((key) => {
      const [testFile, testName] = key.split('::');
      const oldStatus = oldStatusMap.get(key);
      const newStatus = newStatusMap.get(key);

      if (oldStatus !== newStatus) {
        let changeType: 'fixed' | 'broken' | 'unchanged' = 'unchanged';
        if (oldStatus === 'failed' && newStatus === 'passed') {
          changeType = 'fixed';
        } else if (oldStatus === 'passed' && newStatus === 'failed') {
          changeType = 'broken';
        } else if (newStatus === 'failed') {
          changeType = 'broken';
        } else if (newStatus === 'passed') {
          changeType = 'fixed';
        }

        changes.push({
          testName,
          testFile,
          oldStatus: oldStatus || 'new',
          newStatus: newStatus || 'removed',
          changeType,
        });
      }
    });

    // Sort: broken first, then fixed
    changes.sort((a, b) => {
      if (a.changeType === 'broken' && b.changeType !== 'broken') return -1;
      if (a.changeType !== 'broken' && b.changeType === 'broken') return 1;
      return 0;
    });

    return {
      oldRun,
      newRun,
      changes,
      summary: {
        fixed: changes.filter((c) => c.changeType === 'fixed').length,
        broken: changes.filter((c) => c.changeType === 'broken').length,
        passRateDiff: 
          (newRun.total_tests > 0 ? (newRun.passed_tests / newRun.total_tests) * 100 : 0) -
          (oldRun.total_tests > 0 ? (oldRun.passed_tests / oldRun.total_tests) * 100 : 0),
        durationDiff: (newRun.duration_ms || 0) - (oldRun.duration_ms || 0),
      },
    };
  }, [selectedRuns, testRuns, testResults]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Test Runs
          </CardTitle>
          <CardDescription>
            Select two runs to compare (selected: {selectedRuns.length}/2)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {testRuns.slice(0, 20).map((run) => {
                const isSelected = selectedRuns.includes(run.id);
                const selectionOrder = selectedRuns.indexOf(run.id) + 1;

                return (
                  <div
                    key={run.id}
                    onClick={() => handleToggleRun(run.id)}
                    className={`
                      flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors
                      ${isSelected ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/50 hover:bg-muted border-2 border-transparent'}
                    `}
                  >
                    <Checkbox checked={isSelected} />
                    {isSelected && (
                      <Badge variant="default" className="min-w-[24px] justify-center">
                        {selectionOrder}
                      </Badge>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm capitalize">
                        {run.test_type} Tests
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(run.started_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-500">{run.passed_tests} ✓</span>
                      <span className="text-destructive">{run.failed_tests} ✗</span>
                      <span className="text-muted-foreground">
                        {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setShowComparison(true)}
              disabled={selectedRuns.length !== 2}
              className="gap-2"
            >
              <GitCompare className="h-4 w-4" />
              Compare Selected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {showComparison && comparisonData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparison Results</CardTitle>
            <CardDescription>
              Comparing run from {format(new Date(comparisonData.oldRun.started_at), 'MMM d, h:mm a')} 
              {' → '}
              {format(new Date(comparisonData.newRun.started_at), 'MMM d, h:mm a')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-500">{comparisonData.summary.fixed}</div>
                <div className="text-xs text-muted-foreground">Tests Fixed</div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <TrendingDown className="h-6 w-6 text-destructive mx-auto mb-2" />
                <div className="text-2xl font-bold text-destructive">{comparisonData.summary.broken}</div>
                <div className="text-xs text-muted-foreground">New Failures</div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className={`text-2xl font-bold ${comparisonData.summary.passRateDiff >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {comparisonData.summary.passRateDiff >= 0 ? '+' : ''}{comparisonData.summary.passRateDiff.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Pass Rate Change</div>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <div className={`text-2xl font-bold ${comparisonData.summary.durationDiff <= 0 ? 'text-green-500' : 'text-amber-500'}`}>
                  {comparisonData.summary.durationDiff >= 0 ? '+' : ''}{(comparisonData.summary.durationDiff / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-muted-foreground">Duration Change</div>
              </div>
            </div>

            {/* Status Changes */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Status Changes ({comparisonData.changes.length})
              </h4>

              {comparisonData.changes.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {comparisonData.changes.map((change, index) => (
                      <div
                        key={index}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border
                          ${change.changeType === 'broken' ? 'bg-destructive/5 border-destructive/20' : ''}
                          ${change.changeType === 'fixed' ? 'bg-green-500/5 border-green-500/20' : ''}
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{change.testName}</div>
                          <div className="text-xs text-muted-foreground truncate">{change.testFile}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(change.oldStatus)}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          {getStatusIcon(change.newStatus)}
                        </div>
                        <Badge
                          variant={change.changeType === 'broken' ? 'destructive' : 'default'}
                          className={change.changeType === 'fixed' ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          {change.changeType === 'broken' ? 'Broken' : 'Fixed'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No status changes between runs</p>
                </div>
              )}
            </div>

            {/* Rerun Button */}
            <div className="flex justify-end mt-6 pt-4 border-t">
              <Button
                onClick={() => onRerunRun(comparisonData.newRun.id)}
                variant="outline"
                className="gap-2"
              >
                Rerun Latest ({format(new Date(comparisonData.newRun.started_at), 'MMM d')})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HistoryRunComparison;
