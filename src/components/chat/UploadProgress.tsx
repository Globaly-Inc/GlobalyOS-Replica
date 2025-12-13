import { Progress } from "@/components/ui/progress";
import { FileIcon, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "complete" | "error";
  preview?: string;
}

interface UploadProgressProps {
  files: UploadingFile[];
  onCancel?: (id: string) => void;
}

const UploadProgress = ({ files, onCancel }: UploadProgressProps) => {
  if (files.length === 0) return null;

  return (
    <div className="border-t border-border bg-muted/30 p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Uploading {files.filter(f => f.status === "uploading").length} file(s)...
      </div>
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 p-2 bg-card rounded-lg"
        >
          {file.preview ? (
            <img
              src={file.preview}
              alt={file.name}
              className="h-10 w-10 object-cover rounded"
            />
          ) : (
            <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <div className="flex items-center gap-2 mt-1">
              {file.status === "uploading" && (
                <>
                  <Progress value={file.progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground w-10">
                    {file.progress}%
                  </span>
                </>
              )}
              {file.status === "complete" && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Complete</span>
                </div>
              )}
              {file.status === "error" && (
                <span className="text-xs text-destructive">Upload failed</span>
              )}
            </div>
          </div>
          
          {file.status === "uploading" && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => onCancel(file.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default UploadProgress;
