import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, X, FileIcon, Loader2, FileText, Image, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WikiUploadDialogProps {
  organizationId: string | undefined;
  employeeId: string | undefined;
  currentFolderId: string | null;
  onUploadComplete: () => void;
}

interface SelectedFile {
  file: File;
  preview?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
];

export const WikiUploadDialog = ({
  organizationId,
  employeeId,
  currentFolderId,
  onUploadComplete,
}: WikiUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: SelectedFile[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 20MB limit`);
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        return;
      }

      const selectedFile: SelectedFile = { file };
      if (file.type.startsWith("image/")) {
        selectedFile.preview = URL.createObjectURL(file);
      }
      newFiles.push(selectedFile);
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
    if (type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (type.includes("word")) return <FileText className="h-5 w-5 text-blue-600" />;
    if (type.includes("sheet") || type.includes("excel")) return <FileText className="h-5 w-5 text-green-600" />;
    if (type.includes("presentation") || type.includes("powerpoint")) return <FileText className="h-5 w-5 text-orange-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getFileTypeCategory = (mimeType: string): 'image' | 'pdf' | 'document' => {
    if (mimeType.startsWith("image/")) return 'image';
    if (mimeType === "application/pdf") return 'pdf';
    return 'document';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !organizationId || !employeeId) return;

    setIsUploading(true);
    const progressMap: Record<string, number> = {};

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const { file } = selectedFiles[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${organizationId}/${currentFolderId || "root"}/${fileName}`;

        progressMap[file.name] = 30;
        setUploadProgress({ ...progressMap });

        // Upload to wiki-attachments bucket
        const { error: uploadError } = await supabase.storage
          .from("wiki-attachments")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`);
          progressMap[file.name] = -1;
          setUploadProgress({ ...progressMap });
          continue;
        }

        progressMap[file.name] = 70;
        setUploadProgress({ ...progressMap });

        // Get public URL for the file
        const { data: urlData } = supabase.storage.from("wiki-attachments").getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;
        const fileTypeCategory = getFileTypeCategory(file.type);

        // Create a wiki page for the uploaded file with file metadata
        const { error: pageError } = await supabase.from("wiki_pages").insert({
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
          content: createFilePageContent(file.name, filePath, file.type, file.size),
          folder_id: currentFolderId,
          organization_id: organizationId,
          created_by: employeeId,
          is_file: true,
          file_type: fileTypeCategory,
          file_url: publicUrl,
          thumbnail_url: fileTypeCategory === 'image' ? publicUrl : null,
        });

        if (pageError) {
          toast.error(`Failed to create page for ${file.name}`);
          progressMap[file.name] = -1;
          setUploadProgress({ ...progressMap });
          continue;
        }

        progressMap[file.name] = 100;
        setUploadProgress({ ...progressMap });
      }

      const successCount = Object.values(progressMap).filter((p) => p === 100).length;
      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully`);
        onUploadComplete();
      }

      // Cleanup and close
      selectedFiles.forEach((sf) => {
        if (sf.preview) URL.revokeObjectURL(sf.preview);
      });
      setSelectedFiles([]);
      setUploadProgress({});
      setOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const createFilePageContent = (fileName: string, filePath: string, fileType: string, fileSize: number) => {
    const { data } = supabase.storage.from("wiki-attachments").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    if (fileType.startsWith("image/")) {
      return `<p><img src="${publicUrl}" alt="${fileName}" style="max-width: 100%; height: auto;" /></p>
<p><strong>File:</strong> ${fileName}</p>
<p><strong>Size:</strong> ${formatFileSize(fileSize)}</p>
<p><a href="${publicUrl}" target="_blank" rel="noopener noreferrer">Download original file</a></p>`;
    }

    return `<p><strong>📎 Uploaded File</strong></p>
<p><strong>File:</strong> ${fileName}</p>
<p><strong>Size:</strong> ${formatFileSize(fileSize)}</p>
<p><a href="${publicUrl}" target="_blank" rel="noopener noreferrer">📥 Download / View File</a></p>`;
  };

  const handleClose = () => {
    if (!isUploading) {
      selectedFiles.forEach((sf) => {
        if (sf.preview) URL.revokeObjectURL(sf.preview);
      });
      setSelectedFiles([]);
      setUploadProgress({});
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to create wiki pages with attached documents or images.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            "hover:border-primary/50"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={ALLOWED_FILE_TYPES.join(",")}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max 20MB per file. Images, PDFs, Office documents, and text files.
          </p>
        </div>

        {/* Selected files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((sf, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
              >
                {sf.preview ? (
                  <img
                    src={sf.preview}
                    alt={sf.file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                    {getFileIcon(sf.file.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sf.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(sf.file.size)}
                    {uploadProgress[sf.file.name] !== undefined && (
                      <span className="ml-2">
                        {uploadProgress[sf.file.name] === -1
                          ? "Failed"
                          : uploadProgress[sf.file.name] === 100
                          ? "Done"
                          : `${uploadProgress[sf.file.name]}%`}
                      </span>
                    )}
                  </p>
                </div>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading || !organizationId || !employeeId}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
