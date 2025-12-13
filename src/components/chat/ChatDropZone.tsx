import { useState, useCallback, ReactNode } from "react";
import { Upload } from "lucide-react";

interface ChatDropZoneProps {
  children: ReactNode;
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
}

const ChatDropZone = ({ children, onFilesDropped, disabled }: ChatDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDropped(files);
    }
  }, [disabled, onFilesDropped]);

  return (
    <div
      className="relative flex-1 flex flex-col min-h-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg m-2 pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-primary">
            <div className="p-4 rounded-full bg-primary/20">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop files to upload</p>
              <p className="text-sm text-muted-foreground mt-1">
                Images, documents, and more
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatDropZone;
