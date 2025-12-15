import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { WikiSharedAvatars, SharedMember, SharedGroup } from "./WikiSharedAvatars";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface WikiBreadcrumbProps {
  folders: WikiFolder[];
  currentFolderId: string | null;
  pageTitle?: string;
  onSelectFolder: (folderId: string | null) => void;
  onSelectHome: () => void;
  // Shared access props
  sharedMembers?: SharedMember[];
  sharedGroups?: SharedGroup[];
  onShareClick?: () => void;
}

export const WikiBreadcrumb = ({
  folders,
  currentFolderId,
  pageTitle,
  onSelectFolder,
  onSelectHome,
  sharedMembers = [],
  sharedGroups = [],
  onShareClick,
}: WikiBreadcrumbProps) => {
  // Build breadcrumb path
  const getBreadcrumbPath = () => {
    const path: WikiFolder[] = [];
    let currentId = currentFolderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_id;
      } else {
        break;
      }
    }
    
    return path;
  };

  const breadcrumbPath = getBreadcrumbPath();

  const hasSharedAccess = sharedMembers.length > 0 || sharedGroups.length > 0;

  return (
    <div className="flex items-center justify-between w-full">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              onClick={onSelectHome}
              className="cursor-pointer flex items-center gap-1 hover:text-primary"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Wiki</span>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {breadcrumbPath.map((folder) => (
            <BreadcrumbItem key={folder.id}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              {pageTitle || folder.id !== currentFolderId ? (
                <BreadcrumbLink
                  onClick={() => onSelectFolder(folder.id)}
                  className="cursor-pointer hover:text-primary"
                >
                  {folder.name}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{folder.name}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}

          {pageTitle && (
            <BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              <BreadcrumbPage className="max-w-[200px] truncate">
                {pageTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Shared avatars on the right */}
      {hasSharedAccess && (
        <WikiSharedAvatars
          members={sharedMembers}
          groups={sharedGroups}
          size="sm"
          onClick={onShareClick}
        />
      )}
    </div>
  );
};
