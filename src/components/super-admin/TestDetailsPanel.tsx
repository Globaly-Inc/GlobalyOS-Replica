import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  X, 
  Play, 
  Clock, 
  FileCode, 
  AlertCircle, 
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  ChevronRight
} from 'lucide-react';

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
  stack_trace: string | null;
}

interface TestDetailsProps {
  test: TestResult;
  onClose: () => void;
  onFixWithAI: (test: TestResult) => void;
  isFixing: boolean;
}

const TestDetailsPanel = ({ test, onClose, onFixWithAI, isFixing }: TestDetailsProps) => {
  const queryClient = useQueryClient();
  const [isRerunning, setIsRerunning] = useState(false);

  // Fetch test history - find same test name in previous runs
  const { data: testHistory } = useQuery({
    queryKey: ['test-history', test.test_name, test.test_file],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_results')
        .select('*, test_runs!inner(started_at)')
        .eq('test_name', test.test_name)
        .eq('test_file', test.test_file)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as (TestResult & { test_runs: { started_at: string } })[];
    },
  });

  // Rerun individual test mutation
  const rerunTestMutation = useMutation({
    mutationFn: async () => {
      setIsRerunning(true);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/run-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ 
          test_type: test.test_category,
          test_file: test.test_file,
          test_name: test.test_name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rerun test');
      }

      // Read the streaming response until complete
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let result = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'complete') {
                result = data;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      return result;
    },
    onSuccess: (data) => {
      setIsRerunning(false);
      if (data?.status === 'passed') {
        toast.success('Test passed!');
      } else if (data?.failedTests > 0) {
        toast.error('Test still failing');
      } else {
        toast.success('Test rerun completed');
      }
      queryClient.invalidateQueries({ queryKey: ['test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['test-results'] });
      queryClient.invalidateQueries({ queryKey: ['test-history'] });
    },
    onError: (error) => {
      setIsRerunning(false);
      toast.error(error instanceof Error ? error.message : 'Failed to rerun test');
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-success/20 text-success border-success/30">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'skipped':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusBadge(test.status)}
            <Badge variant="outline" className="capitalize">
              {test.test_category}
            </Badge>
          </div>
          <h3 className="font-semibold text-base truncate">{test.test_name}</h3>
          <p className="text-sm text-muted-foreground font-mono truncate">{test.test_file}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-4 border-b">
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => rerunTestMutation.mutate()}
          disabled={isRerunning}
        >
          {isRerunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Rerun Test
        </Button>
        {test.status === 'failed' && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => onFixWithAI(test)}
            disabled={isFixing}
          >
            {isFixing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Fix with AI
          </Button>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue={test.status === 'failed' ? 'error' : 'details'} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 w-fit">
          <TabsTrigger value="details" className="gap-2">
            <FileCode className="h-4 w-4" />
            Details
          </TabsTrigger>
          {test.status === 'failed' && (
            <TabsTrigger value="error" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Error
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="details" className="h-full mt-0 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Test Name</div>
                  <div className="font-mono text-sm">{test.test_name}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">File</div>
                  <div className="font-mono text-sm">{test.test_file}</div>
                </div>
                {test.test_suite && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Suite</div>
                      <div className="font-mono text-sm">{test.test_suite}</div>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Category</div>
                  <Badge variant="outline" className="capitalize">{test.test_category}</Badge>
                </div>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Duration</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{test.duration_ms ? `${test.duration_ms}ms` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="error" className="h-full mt-0 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {test.error_message && (
                  <div>
                    <div className="text-sm font-medium text-destructive mb-2">Error Message</div>
                    <pre className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                      {test.error_message}
                    </pre>
                  </div>
                )}
                {test.stack_trace && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Stack Trace</div>
                    <pre className="p-3 rounded-md bg-muted text-sm font-mono whitespace-pre-wrap overflow-x-auto text-xs">
                      {test.stack_trace}
                    </pre>
                  </div>
                )}
                {!test.error_message && !test.stack_trace && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No error details available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="h-full mt-0 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {testHistory && testHistory.length > 0 ? (
                  testHistory.map((historyItem, index) => (
                    <div 
                      key={historyItem.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(historyItem.status)}
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {historyItem.status}
                            {index === 0 && (
                              <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(historyItem.test_runs.started_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {historyItem.duration_ms ? `${historyItem.duration_ms}ms` : '-'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No previous runs found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TestDetailsPanel;
