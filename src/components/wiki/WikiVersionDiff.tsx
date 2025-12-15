import { useState } from "react";
import { RotateCcw, ArrowLeft, ArrowRight, Eye, SplitSquareHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WikiPageVersion {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  edited_by: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface CurrentPage {
  id: string;
  title: string;
  content: string | null;
}

interface WikiVersionDiffProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: WikiPageVersion;
  currentPage: CurrentPage;
  onRestore: (version: WikiPageVersion) => void;
  isRestoring?: boolean;
  formatDateTime: (date: string) => string;
}

// Simple text diff function
const getDiff = (oldText: string, newText: string): { type: 'added' | 'removed' | 'unchanged'; text: string }[] => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];
  
  // Simple line-by-line comparison
  const maxLength = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    
    if (oldLine === undefined) {
      result.push({ type: 'added', text: newLine });
    } else if (newLine === undefined) {
      result.push({ type: 'removed', text: oldLine });
    } else if (oldLine === newLine) {
      result.push({ type: 'unchanged', text: oldLine });
    } else {
      result.push({ type: 'removed', text: oldLine });
      result.push({ type: 'added', text: newLine });
    }
  }
  
  return result;
};

// Strip HTML tags for text comparison
const stripHtml = (html: string | null): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

export const WikiVersionDiff = ({
  open,
  onOpenChange,
  version,
  currentPage,
  onRestore,
  isRestoring = false,
  formatDateTime,
}: WikiVersionDiffProps) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'preview'>('side-by-side');

  const versionContent = version.content || '';
  const currentContent = currentPage.content || '';
  
  // Get diff for side-by-side view
  const diff = getDiff(stripHtml(versionContent), stripHtml(currentContent));

  const handleRestore = () => {
    onRestore(version);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Compare Version
            <Badge variant="secondary" className="font-normal">
              {formatDateTime(version.created_at)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Edited by {version.edited_by.profiles.full_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'side-by-side' | 'preview')} className="flex-1 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="side-by-side" className="gap-1">
              <SplitSquareHorizontal className="h-4 w-4" />
              Side by Side
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1">
              <Eye className="h-4 w-4" />
              Preview Version
            </TabsTrigger>
          </TabsList>

          <TabsContent value="side-by-side" className="flex-1 mt-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Old version (the version being compared) */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <ArrowLeft className="h-4 w-4" />
                  Previous Version
                  <Badge variant="outline" className="text-xs">
                    {version.title}
                  </Badge>
                </div>
                <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30">
                  <div className="font-mono text-sm whitespace-pre-wrap">
                    {stripHtml(versionContent) || <span className="text-muted-foreground italic">No content</span>}
                  </div>
                </ScrollArea>
              </div>

              {/* Current version */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <ArrowRight className="h-4 w-4" />
                  Current Version
                  <Badge variant="outline" className="text-xs">
                    {currentPage.title}
                  </Badge>
                </div>
                <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30">
                  <div className="font-mono text-sm whitespace-pre-wrap">
                    {stripHtml(currentContent) || <span className="text-muted-foreground italic">No content</span>}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 mt-4">
            <ScrollArea className="h-full border rounded-md p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <h2 className="text-lg font-semibold mb-4">{version.title}</h2>
                <div 
                  dangerouslySetInnerHTML={{ __html: versionContent }} 
                  className="wiki-content"
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleRestore} disabled={isRestoring} className="gap-1">
            <RotateCcw className="h-4 w-4" />
            {isRestoring ? "Restoring..." : "Restore This Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
