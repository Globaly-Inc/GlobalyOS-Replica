import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Globe,
  Zap,
  Database,
  Shield,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ErrorLog, ErrorType, NetworkRequest } from '@/types/errorLogs';

interface TestStrategy {
  type: 'edge_function' | 'network_request' | 'navigation' | 'unsupported';
  label: string;
  description: string;
  icon: React.ElementType;
  endpoint?: string;
  method?: string;
  originalStatus?: number;
  functionName?: string;
}

interface TestResult {
  success: boolean;
  status?: number;
  responseTime?: number;
  error?: string;
  testedAt: string;
}

interface TestErrorScenarioDialogProps {
  log: ErrorLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerificationComplete?: (verified: boolean, notes: string) => void;
}

function extractFunctionName(url: string): string | null {
  // Match patterns like /functions/v1/function-name
  const match = url.match(/\/functions\/v1\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function determineTestStrategy(log: ErrorLog): TestStrategy {
  const networkRequests: NetworkRequest[] = Array.isArray(log.network_requests) 
    ? log.network_requests 
    : [];
  const failedRequest = networkRequests.find(r => !r.success);
  
  // Edge function errors
  if (log.error_type === 'edge_function' || (failedRequest && failedRequest.url.includes('/functions/v1/'))) {
    const functionName = failedRequest ? extractFunctionName(failedRequest.url) : null;
    if (functionName) {
      return {
        type: 'edge_function',
        label: 'Re-invoke Edge Function',
        description: `Test the ${functionName} function with a health check request`,
        icon: Zap,
        endpoint: failedRequest?.url,
        method: failedRequest?.method || 'POST',
        originalStatus: failedRequest?.status,
        functionName,
      };
    }
  }
  
  // Network errors with a specific failed request
  if (log.error_type === 'network' && failedRequest) {
    return {
      type: 'network_request',
      label: 'Re-send Network Request',
      description: 'Attempt the same HTTP request to check if the endpoint is responding',
      icon: Globe,
      endpoint: failedRequest.url,
      method: failedRequest.method,
      originalStatus: failedRequest.status,
    };
  }
  
  // Database errors
  if (log.error_type === 'database') {
    return {
      type: 'unsupported',
      label: 'Database Query Test',
      description: 'Database errors require manual testing through the database interface',
      icon: Database,
    };
  }
  
  // Auth errors
  if (log.error_type === 'auth') {
    return {
      type: 'unsupported',
      label: 'Authentication Test',
      description: 'Auth errors involve user sessions and should be tested through the login flow',
      icon: Shield,
    };
  }
  
  // Runtime/validation - suggest navigation
  if (log.page_url) {
    return {
      type: 'navigation',
      label: 'Navigate to Error Page',
      description: 'Open the page where the error occurred to verify the fix',
      icon: ExternalLink,
      endpoint: log.page_url,
    };
  }
  
  return {
    type: 'unsupported',
    label: 'Manual Testing Required',
    description: 'This error type requires manual verification',
    icon: Code2,
  };
}

export default function TestErrorScenarioDialog({
  log,
  open,
  onOpenChange,
  onVerificationComplete,
}: TestErrorScenarioDialogProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const strategy = useMemo(() => determineTestStrategy(log), [log]);
  const StrategyIcon = strategy.icon;

  const handleRunTest = async () => {
    setIsRunning(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      if (strategy.type === 'edge_function' && strategy.functionName) {
        // Invoke the test-error-scenario edge function to test the target function
        const { data, error } = await supabase.functions.invoke('test-error-scenario', {
          body: {
            testType: 'edge_function',
            functionName: strategy.functionName,
            originalMethod: strategy.method,
          },
        });

        if (error) {
          setTestResult({
            success: false,
            responseTime: Date.now() - startTime,
            error: error.message,
            testedAt: new Date().toISOString(),
          });
        } else {
          setTestResult({
            success: data.success,
            status: data.status,
            responseTime: data.responseTime || (Date.now() - startTime),
            error: data.error,
            testedAt: new Date().toISOString(),
          });
        }
      } else if (strategy.type === 'network_request' && strategy.endpoint) {
        // Test the network endpoint directly
        const { data, error } = await supabase.functions.invoke('test-error-scenario', {
          body: {
            testType: 'network_request',
            url: strategy.endpoint,
            method: strategy.method || 'GET',
          },
        });

        if (error) {
          setTestResult({
            success: false,
            responseTime: Date.now() - startTime,
            error: error.message,
            testedAt: new Date().toISOString(),
          });
        } else {
          setTestResult({
            success: data.success,
            status: data.status,
            responseTime: data.responseTime || (Date.now() - startTime),
            error: data.error,
            testedAt: new Date().toISOString(),
          });
        }
      } else if (strategy.type === 'navigation') {
        // For navigation tests, just open the page
        window.open(strategy.endpoint, '_blank');
        setTestResult({
          success: true,
          responseTime: Date.now() - startTime,
          testedAt: new Date().toISOString(),
        });
        toast.info('Page opened in new tab - verify the error is resolved manually');
      } else {
        toast.error('This error type cannot be automatically tested');
        setTestResult({
          success: false,
          error: 'Automatic testing not supported for this error type',
          testedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Test error:', err);
      setTestResult({
        success: false,
        responseTime: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        testedAt: new Date().toISOString(),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleMarkAsVerified = () => {
    if (testResult) {
      const notes = `
---
Verification Test (${format(new Date(testResult.testedAt), 'MMM d, yyyy HH:mm')})
Result: ${testResult.success ? '✅ PASSED' : '❌ FAILED'}
${testResult.status ? `Status Code: ${testResult.status}` : ''}
${testResult.responseTime ? `Response Time: ${testResult.responseTime}ms` : ''}
${testResult.error ? `Error: ${testResult.error}` : ''}
`.trim();
      
      onVerificationComplete?.(testResult.success, notes);
      toast.success('Verification notes added');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Test Error Scenario
          </DialogTitle>
          <DialogDescription>
            Verify if the error has been fixed by re-testing the scenario
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Type & Strategy */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Error Type</span>
              <Badge variant="outline">{log.error_type}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <StrategyIcon className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{strategy.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{strategy.description}</p>
          </div>

          {/* Endpoint Details */}
          {strategy.endpoint && (
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {strategy.method || 'GET'}
                </Badge>
                <span className="text-slate-300 break-all">{strategy.endpoint}</span>
              </div>
              {strategy.originalStatus && (
                <div className="text-slate-500">
                  Original Status: <span className="text-red-400">{strategy.originalStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          {strategy.type !== 'unsupported' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                This will make a real request to the endpoint. Ensure you have appropriate access and the test won't cause unintended side effects.
              </p>
            </div>
          )}

          {/* Run Test Button */}
          {strategy.type !== 'unsupported' && (
            <Button 
              onClick={handleRunTest} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          )}

          {/* Test Results */}
          {testResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Test Results</h4>
                <div className={cn(
                  "p-4 rounded-lg border",
                  testResult.success 
                    ? "bg-green-500/10 border-green-500/20" 
                    : "bg-red-500/10 border-red-500/20"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={cn(
                      "font-medium",
                      testResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                    )}>
                      {testResult.success ? 'Test Passed' : 'Test Failed'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    {testResult.status && (
                      <p className="text-muted-foreground">
                        Status Code: <span className="font-mono">{testResult.status}</span>
                      </p>
                    )}
                    {testResult.responseTime && (
                      <p className="text-muted-foreground">
                        Response Time: <span className="font-mono">{testResult.responseTime}ms</span>
                      </p>
                    )}
                    {testResult.error && (
                      <p className="text-red-600 dark:text-red-400">
                        Error: {testResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {testResult && (
            <Button 
              variant={testResult.success ? "default" : "outline"} 
              onClick={handleMarkAsVerified}
            >
              {testResult.success ? 'Resolve Error' : 'Add Verification Notes'}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
