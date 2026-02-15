import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { X, Loader2, Check, Cloud, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { BlockNoteWikiEditor } from "@/components/wiki/BlockNoteWikiEditor";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useCollaborationColor } from "@/components/wiki/collaboration/useCollaborationColor";
import { WikiActiveEditors } from "@/components/wiki/collaboration/WikiActiveEditors";
import { SupabaseYjsProvider } from "@/components/wiki/collaboration/SupabaseYjsProvider";

import { toast } from "sonner";

const WikiEditPage = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { isAdmin, isHR, isOwner, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  // Track the last saved values to detect real changes
  const lastSavedRef = useRef<{ title: string; content: string }>({ title: "", content: "" });

  // Collaboration hooks
  const { data: currentEmployee } = useCurrentEmployee();
  const collaborationColor = useCollaborationColor(currentEmployee?.id);
  const userName = currentEmployee?.profiles?.full_name || "Anonymous";

  // Check page-level edit permission using can_edit_wiki_item RPC
  const { data: canEditPage, isLoading: permissionLoading } = useQuery({
    queryKey: ["wiki-page-edit-permission", pageId, user?.id],
    queryFn: async () => {
      if (!pageId || !user?.id) return false;
      const { data, error } = await supabase.rpc('can_edit_wiki_item', {
        _item_type: 'page',
        _item_id: pageId,
        _user_id: user.id,
      });
      if (error) {
        console.error("Error checking edit permission:", error);
        return false;
      }
      return data === true;
    },
    enabled: !!pageId && !!user?.id,
    staleTime: 30000,
  });

  // Combined permission check: role-based OR page-level permission
  const hasGlobalAccess = isAdmin || isHR || isOwner;
  const canEdit = hasGlobalAccess || canEditPage === true;

  // Fetch page details
  const { data: page, isLoading } = useQuery({
    queryKey: ["wiki-page", pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const { data, error } = await supabase
        .from("wiki_pages")
        .select("id, title, content, folder_id, updated_at")
        .eq("id", pageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!pageId,
  });

  // Initialize form values when page loads
  useEffect(() => {
    if (page && !hasInitialized) {
      setEditTitle(page.title);
      setEditContent(page.content || "");
      lastSavedRef.current = { title: page.title, content: page.content || "" };
      setHasInitialized(true);
    }
  }, [page, hasInitialized]);

  // Auto-save to database with debounce
  const saveToDatabase = useCallback(async (title: string, content: string) => {
    if (!pageId || !currentEmployee?.id || !currentOrg?.id) return;
    if (!title.trim()) return;

    // Skip if nothing actually changed
    if (title === lastSavedRef.current.title && content === lastSavedRef.current.content) return;

    setSaveStatus("saving");

    try {
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
          title: title.trim(), 
          content, 
          updated_by: currentEmployee.id 
        })
        .eq("id", pageId);
      
      if (error) throw error;

      lastSavedRef.current = { title, content };
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["wiki-page"] });
      queryClient.invalidateQueries({ queryKey: ["wiki-pages-list"] });
      queryClient.invalidateQueries({ queryKey: ["wiki-page-versions"] });

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Auto-save failed:", err);
      setSaveStatus("error");
      toast.error("Auto-save failed. Your changes may not be saved.");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }, [pageId, currentEmployee?.id, currentOrg?.id, queryClient]);

  // Debounced auto-save trigger
  useEffect(() => {
    if (!hasInitialized) return;

    // Clear previous timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Skip if nothing changed from last saved state
    if (editTitle === lastSavedRef.current.title && editContent === lastSavedRef.current.content) return;

    autosaveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(editTitle, editContent);
    }, 1500);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [editTitle, editContent, hasInitialized, saveToDatabase]);

  // Save immediately on unmount if there are pending changes
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    // Flush any pending auto-save immediately
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    if (editTitle !== lastSavedRef.current.title || editContent !== lastSavedRef.current.content) {
      saveToDatabase(editTitle, editContent);
    }
    navigateOrg("/wiki");
  };

  const handleContentChange = useCallback((value: string) => {
    setEditContent(value);
  }, []);

  // Callback to capture provider from editor
  const handleProviderReady = useCallback((p: SupabaseYjsProvider | null) => {
    providerRef.current = p;
  }, []);

  // Redirect if user can't edit
  useEffect(() => {
    if (!isLoading && !roleLoading && !permissionLoading && !canEdit) {
      toast.error("You don't have permission to edit this page");
      navigateOrg("/wiki");
    }
  }, [isLoading, roleLoading, permissionLoading, canEdit, navigateOrg]);

  if (isLoading || roleLoading || permissionLoading) {
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
        <div className="flex items-center justify-between container mx-auto px-4 md:px-8 py-3">
          {/* Page Title */}
          <div className="flex-1">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-[20px] font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-1"
              placeholder="Page title..."
            />
          </div>

          {/* Active editors + Save status */}
          <div className="flex items-center gap-3">
            <WikiActiveEditors
              provider={providerRef.current}
              currentClientId={undefined}
            />

            {/* Auto-save status indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1">
                  <Cloud className="h-3.5 w-3.5 animate-pulse" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-primary">
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 text-destructive">
                  Save failed
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            {/* Comments toggle */}
            <Button
              variant={showCommentsSidebar ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCommentsSidebar((v) => !v)}
              title={showCommentsSidebar ? "Hide comments" : "Show comments"}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClose}
            >
              <X className="h-4 w-4 mr-1.5" />
              Close
            </Button>
          </div>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 md:px-8 py-6 bg-white rounded-lg">
          <BlockNoteWikiEditor
            initialContent={editContent}
            onChange={handleContentChange}
            organizationId={currentOrg?.id}
            placeholder="Start writing or press '/' for commands..."
            minHeight="calc(100vh - 200px)"
            pageId={pageId}
            userName={userName}
            userColor={collaborationColor}
            userId={currentEmployee?.id}
            canComment={true}
            showCommentsSidebar={showCommentsSidebar}
          />
        </div>
      </div>
    </div>
  );
};

export default WikiEditPage;
