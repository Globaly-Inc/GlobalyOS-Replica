import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import DOMPurify from "dompurify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useWikiTemplatesGrouped, WikiTemplate } from "@/hooks/useWikiTemplates";
import { Skeleton } from "@/components/ui/skeleton";
import * as LucideIcons from "lucide-react";

// Category display configuration
const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  general: { label: "General", icon: "FileText" },
  policies: { label: "Policies", icon: "Shield" },
  sops: { label: "SOPs", icon: "ListChecks" },
  business_plans: { label: "Business Plans", icon: "Target" },
  hr_documents: { label: "HR Documents", icon: "Users" },
  compliance: { label: "Compliance", icon: "CheckCircle" },
  operations: { label: "Operations", icon: "Settings" },
};

// Dynamic icon component
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[name] || LucideIcons.FileText;
  return <IconComponent className={className} />;
};

interface WikiTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (title: string, content: string) => void;
}

export const WikiTemplatesDialog = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: WikiTemplatesDialogProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WikiTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const { grouped, templates, isLoading, isError } = useWikiTemplatesGrouped();

  // Get unique categories from templates
  const categories = Object.keys(grouped).sort((a, b) => {
    // Put "general" first
    if (a === "general") return -1;
    if (b === "general") return 1;
    return (CATEGORY_CONFIG[a]?.label || a).localeCompare(CATEGORY_CONFIG[b]?.label || b);
  });

  const handleSelect = () => {
    if (selectedTemplate) {
      const title = selectedTemplate.id.startsWith("builtin-blank") 
        ? "Untitled Page" 
        : selectedTemplate.name;
      onSelectTemplate(title, selectedTemplate.content || "");
      onOpenChange(false);
      setSelectedTemplate(null);
      setActiveCategory("all");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedTemplate(null);
    setActiveCategory("all");
    setFocusedIndex(0);
  };

  // Filter templates by category
  const displayedTemplates = activeCategory === "all" 
    ? templates 
    : (grouped[activeCategory] || []);

  // Reset focus when category changes
  useEffect(() => {
    setFocusedIndex(0);
    if (displayedTemplates.length > 0) {
      setSelectedTemplate(displayedTemplates[0]);
    }
  }, [activeCategory, displayedTemplates.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!displayedTemplates.length) return;

    const cols = 3; // Grid has 3 columns on md+
    const total = displayedTemplates.length;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev + 1) % total;
          setSelectedTemplate(displayedTemplates[next]);
          return next;
        });
        break;
      case "ArrowLeft":
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev - 1 + total) % total;
          setSelectedTemplate(displayedTemplates[next]);
          return next;
        });
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = Math.min(prev + cols, total - 1);
          setSelectedTemplate(displayedTemplates[next]);
          return next;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = Math.max(prev - cols, 0);
          setSelectedTemplate(displayedTemplates[next]);
          return next;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (selectedTemplate) {
          handleSelect();
        }
        break;
      case "Escape":
        e.preventDefault();
        handleClose();
        break;
    }
  }, [displayedTemplates, selectedTemplate]);

  // Sanitize HTML content for preview
  const sanitizeContent = (content: string) => {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'pre', 'code'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-3xl max-h-[85vh] flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Choose a Template
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 space-y-4">
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load templates</p>
            <p className="text-sm mt-1">Using default templates</p>
          </div>
        ) : (
          <>
            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  All ({templates.length})
                </TabsTrigger>
                {categories.map((category) => {
                  const config = CATEGORY_CONFIG[category] || { label: category, icon: "FileText" };
                  const count = grouped[category]?.length || 0;
                  return (
                    <TabsTrigger 
                      key={category} 
                      value={category}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {config.label} ({count})
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            {/* Templates Grid */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
                {displayedTemplates.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No templates in this category</p>
                  </div>
                ) : (
                  displayedTemplates.map((template, index) => {
                    const isBlank = template.id.startsWith("builtin-blank");
                    const iconName = template.icon_name || "FileText";
                    const isSelected = selectedTemplate?.id === template.id;
                    const isFocused = focusedIndex === index;
                    
                    return (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setFocusedIndex(index);
                        }}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-lg border-2 transition-all text-left",
                          "hover:border-primary/50 hover:bg-muted/50",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : isFocused
                            ? "border-primary/30 bg-muted/30"
                            : "border-border"
                        )}
                        tabIndex={isFocused ? 0 : -1}
                      >
                        <div
                          className={cn(
                            "p-3 rounded-lg mb-2",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <DynamicIcon name={iconName} className="h-6 w-6" />
                        </div>
                        <span className="font-medium text-sm text-center line-clamp-2">
                          {template.name}
                        </span>
                        <span className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                          {template.description || (isBlank ? "Start with an empty page" : "No description")}
                        </span>
                        {template.tags && template.tags.length > 0 && !isBlank && (
                          <div className="flex flex-wrap gap-1 mt-2 justify-center">
                            {template.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Selected Template Preview */}
        {selectedTemplate && selectedTemplate.content && !selectedTemplate.id.startsWith("builtin-blank") && (
          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium mb-2">Preview:</p>
            <ScrollArea className="h-32 border rounded-md p-3 bg-muted/30">
              <div 
                className="text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeContent(selectedTemplate.content.slice(0, 500) + (selectedTemplate.content.length > 500 ? '...' : ''))
                }}
              />
            </ScrollArea>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedTemplate}>
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
