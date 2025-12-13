import { useState } from "react";
import { Pencil, Save, X, Clock, User, History, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFormattedDate } from "@/hooks/useFormattedDate";
import { WikiMarkdownEditor } from "./WikiMarkdownEditor";
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
}

export const WikiContent = ({ page, versions, onSave, canEdit, isLoading, organizationId }: WikiContentProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { formatDateTime } = useFormattedDate();

  const handleStartEdit = () => {
    if (page) {
      setEditTitle(page.title);
      setEditContent(page.content || "");
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
  };

  const handleSave = async () => {
    if (page && editTitle.trim()) {
      setIsSaving(true);
      try {
        await onSave(page.id, editTitle.trim(), editContent);
        setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
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
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
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
          <WikiMarkdownEditor
            value={editContent}
            onChange={setEditContent}
            organizationId={organizationId}
            placeholder="Write your wiki page in markdown..."
            minHeight="400px"
          />
        ) : page.content ? (
          <div className="flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <WikiMarkdownRenderer content={page.content} />
            </div>
            {/* Table of Contents - only show on larger screens */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-0">
                <WikiTableOfContents content={page.content} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground italic">This page has no content yet.</p>
        )}
      </div>
    </div>
  );
};