import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Sparkles, FileCode, Copy, Check, ChevronDown, ChevronRight, RefreshCw, Target } from 'lucide-react';
import { toast } from 'sonner';

interface CoverageSuggestion {
  file: string;
  currentCoverage: number;
  suggestions: Array<{
    testDescription: string;
    testCode: string;
    priority: 'high' | 'medium' | 'low';
    targetLines?: number[];
  }>;
}

interface AICoverageSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: CoverageSuggestion[] | null;
  isLoading: boolean;
  onRegenerate: () => void;
}

const AICoverageSuggestionDialog = ({
  open,
  onOpenChange,
  suggestions,
  isLoading,
  onRegenerate,
}: AICoverageSuggestionDialogProps) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleFile = (file: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Coverage Suggestions
          </DialogTitle>
          <DialogDescription>
            AI-generated test suggestions to improve your code coverage to 100%
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing coverage gaps...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Found {suggestions.reduce((acc, s) => acc + s.suggestions.length, 0)} suggestions across {suggestions.length} files
              </div>
              <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4 pr-4">
                {suggestions.map((fileSuggestion) => {
                  const isExpanded = expandedFiles.has(fileSuggestion.file);
                  return (
                    <Collapsible
                      key={fileSuggestion.file}
                      open={isExpanded}
                      onOpenChange={() => toggleFile(fileSuggestion.file)}
                    >
                      <CollapsibleTrigger className="w-full text-left">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors gap-3 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                            <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-mono text-sm truncate min-w-0" title={fileSuggestion.file}>
                              {fileSuggestion.file}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="gap-1 whitespace-nowrap">
                              <Target className="h-3 w-3" />
                              {fileSuggestion.currentCoverage}% → 100%
                            </Badge>
                            <Badge variant="secondary" className="whitespace-nowrap">
                              {fileSuggestion.suggestions.length} suggestions
                            </Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden">
                        <div className="ml-6 mt-2 space-y-3 overflow-hidden">
                          {fileSuggestion.suggestions.map((suggestion, idx) => {
                            const suggestionId = `${fileSuggestion.file}-${idx}`;
                            return (
                              <div
                                key={suggestionId}
                                className="border rounded-lg overflow-hidden"
                              >
                                <div className="p-3 bg-muted/30 flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className={getPriorityColor(suggestion.priority)}
                                      >
                                        {suggestion.priority} priority
                                      </Badge>
                                      {suggestion.targetLines && (
                                        <span className="text-xs text-muted-foreground">
                                          Lines: {suggestion.targetLines.slice(0, 5).join(', ')}
                                          {suggestion.targetLines.length > 5 && '...'}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm">{suggestion.testDescription}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() => handleCopyCode(suggestion.testCode, suggestionId)}
                                  >
                                    {copiedId === suggestionId ? (
                                      <Check className="h-4 w-4 text-success" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                <div className="overflow-x-auto max-w-full">
                                  <pre className="p-3 text-xs font-mono bg-muted/10 whitespace-pre-wrap break-all">
                                    {suggestion.testCode}
                                  </pre>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Target className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No coverage suggestions available</p>
            <p className="text-xs mt-1">Generate a coverage report first, then request AI suggestions</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AICoverageSuggestionDialog;
