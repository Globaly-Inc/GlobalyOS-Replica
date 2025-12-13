import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { Pencil, Save, X, Clock, User, History, FileText, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import { WikiRichEditor } from "./WikiRichEditor";
import { WikiMarkdownRenderer } from "./WikiMarkdownRenderer";
import { WikiTableOfContents } from "./WikiTableOfContents";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  onEditingStateChange?: (isEditing: boolean, hasUnsavedChanges: boolean) => void;
  pendingNavigation?: { type: 'page' | 'folder' | 'home'; id?: string } | null;
  onNavigationConfirm?: () => void;
  onNavigationCancel?: () => void;
}

export const WikiContent = ({ 
  page, 
  versions, 
  onSave, 
  canEdit, 
  isLoading, 
  organizationId,
  onEditingStateChange,
  pendingNavigation,
  onNavigationConfirm,
  onNavigationCancel,
}: WikiContentProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const { formatDateTime } = useFormattedDate();
  
  // Ref to store the callback for synchronous access
  const onEditingStateChangeRef = useRef(onEditingStateChange);
  onEditingStateChangeRef.current = onEditingStateChange;

  // Check if there are unsaved changes
  const hasUnsavedChanges = isEditing && page && (
    editTitle !== page.title || editContent !== (page.content || "")
  );

  // Use useLayoutEffect to notify parent SYNCHRONOUSLY before browser paints
  // This ensures the parent has the latest state before any click handlers run
  useLayoutEffect(() => {
    onEditingStateChangeRef.current?.(isEditing, !!hasUnsavedChanges);
  }, [isEditing, hasUnsavedChanges]);

  // Handle browser beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleStartEdit = () => {
    if (page) {
      setEditTitle(page.title);
      setEditContent(page.content || "");
      setIsEditing(true);
      // Immediately notify parent - no unsaved changes yet since we just started
      onEditingStateChangeRef.current?.(true, false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
    // Immediately notify parent - no longer editing
    onEditingStateChangeRef.current?.(false, false);
  };

  // Wrapper handlers that immediately notify parent of changes
  const handleTitleChange = useCallback((newTitle: string) => {
    setEditTitle(newTitle);
    // Immediately compute and notify parent of unsaved changes
    if (page) {
      const hasChanges = newTitle !== page.title || editContent !== (page.content || "");
      onEditingStateChangeRef.current?.(true, hasChanges);
    }
  }, [page, editContent]);

  const handleContentChange = useCallback((newContent: string) => {
    setEditContent(newContent);
    // Immediately compute and notify parent of unsaved changes
    if (page) {
      const hasChanges = editTitle !== page.title || newContent !== (page.content || "");
      onEditingStateChangeRef.current?.(true, hasChanges);
    }
  }, [page, editTitle]);

  const handleSave = async () => {
    if (page && editTitle.trim()) {
      setIsSaving(true);
      try {
        await onSave(page.id, editTitle.trim(), editContent);
        setIsEditing(false);
        // Immediately notify parent - no longer editing
        onEditingStateChangeRef.current?.(false, false);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveAndNavigate = async () => {
    if (page && editTitle.trim()) {
      setIsSaving(true);
      try {
        await onSave(page.id, editTitle.trim(), editContent);
        setIsEditing(false);
        // Immediately notify parent - no longer editing
        onEditingStateChangeRef.current?.(false, false);
        onNavigationConfirm?.();
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDiscardAndNavigate = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
    // Immediately notify parent - no longer editing
    onEditingStateChangeRef.current?.(false, false);
    onNavigationConfirm?.();
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        
        {/* Unsaved Changes Dialog */}
        <AlertDialog open={!!pendingNavigation} onOpenChange={(open) => !open && onNavigationCancel?.()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Would you like to save them before leaving this page?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel onClick={onNavigationCancel}>Cancel</AlertDialogCancel>
              <Button variant="outline" onClick={handleDiscardAndNavigate}>
                Discard
              </Button>
              <AlertDialogAction onClick={handleSaveAndNavigate} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save & Continue"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
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
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-2xl font-bold h-auto py-1"
                placeholder="Page title..."
              />
            ) : (
              <h1 className="text-2xl font-bold">{page.title}</h1>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Updated {formatDateTime(page.updated_at)}</span>
              </div>
              {page.updated_by && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>by {page.updated_by.profiles.full_name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving || !editTitle.trim()}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <WikiRichEditor
            value={editContent}
            onChange={handleContentChange}
            organizationId={organizationId}
            placeholder="Start writing..."
            minHeight="400px"
          />
        ) : page.content ? (
          <div className="flex gap-6 relative">
            {/* Main content */}
            <div className={`flex-1 min-w-0 transition-all duration-300`}>
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

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={!!pendingNavigation && hasUnsavedChanges} onOpenChange={(open) => !open && onNavigationCancel?.()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before leaving this page?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={onNavigationCancel}>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleDiscardAndNavigate}>
              Discard
            </Button>
            <AlertDialogAction onClick={handleSaveAndNavigate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save & Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};