import { useState, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Clock, User, History, FileText, PanelRightClose, PanelRightOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import { useIsMobile } from "@/hooks/use-mobile";
import { WikiMarkdownRenderer } from "./WikiMarkdownRenderer";
import { WikiTableOfContents } from "./WikiTableOfContents";

interface WikiPage {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  updated_by: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
}

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

interface WikiContentProps {
  page: WikiPage | null;
  versions: WikiPageVersion[];
  onSave: (pageId: string, title: string, content: string) => Promise<void>;
  canEdit: boolean;
  isLoading: boolean;
  organizationId: string | undefined;
  pendingNavigation?: { type: 'page' | 'folder' | 'home'; id?: string } | null;
  onNavigationConfirm?: () => void;
  onNavigationCancel?: () => void;
  onBack?: () => void;
}

// Expose methods to parent via ref
export interface WikiContentHandle {
  hasUnsavedChanges: () => boolean;
}

export const WikiContent = forwardRef<WikiContentHandle, WikiContentProps>(({ 
  page, 
  versions, 
  canEdit, 
  isLoading,
  onBack,
}, ref) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showToc, setShowToc] = useState(true);
  const { formatDateTime } = useFormattedDate();

  // No unsaved changes in view mode - editing happens on separate page
  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () => false
  }), []);

  const handleStartEdit = () => {
    if (page) {
      navigate(`/wiki/edit/${page.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg">Select a page to view</p>
        <p className="text-sm mt-1">Or create a new page from the sidebar</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Mobile back button */}
            {isMobile && onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <h1 className={`font-bold truncate ${isMobile ? 'text-xl' : 'text-2xl'}`}>{page.title}</h1>
            <div className={`flex items-center gap-4 mt-2 text-sm text-muted-foreground ${isMobile ? 'flex-wrap gap-2' : ''}`}>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="truncate">Updated {formatDateTime(page.updated_at)}</span>
              </div>
              {page.updated_by && !isMobile && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>by {page.updated_by.profiles.full_name}</span>
                </div>
              )}
            </div>
          </div>
          {/* Only show edit and history on desktop */}
          {!isMobile && (
            <div className="flex items-center gap-2">
              {versions.length > 0 && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Version History</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                      <div className="space-y-4">
                        {versions.map((version) => (
                          <div key={version.id} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={version.edited_by.profiles.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {version.edited_by.profiles.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{version.edited_by.profiles.full_name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {formatDateTime(version.created_at)}
                            </p>
                            <p className="text-sm font-medium">{version.title}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}
              {canEdit && (
                <Button size="sm" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {page.content ? (
          <div className="flex gap-6 relative">
            {/* Main content */}
            <div className="flex-1 min-w-0 transition-all duration-300">
              <WikiMarkdownRenderer content={page.content} />
            </div>
            {/* Table of Contents with toggle - only show on larger screens */}
            <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${showToc ? 'w-64' : 'w-8'}`}>
              <div className="sticky top-6 flex max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* TOC Toggle Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowToc(!showToc)}
                  className="h-8 w-8 p-0 flex-shrink-0 hover:bg-muted border-r"
                  title={showToc ? "Hide Table of Contents" : "Show Table of Contents"}
                >
                  {showToc ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
                {/* TOC Content */}
                <div className={`transition-all duration-300 overflow-hidden ${showToc ? 'w-56 opacity-100 ml-2' : 'w-0 opacity-0'}`}>
                  <WikiTableOfContents content={page.content} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground italic">This page has no content yet.</p>
        )}
      </div>
    </div>
  );
});

WikiContent.displayName = "WikiContent";
