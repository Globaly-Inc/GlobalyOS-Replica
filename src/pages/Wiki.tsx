import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { WikiSidebar } from '@/components/wiki/WikiSidebar';
import { WikiContent, WikiContentHandle } from "@/components/wiki/WikiContent";
import { WikiFolderView } from "@/components/wiki/WikiFolderView";
import { WikiSearch } from "@/components/wiki/WikiSearch";
import { WikiAskAI } from "@/components/wiki/WikiAskAI";
import { WikiImportDialog } from "@/components/wiki/WikiImportDialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useWikiFavorites } from "@/hooks/useWikiFavorites";
import { useWikiRecentlyViewed } from "@/hooks/useWikiRecentlyViewed";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown, FileText, Folder } from "lucide-react";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface WikiPage {
  id: string;
  folder_id: string | null;
  title: string;
  content: string | null;
  sort_order: number;
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

type ViewMode = "home" | "folder" | "page";

interface PendingNavigation {
  type: 'page' | 'folder' | 'home';
  id?: string;
}

const Wiki = () => {
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { isAdmin, isHR } = useUserRole();
  const { isFavorite, toggleFavorite } = useWikiFavorites();
  const { recentItems, addRecentItem } = useWikiRecentlyViewed();
  const queryClient = useQueryClient();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [creatingItem, setCreatingItem] = useState<{ type: "folder" | "page" } | null>(null);
  
  // Ref to WikiContent to check unsaved changes synchronously
  const wikiContentRef = useRef<WikiContentHandle>(null);

  const canEdit = isAdmin || isHR;

  // Navigation handlers - check unsaved changes synchronously via ref
  const handleSelectPage = useCallback((pageId: string) => {
    if (wikiContentRef.current?.hasUnsavedChanges() && pageId !== selectedPageId) {
      setPendingNavigation({ type: 'page', id: pageId });
    } else {
      setSelectedPageId(pageId);
      setSelectedFolderId(null);
      setViewMode("page");
    }
  }, [selectedPageId]);

  const handleSelectFolder = useCallback((folderId: string) => {
    if (wikiContentRef.current?.hasUnsavedChanges()) {
      setPendingNavigation({ type: 'folder', id: folderId });
    } else {
      setSelectedFolderId(folderId);
      setSelectedPageId(null);
      setViewMode("folder");
    }
  }, []);

  const handleSelectHome = useCallback(() => {
    if (wikiContentRef.current?.hasUnsavedChanges()) {
      setPendingNavigation({ type: 'home' });
    } else {
      setSelectedPageId(null);
      setSelectedFolderId(null);
      setViewMode("home");
    }
  }, []);

  // Handle navigation confirmation
  const handleNavigationConfirm = useCallback(() => {
    if (pendingNavigation) {
      if (pendingNavigation.type === 'page' && pendingNavigation.id) {
        setSelectedPageId(pendingNavigation.id);
        setSelectedFolderId(null);
        setViewMode("page");
      } else if (pendingNavigation.type === 'folder' && pendingNavigation.id) {
        setSelectedFolderId(pendingNavigation.id);
        setSelectedPageId(null);
        setViewMode("folder");
      } else if (pendingNavigation.type === 'home') {
        setSelectedPageId(null);
        setSelectedFolderId(null);
        setViewMode("home");
      }
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const handleNavigationCancel = useCallback(() => {
    setPendingNavigation(null);
  }, []);
  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ["wiki-folders", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("wiki_folders")
        .select("id, name, parent_id, sort_order, created_at, updated_at")
        .eq("organization_id", currentOrg.id)
        .order("sort_order");
      if (error) throw error;
      return data as WikiFolder[];
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch pages list
  const { data: pagesList = [] } = useQuery({
    queryKey: ["wiki-pages-list", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("wiki_pages")
        .select("id, folder_id, title, content, sort_order, created_at, updated_at")
        .eq("organization_id", currentOrg.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch selected page details
  const { data: selectedPage, isLoading: isLoadingPage } = useQuery({
    queryKey: ["wiki-page", selectedPageId],
    queryFn: async () => {
      if (!selectedPageId) return null;
      const { data, error } = await supabase
        .from("wiki_pages")
        .select(`
          id, title, content, created_at, updated_at,
          created_by:employees!wiki_pages_created_by_fkey(id, profiles(full_name, avatar_url)),
          updated_by:employees!wiki_pages_updated_by_fkey(id, profiles(full_name, avatar_url))
        `)
        .eq("id", selectedPageId)
        .single();
      if (error) throw error;
      return data as unknown as WikiPage;
    },
    enabled: !!selectedPageId,
  });

  // Fetch page versions
  const { data: pageVersions = [] } = useQuery({
    queryKey: ["wiki-page-versions", selectedPageId],
    queryFn: async () => {
      if (!selectedPageId) return [];
      const { data, error } = await supabase
        .from("wiki_page_versions")
        .select(`
          id, title, content, created_at,
          edited_by:employees!wiki_page_versions_edited_by_fkey(id, profiles(full_name, avatar_url))
        `)
        .eq("page_id", selectedPageId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as WikiPageVersion[];
    },
    enabled: !!selectedPageId,
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

  // Track recently viewed pages
  useEffect(() => {
    if (viewMode === "page" && selectedPageId) {
      const page = pagesList.find(p => p.id === selectedPageId);
      if (page) {
        addRecentItem(selectedPageId, "page", page.title);
      }
    }
  }, [selectedPageId, viewMode, pagesList, addRecentItem]);

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("wiki_folders").insert({
        name,
        parent_id: parentId,
        organization_id: currentOrg.id,
        created_by: currentEmployee.id,
        sort_order: folders.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-folders"] });
      toast.success("Folder created");
    },
    onError: () => toast.error("Failed to create folder"),
  });

  // Create page mutation
  const createPageMutation = useMutation({
    mutationFn: async ({ title, folderId }: { title: string; folderId: string | null }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("wiki_pages")
        .insert({
          title,
          folder_id: folderId,
          organization_id: currentOrg.id,
          created_by: currentEmployee.id,
          sort_order: pagesList.length,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages-list"] });
      toast.success("Page created");
      // Navigate to edit page for new pages
      navigate(`/wiki/edit/${data.id}`);
    },
    onError: () => toast.error("Failed to create page"),
  });

  // Rename folder mutation
  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: string; name: string }) => {
      const { error } = await supabase.from("wiki_folders").update({ name }).eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-folders"] });
      toast.success("Folder renamed");
    },
    onError: () => toast.error("Failed to rename folder"),
  });

  // Rename page mutation
  const renamePageMutation = useMutation({
    mutationFn: async ({ pageId, title }: { pageId: string; title: string }) => {
      const { error } = await supabase.from("wiki_pages").update({ title }).eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages-list"] });
      queryClient.invalidateQueries({ queryKey: ["wiki-page"] });
      toast.success("Page renamed");
    },
    onError: () => toast.error("Failed to rename page"),
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase.from("wiki_folders").delete().eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-folders"] });
      queryClient.invalidateQueries({ queryKey: ["wiki-pages-list"] });
      toast.success("Folder deleted");
    },
    onError: () => toast.error("Failed to delete folder"),
  });

  // Delete page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("wiki_pages").delete().eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: (_, pageId) => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages-list"] });
      if (selectedPageId === pageId) {
        setSelectedPageId(null);
      }
      toast.success("Page deleted");
    },
    onError: () => toast.error("Failed to delete page"),
  });

  // Save page mutation
  const savePageMutation = useMutation({
    mutationFn: async ({ pageId, title, content }: { pageId: string; title: string; content: string }) => {
      if (!currentEmployee?.id || !currentOrg?.id) throw new Error("Not authenticated");

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
        .update({ title, content, updated_by: currentEmployee.id })
        .eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-page"] });
      queryClient.invalidateQueries({ queryKey: ["wiki-pages-list"] });
      queryClient.invalidateQueries({ queryKey: ["wiki-page-versions"] });
      toast.success("Page saved");
    },
    onError: () => toast.error("Failed to save page"),
  });

  // Get current folder for creating items in context
  const getCurrentFolderId = useCallback(() => {
    if (viewMode === "folder" && selectedFolderId) {
      return selectedFolderId;
    }
    // If viewing a page, get its parent folder
    if (viewMode === "page" && selectedPageId) {
      const page = pagesList.find(p => p.id === selectedPageId);
      return page?.folder_id || null;
    }
    return null;
  }, [viewMode, selectedFolderId, selectedPageId, pagesList]);

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="bg-card border-b px-4 py-3 flex items-center gap-4">
          <WikiSearch
            folders={folders}
            pages={pagesList}
            onSelectPage={handleSelectPage}
          />
          <WikiAskAI organizationId={currentOrg?.id} />
          
          <div className="flex-1" />
          
          {canEdit && (
            <>
              <WikiImportDialog
                organizationId={currentOrg?.id}
                employeeId={currentEmployee?.id}
                existingFolders={folders}
                onImportComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ["wiki-folders"] });
                  queryClient.invalidateQueries({ queryKey: ["wiki-pages-list"] });
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onSelect={() => {
                      // Switch to folder view first if on page view
                      if (viewMode === "page") {
                        setSelectedPageId(null);
                        setViewMode(selectedFolderId ? "folder" : "home");
                      }
                      setCreatingItem({ type: "page" });
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    New Page
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={() => {
                      // Switch to folder view first if on page view
                      if (viewMode === "page") {
                        setSelectedPageId(null);
                        setViewMode(selectedFolderId ? "folder" : "home");
                      }
                      setCreatingItem({ type: "folder" });
                    }}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    New Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          <div className="w-64 shrink-0 border-r">
            <WikiSidebar
              folders={folders}
              pages={pagesList}
              selectedPageId={selectedPageId}
              selectedFolderId={selectedFolderId}
              showingHome={viewMode === "home" || viewMode === "folder"}
              onSelectPage={handleSelectPage}
              onSelectFolder={handleSelectFolder}
              onSelectHome={handleSelectHome}
              onStartCreating={(type) => setCreatingItem({ type })}
              canEdit={canEdit}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              recentItems={recentItems}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 bg-background">
            {viewMode === "page" ? (
              <WikiContent
                ref={wikiContentRef}
                page={selectedPage || null}
                versions={pageVersions}
                onSave={async (pageId, title, content) => {
                  await savePageMutation.mutateAsync({ pageId, title, content });
                }}
                canEdit={canEdit}
                isLoading={isLoadingPage}
                organizationId={currentOrg?.id}
                pendingNavigation={pendingNavigation}
                onNavigationConfirm={handleNavigationConfirm}
                onNavigationCancel={handleNavigationCancel}
              />
            ) : (
              <WikiFolderView
                folders={folders}
                pages={pagesList}
                currentFolderId={selectedFolderId}
                onSelectFolder={handleSelectFolder}
                onSelectPage={handleSelectPage}
                canEdit={canEdit}
                onCreateFolder={(name, parentId) => createFolderMutation.mutate({ name, parentId })}
                onCreatePage={(title, folderId) => createPageMutation.mutate({ title, folderId })}
                onRenameFolder={(folderId, name) => renameFolderMutation.mutate({ folderId, name })}
                onRenamePage={(pageId, title) => renamePageMutation.mutate({ pageId, title })}
                onDeleteFolder={(folderId) => deleteFolderMutation.mutate(folderId)}
                onDeletePage={(pageId) => deletePageMutation.mutate(pageId)}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                creatingItem={creatingItem}
                onCreatingItemComplete={() => setCreatingItem(null)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Wiki;
