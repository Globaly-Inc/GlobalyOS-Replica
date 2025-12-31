import { Folder, FileText, BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WikiEmptyStateProps {
  type: "folder" | "wiki" | "page";
  canEdit?: boolean;
  disabled?: boolean;
  onCreateFolder?: () => void;
  onCreatePage?: () => void;
}

export const WikiEmptyState = ({
  type,
  canEdit = false,
  disabled = false,
  onCreateFolder,
  onCreatePage,
}: WikiEmptyStateProps) => {
  if (type === "wiki") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Welcome to your Wiki</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Organize your team's knowledge, documentation, and resources in one central place.
        </p>
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onCreateFolder} variant="outline" className="gap-2" disabled={disabled}>
              <Folder className="h-4 w-4" />
              Create First Folder
            </Button>
            <Button onClick={onCreatePage} className="gap-2" disabled={disabled}>
              <FileText className="h-4 w-4" />
              Create First Page
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (type === "folder") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Folder className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">This folder is empty</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          Add pages or subfolders to organize your content.
        </p>
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onCreateFolder} variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
              <Plus className="h-4 w-4" />
              Add Folder
            </Button>
            <Button onClick={onCreatePage} size="sm" className="gap-1.5" disabled={disabled}>
              <Plus className="h-4 w-4" />
              Add Page
            </Button>
          </div>
        )}
      </div>
    );
  }

  // page type - no page selected
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">Select a page to view</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        Choose a page from the sidebar or folder view to see its content.
      </p>
    </div>
  );
};
