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

const MAX_SCREENSHOTS = 5;

export const GetHelpDialog = ({ open, onOpenChange, defaultType }: GetHelpDialogProps) => {
  const location = useLocation();
  const [type, setType] = useState<SupportRequestType>(defaultType || 'bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiImprovedDescription, setAiImprovedDescription] = useState<string | null>(null);
  const [suggestedPriority, setSuggestedPriority] = useState<SupportRequestPriority | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
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
      setScreenshots([]);
      setScreenshotPreviews([]);
    }
  }, [open, defaultType]);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Append new files (limit to max)
    const remainingSlots = MAX_SCREENSHOTS - screenshots.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (filesToAdd.length === 0) {
      toast.error(`Maximum ${MAX_SCREENSHOTS} images allowed`);
      return;
    }

    setScreenshots(prev => [...prev, ...filesToAdd]);
    
    // Generate previews for new files
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setScreenshotPreviews(prev => [...prev, e.target?.result as string].slice(0, MAX_SCREENSHOTS));
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow re-selecting same files
    e.target.value = '';
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    setScreenshotPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCaptureScreenshot = async () => {
    if (screenshots.length >= MAX_SCREENSHOTS) {
      toast.error(`Maximum ${MAX_SCREENSHOTS} images allowed`);
      return;
    }

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
        allowTaint: false, // Prevent tainted canvas
        scale: Math.min(window.devicePixelRatio || 1, 2), // Cap scale for performance
        logging: false,
        backgroundColor: '#ffffff',
        // Ignore any Radix portal content that might be inside root
        ignoreElements: (element) => {
          return element.closest('[data-radix-portal]') !== null || 
                 element.getAttribute('role') === 'dialog';
        },
        onclone: (clonedDoc) => {
          // Replace cross-origin images with placeholders to prevent tainting
          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img) => {
            const src = img.getAttribute('src') || '';
            // Check if image is cross-origin (not from same origin or data URL)
            const isCrossOrigin = src && 
              !src.startsWith('data:') && 
              !src.startsWith(window.location.origin) &&
              !src.startsWith('/');
            
            if (isCrossOrigin) {
              // Hide cross-origin images to prevent tainting
              img.style.visibility = 'hidden';
            }
          });
        }
      });
      
      // Use Promise wrapper for better error handling
      const blob = await new Promise<Blob | null>((resolve) => {
        try {
          canvas.toBlob((b) => resolve(b), 'image/png');
        } catch (e) {
          console.error('toBlob failed:', e);
          resolve(null);
        }
      });

      if (blob) {
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
        setScreenshots(prev => [...prev, file].slice(0, MAX_SCREENSHOTS));
        setScreenshotPreviews(prev => [...prev, URL.createObjectURL(blob)].slice(0, MAX_SCREENSHOTS));
        toast.success('Screenshot captured successfully');
      } else {
        throw new Error('Could not generate screenshot image');
      }
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      toast.error('Failed to capture screenshot. Try uploading an image instead.');
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
      // Upload all screenshots
      const screenshotUrls: string[] = [];
      for (const file of screenshots) {
        const url = await uploadScreenshot(file);
        if (url) screenshotUrls.push(url);
      }

      await createRequest.mutateAsync({
        type,
        title,
        description,
        ai_improved_description: aiImprovedDescription || undefined,
        page_url: pageUrl,
        browser_info: browserInfo,
        device_type: deviceType,
        // Store multiple URLs as comma-separated
        screenshot_url: screenshotUrls.join(',') || undefined,
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
            <div className="flex items-center justify-between">
              <Label>Screenshots (optional)</Label>
              {screenshots.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {screenshots.length}/{MAX_SCREENSHOTS}
                </span>
              )}
            </div>

            {/* Screenshot Previews Grid */}
            {screenshotPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {screenshotPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={preview} 
                      alt={`Screenshot ${index + 1}`}
                      className="h-20 w-full object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveScreenshot(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add More Options (shown if under limit) */}
            {screenshots.length < MAX_SCREENSHOTS && (
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
                    multiple
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