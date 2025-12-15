import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  Loader2, 
  FileCode, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  id: string;
  test_name: string;
  test_file: string;
  test_suite: string | null;
  test_category: string;
  error_message: string | null;
  stack_trace: string | null;
}

interface AIFixResponse {
  explanation: string;
  suggestedFix: string;
  confidence: 'High' | 'Medium' | 'Low';
  affectedFiles: string[];
}

interface AITestFixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: TestResult | null;
  fixResponse: AIFixResponse | null;
  isLoading: boolean;
  onRegenerate: () => void;
}

// Helper to safely extract file strings from various formats
const normalizeAffectedFiles = (files: unknown): string[] => {
  if (!files) return [];
  
  // If it's already an array, process each item
  if (Array.isArray(files)) {
    return files.map(file => {
      if (typeof file === 'string') return file;
      if (typeof file === 'object' && file !== null) {
        // Handle { file: 'path' } format
        if ('file' in file && typeof (file as Record<string, unknown>).file === 'string') {
          return (file as Record<string, unknown>).file as string;
        }
        // Handle { path: 'path' } format
        if ('path' in file && typeof (file as Record<string, unknown>).path === 'string') {
          return (file as Record<string, unknown>).path as string;
        }
        // If object has file paths as keys, extract them
        const keys = Object.keys(file);
        if (keys.length > 0 && keys[0].includes('/')) {
          return keys.join(', ');
        }
        return JSON.stringify(file);
      }
      return String(file);
    }).filter(Boolean);
  }
  
  // If it's an object with file paths as keys (e.g., { 'src/file.ts': ..., 'src/other.ts': ... })
  if (typeof files === 'object' && files !== null) {
    const keys = Object.keys(files);
    // Check if keys look like file paths
    if (keys.some(k => k.includes('/'))) {
      return keys;
    }
  }
  
  return [];
};

const AITestFixDialog = ({ 
  open, 
  onOpenChange, 
  test, 
  fixResponse, 
  isLoading,
  onRegenerate 
}: AITestFixDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [showAffectedFiles, setShowAffectedFiles] = useState(false);
  
  // Normalize affected files to ensure they're strings
  const normalizedFiles = normalizeAffectedFiles(fixResponse?.affectedFiles);

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return <Badge className="bg-success/20 text-success border-success/30">High Confidence</Badge>;
      case 'Medium':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Medium Confidence</Badge>;
      case 'Low':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Low Confidence</Badge>;
      default:
        return null;
    }
  };

  const handleCopy = async () => {
    if (!fixResponse?.suggestedFix) return;
    
    try {
      await navigator.clipboard.writeText(fixResponse.suggestedFix);
      setCopied(true);
      toast.success('Fix copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Test Fix Suggestion
          </DialogTitle>
          {test && (
            <DialogDescription className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              <span className="font-mono text-xs">{test.test_file}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Analyzing test failure...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
            </div>
          ) : fixResponse ? (
            <div className="space-y-4">
              {/* Test Info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium text-sm">{test?.test_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{test?.test_category} test</div>
                </div>
                {getConfidenceBadge(fixResponse.confidence)}
              </div>

              {/* Explanation */}
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {fixResponse.explanation}
                </p>
              </div>

              {/* Suggested Fix */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-muted/50 border-b border-border">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Suggested Fix</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-success" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-4 text-xs font-mono overflow-x-auto bg-card whitespace-pre-wrap">
                  {typeof fixResponse.suggestedFix === 'string' 
                    ? fixResponse.suggestedFix 
                    : typeof fixResponse.suggestedFix === 'object' && fixResponse.suggestedFix !== null
                      ? JSON.stringify(fixResponse.suggestedFix, null, 2)
                      : 'No specific code fix suggested.'}
                </pre>
              </div>

              {/* Affected Files */}
              {normalizedFiles.length > 0 && (
                <Collapsible open={showAffectedFiles} onOpenChange={setShowAffectedFiles}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {showAffectedFiles ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>{normalizedFiles.length} affected file(s)</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-1">
                      {normalizedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs font-mono">
                          <FileCode className="h-3 w-3 text-muted-foreground" />
                          {file}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-4 opacity-50" />
              <p>No fix suggestion available</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!fixResponse?.suggestedFix || isLoading}
            className="gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy Fix
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AITestFixDialog;
