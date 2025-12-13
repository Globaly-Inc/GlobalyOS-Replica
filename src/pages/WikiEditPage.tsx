import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { WikiRichEditor } from "@/components/wiki/WikiRichEditor";
import { toast } from "sonner";
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

const WikiEditPage = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { currentOrg } = useOrganization();
  const { isAdmin, isHR, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const canEdit = isAdmin || isHR;

  // Fetch page details
  const { data: page, isLoading } = useQuery({
    queryKey: ["wiki-page", pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const { data, error } = await supabase
        .from("wiki_pages")
        .select("id, title, content, folder_id")
        .eq("id", pageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!pageId,
  });

  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      return data;
    },
  });

  // Initialize form values when page loads
  useEffect(() => {
    if (page && !hasInitialized) {
      setEditTitle(page.title);
      setEditContent(page.content || "");
      setHasInitialized(true);
    }
  }, [page, hasInitialized]);

  // Check for unsaved changes
  const hasUnsavedChanges = hasInitialized && page && (
    editTitle !== page.title || editContent !== (page.content || "")
  );

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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pageId || !currentEmployee?.id || !currentOrg?.id) {
        throw new Error("Not authenticated");
      }

      // Save current version to history
      const { data: currentPage } = await supabase
        .from("wiki_pages")
        .select("title, content")
        .eq("id", pageId)
        .single();

      if (currentPage) {
        await supabase.from("wiki_page_versions").insert({
          page_id: pageId,
          organization_id: currentOrg.id,
          title: currentPage.title,
          content: currentPage.content,
          edited_by: currentEmployee.id,
        });
      }

      // Update page
      const { error } = await supabase
        .from("wiki_pages")
        .update({ 
          title: editTitle.trim(), 
          content: editContent, 
          updated_by: currentEmployee.id 
        })
        .eq("id", pageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-page"] });
      queryClient.invalidateQueries({ queryKey: ["wiki-pages-list"] });
      queryClient.invalidateQueries({ queryKey: ["wiki-page-versions"] });
      toast.success("Page saved");
    },
    onError: () => {
      toast.error("Failed to save page");
    },
  });

  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error("Page title is required");
      return;
    }
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (!editTitle.trim()) {
      toast.error("Page title is required");
      return;
    }
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync();
      navigateOrg("/wiki");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      navigateOrg("/wiki");
    }
  };

  const handleDiscardAndClose = () => {
    setShowExitDialog(false);
    navigateOrg("/wiki");
  };

  const handleContentChange = useCallback((value: string) => {
    setEditContent(value);
  }, []);

  // Redirect if user can't edit (only after role has loaded)
  useEffect(() => {
    if (!isLoading && !roleLoading && !canEdit) {
      toast.error("You don't have permission to edit this page");
      navigateOrg("/wiki");
    }
  }, [isLoading, roleLoading, canEdit, navigateOrg]);

  if (isLoading || roleLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <p className="text-muted-foreground mb-4">Page not found</p>
        <Button onClick={() => navigateOrg("/wiki")}>Back to Wiki</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Page Title */}
          <div className="flex-1 max-w-2xl">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-xl font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-1"
              placeholder="Page title..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClose}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-1.5" />
              Close
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveAndClose}
              disabled={isSaving || !editTitle.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save & Close
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <WikiRichEditor
            value={editContent}
            onChange={handleContentChange}
            organizationId={currentOrg?.id}
            placeholder="Start writing your content..."
            minHeight="calc(100vh - 200px)"
          />
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleDiscardAndClose}>
              Discard
            </Button>
            <AlertDialogAction onClick={handleSaveAndClose} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save & Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WikiEditPage;
