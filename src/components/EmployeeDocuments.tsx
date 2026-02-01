import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, Download, Trash2, User, FileCheck, Receipt, Loader2, Image, FileSpreadsheet, File } from "lucide-react";
import { UploadDocumentDialog } from "@/components/dialogs/UploadDocumentDialog";
import { DocumentPreviewDialog } from "@/components/dialogs/DocumentPreviewDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { formatDateTime } from "@/lib/utils";
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

interface Document {
  id: string;
  folder: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  uploaded_by: {
    profiles: {
      full_name: string;
    };
  };
}

interface EmployeeDocumentsProps {
  employeeId: string;
  isOwnProfile: boolean;
  searchQuery?: string;
}

const FOLDERS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'contracts', label: 'Contracts', icon: FileCheck },
  { id: 'payslips', label: 'Payslips', icon: Receipt },
] as const;

type FolderType = typeof FOLDERS[number]['id'];

export const EmployeeDocuments = ({ employeeId, isOwnProfile, searchQuery = '' }: EmployeeDocumentsProps) => {
  const { toast } = useToast();
  const { isAdmin, isHR } = useUserRole();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<FolderType>('personal');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const isAdminOrHR = isAdmin || isHR;

  // Can upload to folder
  const canUpload = (folder: FolderType) => {
    if (isAdminOrHR) return true;
    if (isOwnProfile && folder === 'personal') return true;
    return false;
  };

  // Can delete from folder
  const canDelete = (folder: FolderType) => {
    if (isAdminOrHR) return true;
    if (isOwnProfile && folder === 'personal') return true;
    return false;
  };

  useEffect(() => {
    loadDocuments();
  }, [employeeId]);

  const loadDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employee_documents")
      .select(`
        id,
        folder,
        file_name,
        file_path,
        file_size,
        file_type,
        created_at,
        uploaded_by:employees!employee_documents_uploaded_by_fkey(
          profiles!inner(full_name)
        )
      `)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading documents:", error);
    } else {
      setDocuments(data as Document[] || []);
    }
    setLoading(false);
  };

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from("employee-documents")
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    const doc = documents.find(d => d.id === deleteId);
    if (!doc) return;

    setDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("employee-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("employee_documents")
        .delete()
        .eq("id", deleteId);

      if (dbError) throw dbError;

      // Log activity for document deletion
      const { data: { user } } = await supabase.auth.getUser();
      const { data: employee } = await supabase
        .from("employees")
        .select("organization_id")
        .eq("id", employeeId)
        .single();

      if (user && employee?.organization_id) {
        const { logEmployeeActivity } = await import('@/services/useEmployeeActivityTimeline');
        await logEmployeeActivity({
          userId: user.id,
          organizationId: employee.organization_id,
          activityType: 'document_deleted',
          entityType: 'document',
          entityId: deleteId,
          metadata: {
            file_name: doc.file_name,
            folder: doc.folder,
          },
        });
      }

      toast({ title: "Document deleted" });
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string, fileType: string | null) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return FileText;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return Image;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return FileSpreadsheet;
    if (['doc', 'docx'].includes(ext || '')) return FileCheck;
    if (fileType?.includes('image')) return Image;
    if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return FileSpreadsheet;
    return File;
  };

  const getDocumentsForFolder = (folder: string) => {
    return documents.filter(doc => {
      const matchesFolder = doc.folder === folder;
      const matchesSearch = !searchQuery || 
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploaded_by?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFolder && matchesSearch;
    });
  };

  const totalSearchResults = searchQuery 
    ? documents.filter(doc => 
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploaded_by?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ).length 
    : 0;

  const canPreview = (doc: Document) => {
    const ext = doc.file_name.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext || '') ||
      doc.file_type?.includes('image') || doc.file_type?.includes('pdf');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <Tabs value={activeFolder} onValueChange={(v) => setActiveFolder(v as FolderType)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid grid-cols-3">
            {FOLDERS.map((folder) => {
              const Icon = folder.icon;
              const count = getDocumentsForFolder(folder.id).length;
              return (
                <TabsTrigger key={folder.id} value={folder.id} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{folder.label}</span>
                  {count > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {canUpload(activeFolder) && (
            <UploadDocumentDialog
              employeeId={employeeId}
              folder={activeFolder}
              onSuccess={loadDocuments}
            />
          )}
        </div>

        {FOLDERS.map((folder) => {
          const folderDocs = getDocumentsForFolder(folder.id);
          return (
            <TabsContent key={folder.id} value={folder.id} className="space-y-3">

              {folderDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No documents in {folder.label}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {folderDocs.map((doc) => {
                    const FileIcon = getFileIcon(doc.file_name, doc.file_type);
                    return (
                      <div
                        key={doc.id}
                        className="p-2.5 bg-muted/50 rounded-lg hover:bg-muted transition-colors group relative cursor-pointer"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 bg-primary/10 rounded shrink-0">
                            <FileIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate" title={doc.file_name}>{doc.file_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {formatFileSize(doc.file_size)} · {formatDateTime(doc.created_at)}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              by {doc.uploaded_by?.profiles?.full_name?.split(' ')[0] || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded p-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                            disabled={downloading === doc.id}
                          >
                            {downloading === doc.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                          </Button>
                          {canDelete(folder.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteId(doc.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
};
