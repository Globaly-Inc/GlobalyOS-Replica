import { useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { ImageCropper } from '@/components/ui/image-cropper';

const EMOJI_LIST = [
  '📂', '📁', '🚀', '💡', '🎯', '📋', '🔧', '💼', '📊', '🎨',
  '🏠', '🌟', '📝', '🔥', '⚡', '🎮', '📸', '🎵', '📈', '🏆',
  '🌈', '💎', '🧩', '🔒', '📌', '🗂️', '📦', '🛠️', '🧪', '🎁',
  '🌍', '💬', '📅', '🔔', '❤️', '✅', '🎓', '🏗️', '⭐', '🔑',
];

export const isImageIcon = (icon: string | null): boolean =>
  !!icon && (icon.startsWith('http://') || icon.startsWith('https://'));

interface SpaceIconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  size?: 'sm' | 'md';
}

export const SpaceIconPicker = ({ value, onChange, size = 'md' }: SpaceIconPickerProps) => {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentOrg } = useOrganization();

  const isImage = isImageIcon(value);
  const btnSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!currentOrg?.id) return;
    setIsUploading(true);
    try {
      const fileName = `space-icons/${currentOrg.id}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, croppedBlob, { contentType: 'image/png' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      onChange(`${publicUrl}?t=${Date.now()}`);
      setTempImageSrc(null);
      setOpen(false);
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onChange('🚀');
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`group relative ${btnSize} rounded-md border border-border flex items-center justify-center overflow-hidden bg-muted hover:bg-muted/80 transition-colors shrink-0`}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isImage ? (
              <>
                <Avatar className={`${btnSize} rounded-md`}>
                  <AvatarImage src={value} className="object-cover" />
                  <AvatarFallback className="rounded-md text-xs">🚀</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </>
            ) : (
              <span className={size === 'sm' ? 'text-base' : 'text-xl'}>{value}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <Tabs defaultValue="emoji">
            <TabsList className="w-full mb-2">
              <TabsTrigger value="emoji" className="flex-1 text-xs">Emoji</TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 text-xs">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="emoji" className="mt-0">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-base"
                    onClick={() => { onChange(emoji); setOpen(false); }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3 py-4">
                {isImage && (
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage src={value} className="object-cover" />
                    <AvatarFallback className="rounded-lg">🚀</AvatarFallback>
                  </Avatar>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImage ? 'Change Image' : 'Upload Image'}
                </Button>
                {isImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Image
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Max 5MB • JPG, PNG, GIF</p>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      {tempImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={(o) => {
            setCropperOpen(o);
            if (!o) setTempImageSrc(null);
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
