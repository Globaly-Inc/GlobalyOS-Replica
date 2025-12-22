import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, Lightbulb, Sparkles, Globe, Monitor, Calendar, Upload, X, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  useCreateSupportRequest, 
  useImproveContent,
  getBrowserInfo, 
  getDeviceType,
  uploadScreenshot 
} from '@/services/useSupportRequests';
import { SupportRequestType, SupportRequestPriority } from '@/types/support';

interface GetHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: SupportRequestType;
}

export const GetHelpDialog = ({ open, onOpenChange, defaultType }: GetHelpDialogProps) => {
  const location = useLocation();
  const [type, setType] = useState<SupportRequestType>(defaultType || 'bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiImprovedDescription, setAiImprovedDescription] = useState<string | null>(null);
  const [suggestedPriority, setSuggestedPriority] = useState<SupportRequestPriority | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const createRequest = useCreateSupportRequest();
  const improveContent = useImproveContent();

  // Auto-captured context
  const pageUrl = window.location.href;
  const browserInfo = getBrowserInfo();
  const deviceType = getDeviceType();
  const dateTime = new Date().toLocaleString();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setType(defaultType || 'bug');
      setTitle('');
      setDescription('');
      setAiImprovedDescription(null);
      setSuggestedPriority(null);
      setScreenshot(null);
      setScreenshotPreview(null);
    }
  }, [open, defaultType]);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Capture #root instead of document.body - this naturally excludes
      // portaled dialogs since they are siblings of #root, not descendants
      const captureTarget = document.getElementById('root');
      
      if (!captureTarget) {
        throw new Error('Could not find #root element');
      }
      
      const canvas = await html2canvas(captureTarget, {
        useCORS: true,
        allowTaint: true,
        scale: window.devicePixelRatio || 1,
        logging: false,
        // Fallback: ignore any Radix portal content that might be inside root
        ignoreElements: (element) => {
          return element.closest('[data-radix-portal]') !== null || 
                 element.getAttribute('role') === 'dialog';
        }
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
          setScreenshot(file);
          setScreenshotPreview(canvas.toDataURL('image/png'));
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      toast.error('Failed to capture screenshot');
    } finally {
      setIsCapturing(false);
    }
  };

  const hasDescription = description.trim().length > 10;

  const handleAIAssist = async () => {
    if (!title) return;

    try {
      const result = await improveContent.mutateAsync({
        type,
        title,
        description: description || '',
        page_url: pageUrl,
        mode: hasDescription ? 'improve' : 'suggest',
      });

      if (hasDescription) {
        setAiImprovedDescription(result.improved_description);
      } else {
        setDescription(result.improved_description);
      }
      setSuggestedPriority(result.suggested_priority);
    } catch (error) {
      console.error('Failed to get AI assistance:', error);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      let screenshotUrl: string | undefined;
      
      if (screenshot) {
        const url = await uploadScreenshot(screenshot);
        if (url) screenshotUrl = url;
      }

      await createRequest.mutateAsync({
        type,
        title,
        description,
        ai_improved_description: aiImprovedDescription || undefined,
        page_url: pageUrl,
        browser_info: browserInfo,
        device_type: deviceType,
        screenshot_url: screenshotUrl,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Get Help
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type Tabs */}
          <Tabs value={type} onValueChange={(v) => setType(v as SupportRequestType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bug" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Report a Bug
              </TabsTrigger>
              <TabsTrigger value="feature" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Request a Feature
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Auto-captured Context */}
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {location.pathname}
            </Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              {browserInfo}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {deviceType}
            </Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateTime}
            </Badge>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder={type === 'bug' ? "Brief description of the issue..." : "What feature would you like?"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs ai-gradient-border"
                onClick={handleAIAssist}
                disabled={!title || improveContent.isPending}
              >
                {improveContent.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1 ai-gradient-icon" />
                )}
                {hasDescription ? 'Improve with AI' : 'Suggest with AI'}
              </Button>
            </div>
            <Textarea
              id="description"
              placeholder={type === 'bug' 
                ? "What happened? What did you expect to happen?" 
                : "Describe the feature and how it would help you..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* AI Improved Description */}
          {aiImprovedDescription && (
            <div className="space-y-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-Improved Description
                </Label>
                {suggestedPriority && (
                  <Badge variant="secondary" className="text-xs">
                    Suggested: {suggestedPriority}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {aiImprovedDescription}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setDescription(aiImprovedDescription);
                  setAiImprovedDescription(null);
                }}
              >
                Use this version
              </Button>
            </div>
          )}

          {/* Screenshot Options */}
          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img 
                  src={screenshotPreview} 
                  alt="Screenshot preview" 
                  className="max-h-32 rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={handleRemoveScreenshot}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Capture Screenshot */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  onClick={handleCaptureScreenshot}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  <span className="text-xs">
                    {isCapturing ? 'Capturing...' : 'Capture Page'}
                  </span>
                </Button>
                
                {/* Upload from Device */}
                <label className="h-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotChange}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!title || !description || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              `Submit ${type === 'bug' ? 'Bug Report' : 'Feature Request'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
