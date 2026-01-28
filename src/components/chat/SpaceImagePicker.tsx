import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import { ImageCropper } from "@/components/ui/image-cropper";

interface SpaceImagePickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

const SpaceImagePicker = ({ value, onChange }: SpaceImagePickerProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentOrg } = useOrganization();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Create temp URL for cropping
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Clear input for re-selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!currentOrg?.id) return;

    setIsUploading(true);
    try {
      const fileName = `space-icons/${currentOrg.id}/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, croppedBlob, {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      onChange(`${publicUrl}?t=${Date.now()}`);
      setTempImageSrc(null);
    } catch (error) {
      showErrorToast(error, "Failed to upload image", {
        componentName: "SpaceImagePicker",
        actionAttempted: "Upload space icon",
        errorType: "network",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="group relative flex items-center justify-center h-14 w-14 rounded-lg bg-muted hover:bg-muted/80 transition-colors overflow-hidden border border-border"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : value ? (
            <>
              <Avatar className="h-full w-full rounded-lg">
                <AvatarImage src={value} className="object-cover" />
                <AvatarFallback className="rounded-lg">
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Camera className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          )}
        </button>
      </div>

      {/* Image Cropper Dialog */}
      {tempImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) setTempImageSrc(null);
          }}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
          cropShape="square"
          aspectRatio={1}
        />
      )}
    </>
  );
};

export default SpaceImagePicker;
