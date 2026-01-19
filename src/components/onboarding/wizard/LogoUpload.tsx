/**
 * Logo Upload Component with drag-drop, validation, and cropping
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageCropper } from '@/components/ui/image-cropper';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  currentLogoUrl?: string;
  organizationId?: string;
  onLogoChange: (url: string | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

export function LogoUpload({ 
  currentLogoUrl, 
  organizationId,
  onLogoChange, 
  disabled = false 
}: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync previewUrl when currentLogoUrl prop changes (e.g., navigating back to step)
  useEffect(() => {
    if (currentLogoUrl && currentLogoUrl !== previewUrl) {
      setPreviewUrl(currentLogoUrl);
    }
  }, [currentLogoUrl]);

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, WebP, or SVG)');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 2MB');
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedFile(result);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (blob: Blob) => {
    setIsUploading(true);
    try {
      // Always upload to storage - use temp folder if no orgId yet
      const ext = 'png';
      const filePath = organizationId 
        ? `org-logos/${organizationId}.${ext}`
        : `org-logos/temp-${Date.now()}.${ext}`;

      // Delete existing logo if any (only if we have a stable path)
      if (organizationId) {
        await supabase.storage.from('avatars').remove([filePath]);
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setPreviewUrl(publicUrl);
      onLogoChange(publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [disabled]);

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onLogoChange(null);
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            disabled && 'cursor-not-allowed opacity-50',
            previewUrl && 'border-solid border-muted'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Organization logo"
                className="h-full w-full rounded-lg object-cover"
              />
              {!disabled && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6"
                  onClick={handleRemove}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </>
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium">Organization Logo</p>
          <p className="text-xs text-muted-foreground">
            Click or drag to upload. Recommended: 200x200px, max 2MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={selectedFile || ''}
        onCropComplete={handleCropComplete}
        cropShape="square"
      />
    </>
  );
}
