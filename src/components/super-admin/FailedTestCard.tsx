import { useState } from 'react';
import { XCircle, ChevronDown, ChevronRight, Sparkles, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

interface FailedTestCardProps {
  test: TestResult;
  onFixWithAI: (test: TestResult) => void;
  isFixing?: boolean;
}

const FailedTestCard = ({ test, onFixWithAI, isFixing }: FailedTestCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-destructive/20 rounded-lg bg-destructive/5 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">
                  {typeof test.test_name === 'string' ? test.test_name : String(test.test_name || 'Unknown test')}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <FileCode className="h-3 w-3" />
                  <span className="font-mono truncate">
                    {typeof test.test_file === 'string' 
                      ? test.test_file 
                      : typeof test.test_file === 'object' && test.test_file !== null
                        ? Object.keys(test.test_file)[0] || 'Unknown file'
                        : String(test.test_file || 'Unknown file')}
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 border-primary/30 hover:border-primary hover:bg-primary/10"
              onClick={() => onFixWithAI(test)}
              disabled={isFixing}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Fix with AI</span>
              <span className="sm:hidden">Fix</span>
            </Button>
          </div>

          {test.error_message && (
            <CollapsibleTrigger className="w-full mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span className="truncate text-left flex-1">
                  {isExpanded ? 'Hide details' : test.error_message.substring(0, 80) + (test.error_message.length > 80 ? '...' : '')}
                </span>
              </div>
            </CollapsibleTrigger>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {test.error_message && (
              <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
                <div className="text-xs font-medium text-destructive mb-1">Error Message</div>
                <pre className="text-xs text-destructive/90 whitespace-pre-wrap font-mono overflow-x-auto">
                  {test.error_message}
                </pre>
              </div>
            )}
            
            {test.stack_trace && (
              <div className="p-2 rounded bg-muted/50 border border-border">
                <div className="text-xs font-medium text-muted-foreground mb-1">Stack Trace</div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto max-h-32 overflow-y-auto">
                  {test.stack_trace}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default FailedTestCard;
