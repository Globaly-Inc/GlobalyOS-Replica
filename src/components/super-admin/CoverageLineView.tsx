import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FileCoverage {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  uncoveredLines: number[];
}

interface CoverageLineViewProps {
  filePath: string;
  coverage: FileCoverage;
}

function getCoverageColor(coverage: number): string {
  if (coverage >= 80) return 'text-success';
  if (coverage >= 60) return 'text-warning';
  return 'text-destructive';
}

const CoverageLineView = ({ filePath, coverage }: CoverageLineViewProps) => {
  // Generate line representation (simulated since we don't have actual source)
  const totalLines = Math.max(50, ...coverage.uncoveredLines, 0);
  const lines = Array.from({ length: totalLines }, (_, i) => i + 1);
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-muted/30">
        <div className="font-mono text-sm font-medium truncate">{filePath}</div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className={cn(getCoverageColor(coverage.lines))}>
            Lines: {coverage.lines}%
          </Badge>
          <Badge variant="outline" className={cn(getCoverageColor(coverage.functions))}>
            Functions: {coverage.functions}%
          </Badge>
          <Badge variant="outline" className={cn(getCoverageColor(coverage.branches))}>
            Branches: {coverage.branches}%
          </Badge>
          <Badge variant="outline" className={cn(getCoverageColor(coverage.statements))}>
            Statements: {coverage.statements}%
          </Badge>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          <div className="font-mono text-xs">
            {lines.map((lineNum) => {
              const isUncovered = coverage.uncoveredLines.includes(lineNum);
              return (
                <div
                  key={lineNum}
                  className={cn(
                    'flex items-center py-0.5 px-2 rounded-sm',
                    isUncovered ? 'bg-destructive/10' : 'hover:bg-muted/50'
                  )}
                >
                  <span className="w-8 text-right text-muted-foreground mr-4 select-none">
                    {lineNum}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      isUncovered ? 'bg-destructive' : 'bg-success'
                    )} />
                    <span className="text-muted-foreground/60">
                      {isUncovered 
                        ? `// Line ${lineNum} - NOT COVERED` 
                        : `// Line ${lineNum} - covered`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
      
      {coverage.uncoveredLines.length > 0 && (
        <div className="p-3 border-t bg-destructive/5">
          <div className="text-xs font-medium text-destructive mb-1">
            Uncovered Lines ({coverage.uncoveredLines.length})
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {coverage.uncoveredLines.slice(0, 30).join(', ')}
            {coverage.uncoveredLines.length > 30 && ` ... and ${coverage.uncoveredLines.length - 30} more`}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverageLineView;
