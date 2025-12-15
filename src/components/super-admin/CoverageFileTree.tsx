import { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface FileCoverage {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  uncoveredLines: number[];
}

interface CoverageFileTreeProps {
  fileCoverage: Record<string, FileCoverage> | null;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  coverage?: FileCoverage;
}

function buildTree(fileCoverage: Record<string, FileCoverage>): TreeNode[] {
  const root: TreeNode[] = [];
  
  for (const [filePath, coverage] of Object.entries(fileCoverage)) {
    const parts = filePath.split('/');
    let currentLevel = root;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLastPart = i === parts.length - 1;
      
      let existing = currentLevel.find(node => node.name === part);
      
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLastPart,
          children: [],
          coverage: isLastPart ? coverage : undefined,
        };
        currentLevel.push(existing);
      }
      
      if (!isLastPart) {
        currentLevel = existing.children;
      }
    }
  }
  
  // Sort: folders first, then files, both alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: sortNodes(node.children),
    }));
  };
  
  return sortNodes(root);
}

function getCoverageColor(coverage: number): string {
  if (coverage >= 80) return 'text-success';
  if (coverage >= 60) return 'text-warning';
  return 'text-destructive';
}

function getCoverageHeatmapBg(coverage: number): string {
  if (coverage >= 80) return 'bg-success/10';
  if (coverage >= 60) return 'bg-warning/10';
  return 'bg-destructive/10';
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}

const TreeNodeItem = ({ 
  node, 
  depth, 
  selectedFile, 
  onSelectFile,
  expandedFolders,
  toggleFolder,
}: TreeNodeItemProps) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;
  
  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
          node.coverage && getCoverageHeatmapBg(node.coverage.lines)
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (node.isFolder) {
            toggleFolder(node.path);
          } else {
            onSelectFile(node.path);
          }
        }}
      >
        {node.isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </>
        )}
        <span className="text-sm truncate flex-1">{node.name}</span>
        {node.coverage && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Progress value={node.coverage.lines} className="w-12 h-1.5" />
            <span className={cn('text-xs font-medium w-10 text-right', getCoverageColor(node.coverage.lines))}>
              {node.coverage.lines}%
            </span>
          </div>
        )}
      </div>
      {node.isFolder && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CoverageFileTree = ({ fileCoverage, selectedFile, onSelectFile }: CoverageFileTreeProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  
  if (!fileCoverage || Object.keys(fileCoverage).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileCode className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No coverage data yet</p>
      </div>
    );
  }
  
  const tree = buildTree(fileCoverage);
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };
  
  return (
    <ScrollArea className="h-[400px]">
      <div className="pr-4">
        {tree.map((node) => (
          <TreeNodeItem
            key={node.path}
            node={node}
            depth={0}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default CoverageFileTree;
