import { useState, useImperativeHandle, forwardRef } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Pencil, Clock, User, History, PanelRightClose, PanelRightOpen, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import { useIsMobile } from "@/hooks/use-mobile";
import { WikiMarkdownRenderer } from "./WikiMarkdownRenderer";
import { WikiTableOfContents } from "./WikiTableOfContents";
import { WikiVersionDiff } from "./WikiVersionDiff";
import { WikiBreadcrumb } from "./WikiBreadcrumb";
import { WikiEmptyState } from "./WikiEmptyState";
import { WikiLoadingSkeleton } from "./WikiLoadingSkeleton";
import { WikiExportMenu } from "./WikiExportMenu";
import { WikiComments } from "./WikiComments";

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

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface WikiContentProps {
  page: WikiPage | null;
  versions: WikiPageVersion[];
  folders?: WikiFolder[];
  onSave: (pageId: string, title: string, content: string) => Promise<void>;
  canEdit: boolean;
  isLoading: boolean;
  organizationId: string | undefined;
  pendingNavigation?: { type: 'page' | 'folder' | 'home'; id?: string } | null;
  onNavigationConfirm?: () => void;
  onNavigationCancel?: () => void;
  onBack?: () => void;
  onRestoreVersion?: (pageId: string, versionTitle: string, versionContent: string | null) => void;
  isRestoring?: boolean;
  onSelectFolder?: (folderId: string | null) => void;
  onSelectHome?: () => void;
  currentEmployeeId?: string;
}

// Expose methods to parent via ref
export interface WikiContentHandle {
  hasUnsavedChanges: () => boolean;
}

export const WikiContent = forwardRef<WikiContentHandle, WikiContentProps>(({ 
  page, 
  versions,
  folders = [],
  canEdit, 
  isLoading,
  onBack,
  onRestoreVersion,
  isRestoring = false,
  onSelectFolder,
  onSelectHome,
  currentEmployeeId,
}, ref) => {
  const { navigateOrg } = useOrgNavigation();
  const isMobile = useIsMobile();
  const [showToc, setShowToc] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<WikiPageVersion | null>(null);
  const { formatDateTime } = useFormattedDate();

  // No unsaved changes in view mode - editing happens on separate page
  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () => false
  }), []);

  const handleStartEdit = () => {
    if (page) {
      navigateOrg(`/wiki/edit/${page.id}`);
    }
  };

  const handleRestoreVersion = (version: WikiPageVersion) => {
    if (page && onRestoreVersion) {
      onRestoreVersion(page.id, version.title, version.content);
      setSelectedVersion(null);
    }
  };

  if (isLoading) {
    return <WikiLoadingSkeleton type="page" />;
  }

  if (!page) {
    return <WikiEmptyState type="page" />;
  }

  // Get the folder ID for the current page to show in breadcrumb
  const currentFolderId = (page as WikiPage & { folder_id?: string | null }).folder_id || null;

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb - desktop only */}
      {!isMobile && onSelectFolder && onSelectHome && folders.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <WikiBreadcrumb
            folders={folders}
            currentFolderId={currentFolderId}
            pageTitle={page.title}
            onSelectFolder={onSelectFolder}
            onSelectHome={onSelectHome}
          />
        </div>
      )}
      
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
          <div className="flex items-center gap-2">
            {/* Export menu */}
            <WikiExportMenu pageTitle={page.title} pageContent={page.content} isMobile={isMobile} />
            {versions.length > 0 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4" />
                    {!isMobile && <span className="ml-1">History</span>}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Version History</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                    <div className="space-y-4">
                      {versions.map((version) => (
                        <div 
                          key={version.id} 
                          className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedVersion(version)}
                        >
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersion(version);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            View & Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            )}
            {canEdit && (
              <Button size="sm" onClick={handleStartEdit}>
                <Pencil className="h-4 w-4" />
                {!isMobile && <span className="ml-1">Edit</span>}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {page.content ? (
          <div className="flex gap-6 relative">
            {/* Main content */}
            <div className="flex-1 min-w-0 transition-all duration-300">
              <WikiMarkdownRenderer content={page.content} />
              {/* Comments section */}
              <WikiComments pageId={page.id} currentEmployeeId={currentEmployeeId} />
            </div>
            {/* Table of Contents with toggle - only show on larger screens */}
            <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${showToc ? 'w-64' : 'w-8'}`}>
              <div className="sticky top-6 flex max-h-[calc(100vh-12rem)] overflow-y-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowToc(!showToc)}
                  className="h-8 w-8 p-0 flex-shrink-0 hover:bg-muted border-r"
                  title={showToc ? "Hide Table of Contents" : "Show Table of Contents"}
                >
                  {showToc ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
                <div className={`transition-all duration-300 overflow-hidden ${showToc ? 'w-56 opacity-100 ml-2' : 'w-0 opacity-0'}`}>
                  <WikiTableOfContents content={page.content} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground italic">This page has no content yet.</p>
        )}

      {/* Version Diff Dialog */}
      {selectedVersion && (
        <WikiVersionDiff
          open={!!selectedVersion}
          onOpenChange={(open) => !open && setSelectedVersion(null)}
          version={selectedVersion}
          currentPage={{ id: page.id, title: page.title, content: page.content }}
          onRestore={handleRestoreVersion}
          isRestoring={isRestoring}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
});

WikiContent.displayName = "WikiContent";
