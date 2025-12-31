import { useState, useMemo } from 'react';
import { Sparkles, Copy, Check, ExternalLink, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SupportRequest, SupportRequestComment } from '@/types/support';
import { generateLovableContent, LovablePromptSection } from '@/utils/generateLovablePrompt';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LovablePromptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: SupportRequest;
  comments: SupportRequestComment[];
  onConfirm: (finalPrompt: string) => void;
}

export const LovablePromptPreviewDialog = ({
  open,
  onOpenChange,
  request,
  comments,
  onConfirm,
}: LovablePromptPreviewDialogProps) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    description: true,
    securityGuidelines: true,
  });
  
  // Collect attachment URLs from comments
  const attachmentUrls = useMemo(() => 
    comments
      .filter(c => c.attachment_url)
      .map(c => c.attachment_url!),
    [comments]
  );
  
  // Generate initial content
  const initialContent = useMemo(() => 
    generateLovableContent({ request, comments, attachmentUrls }),
    [request, comments, attachmentUrls]
  );
  
  // Build current prompt with any edits
  const currentPrompt = useMemo(() => {
    return initialContent.sections
      .map(section => editedSections[section.id] ?? section.content)
      .join('\n\n');
  }, [initialContent.sections, editedSections]);
  
  const handleCopy = async (text: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };
  
  const handleSectionEdit = (sectionId: string, newContent: string) => {
    setEditedSections(prev => ({
      ...prev,
      [sectionId]: newContent
    }));
  };
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  const handleConfirm = () => {
    onConfirm(currentPrompt);
  };
  
  const handleCopyOnly = async () => {
    await handleCopy(currentPrompt, 'full');
  };
  
  const getSectionContent = (section: LovablePromptSection): string => {
    return editedSections[section.id] ?? section.content;
  };
  
  const imageCount = initialContent.imageUrls.length;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[70vw] h-[90vh] sm:h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b">
          <Sparkles className="h-5 w-5 text-primary" />
          <DialogTitle className="text-lg font-semibold">
            Prompt Preview for Lovable
          </DialogTitle>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="full" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 sm:mx-6 mt-4 w-fit">
            <TabsTrigger value="full" className="text-xs sm:text-sm">Full Prompt</TabsTrigger>
            <TabsTrigger value="sections" className="text-xs sm:text-sm">Edit Sections</TabsTrigger>
            <TabsTrigger value="images" className="text-xs sm:text-sm">
              Images
              {imageCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 text-xs">
                  {imageCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Full Prompt Tab */}
          <TabsContent value="full" className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pb-4 mt-4">
            <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
              <ScrollArea className="h-full">
                <pre className="p-4 text-xs sm:text-sm whitespace-pre-wrap break-words font-mono bg-muted/30">
                  {currentPrompt}
                </pre>
              </ScrollArea>
            </div>
            <div className="flex justify-end mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(currentPrompt, 'full')}
                className="gap-1.5"
              >
                {copiedSection === 'full' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy Full Prompt
              </Button>
            </div>
          </TabsContent>
          
          {/* Edit Sections Tab */}
          <TabsContent value="sections" className="flex-1 min-h-0 px-4 sm:px-6 pb-4 mt-4">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                {initialContent.sections.map((section) => (
                  <Collapsible
                    key={section.id}
                    open={expandedSections[section.id]}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <div className="border rounded-md">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{section.title}</span>
                            {section.editable && (
                              <Badge variant="outline" className="text-xs">
                                Editable
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(getSectionContent(section), section.id);
                              }}
                            >
                              {copiedSection === section.id ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {expandedSections[section.id] ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-3 pb-3">
                          {section.editable ? (
                            <Textarea
                              value={getSectionContent(section)}
                              onChange={(e) => handleSectionEdit(section.id, e.target.value)}
                              className="min-h-[120px] text-xs sm:text-sm font-mono resize-y"
                            />
                          ) : (
                            <pre className="text-xs sm:text-sm whitespace-pre-wrap break-words font-mono bg-muted/30 p-3 rounded-md max-h-[200px] overflow-auto">
                              {getSectionContent(section)}
                            </pre>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Images Tab */}
          <TabsContent value="images" className="flex-1 min-h-0 px-4 sm:px-6 pb-4 mt-4">
            <ScrollArea className="h-full">
              {imageCount > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                  {initialContent.imageUrls.map((url, index) => (
                    <div 
                      key={index} 
                      className="border rounded-md overflow-hidden"
                    >
                      <div className="aspect-video bg-muted/30 relative">
                        <img
                          src={url}
                          alt={`Attachment ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="p-2 flex items-center justify-between gap-2 border-t">
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          Image {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleCopy(url, `image-${index}`)}
                        >
                          {copiedSection === `image-${index}` ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No images attached</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        {/* Footer */}
        <div className="border-t px-4 sm:px-6 py-4">
          <p className="text-xs text-muted-foreground mb-3 text-center sm:text-left">
            Paste this prompt in Lovable chat after opening the project
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCopyOnly}
              className="gap-1.5"
            >
              {copiedSection === 'full' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy Only
            </Button>
            <Button
              onClick={handleConfirm}
              className="gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              Copy &amp; Open Lovable
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
