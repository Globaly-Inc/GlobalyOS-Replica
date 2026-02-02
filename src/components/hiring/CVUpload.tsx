/**
 * CV/Resume Upload Component
 * Handles file upload for candidate applications
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CVUploadProps {
  candidateId: string;
  applicationId: string;
  currentFilePath?: string | null;
  onUploadComplete?: (filePath: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CVUpload({
  candidateId,
  applicationId,
  currentFilePath,
  onUploadComplete,
  onRemove,
  disabled = false,
}: CVUploadProps) {
  const { currentOrg } = useOrganization();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!currentOrg?.id) {
      toast.error('Organization not found');
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `cv-${Date.now()}.${fileExt}`;
      const filePath = `${currentOrg.id}/${candidateId}/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('hiring-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update application with file path
      const { error: updateError } = await supabase
        .from('candidate_applications')
        .update({ cv_file_path: filePath })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      toast.success('CV uploaded successfully');
      onUploadComplete?.(filePath);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentFilePath) return;

    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('hiring-documents')
        .remove([currentFilePath]);

      if (deleteError) throw deleteError;

      // Clear path in database
      const { error: updateError } = await supabase
        .from('candidate_applications')
        .update({ cv_file_path: null })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      toast.success('CV removed');
      onRemove?.();
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error(error.message || 'Failed to remove file');
    }
  };

  const handleDownload = async () => {
    if (!currentFilePath) return;

    try {
      const { data, error } = await supabase.storage
        .from('hiring-documents')
        .createSignedUrl(currentFilePath, 60); // 1 minute expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Extract filename from path
  const getFileName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  if (currentFilePath) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 text-left text-sm font-medium hover:underline truncate"
        >
          {getFileName(currentFilePath)}
        </button>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
        isDragging && 'border-primary bg-primary/5',
        !isDragging && 'border-muted-foreground/25 hover:border-muted-foreground/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag and drop a CV/resume here, or
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Browse Files
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            PDF or Word document, max 10MB
          </p>
        </div>
      )}
    </div>
  );
}
