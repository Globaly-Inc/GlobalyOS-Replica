import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  FileText,
  Wand2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ErrorLog } from '@/types/errorLogs';
import { generateErrorResolutionPrompt, generatePromptSummary } from '@/utils/generateErrorResolutionPrompt';

interface ErrorResolutionAIDialogProps {
  log: ErrorLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyToNotes?: (text: string) => void;
}

const ErrorResolutionAIDialog = ({ 
  log, 
  open, 
  onOpenChange,
  onApplyToNotes 
}: ErrorResolutionAIDialogProps) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('prompt');
  const responseRef = useRef<HTMLDivElement>(null);

  // Generate prompt when dialog opens
  useEffect(() => {
    if (open && log) {
      setPrompt(generateErrorResolutionPrompt(log));
      setResponse('');
      setActiveTab('prompt');
    }
  }, [open, log]);

  // Auto-scroll response as it streams
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setResponse('');
    setActiveTab('response');

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-error`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt, errorId: log.id }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (resp.status === 402) {
          throw new Error('AI credits exhausted. Please add more credits.');
        }
        throw new Error('Failed to analyze error');
      }

      if (!resp.body) {
        throw new Error('No response body');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              setResponse((prev) => prev + content);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze error');
      setResponse('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleApplyToNotes = () => {
    if (onApplyToNotes && response) {
      onApplyToNotes(response);
      toast.success('Applied to resolution notes');
      onOpenChange(false);
    }
  };

  const promptSummary = generatePromptSummary(log);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Error Analysis
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Prompt
            </TabsTrigger>
            <TabsTrigger value="response" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              AI Response
              {response && <Badge variant="secondary" className="ml-1 text-xs">Ready</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Prompt Summary */}
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Prompt Summary</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullPrompt(!showFullPrompt)}
                >
                  {showFullPrompt ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show Full Prompt
                    </>
                  )}
                </Button>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {promptSummary}
              </pre>
            </div>

            {/* Full Prompt Editor */}
            {showFullPrompt && (
              <div className="flex-1 min-h-0 mb-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-full min-h-[300px] font-mono text-xs resize-none"
                  placeholder="Edit the prompt to customize the analysis..."
                />
              </div>
            )}

            <Button 
              onClick={handleAnalyze} 
              disabled={isLoading || !prompt}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get AI Analysis
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="response" className="flex-1 flex flex-col min-h-0 mt-4">
            {response ? (
              <>
                <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded-lg [&>div]:!block">
                  <div 
                    ref={responseRef}
                    className="p-4 prose prose-sm dark:prose-invert max-w-none"
                  >
                    <div className="whitespace-pre-wrap font-sans text-sm">
                      {response}
                    </div>
                    {isLoading && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    )}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Response
                      </>
                    )}
                  </Button>
                  {onApplyToNotes && (
                    <Button
                      onClick={handleApplyToNotes}
                      disabled={isLoading || !response}
                      className="flex-1"
                    >
                      Apply to Resolution Notes
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span>Analyzing error...</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Click "Get AI Analysis" to generate resolution suggestions</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorResolutionAIDialog;
