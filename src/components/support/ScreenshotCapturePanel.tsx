/**
 * Screenshot Capture Panel
 * Provides bulk capture controls, progress tracking, and preview for documentation screenshots
 */

import { useState } from 'react';
import { Camera, Play, RefreshCw, Check, X, Image, Eye, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORT_MODULES, SupportScreenshot } from '@/services/useSupportArticles';
import { ScreenshotSession, PrivacyOptions } from '@/services/useSupportScreenshots';

interface ScreenshotCapturePanelProps {
  screenshots: SupportScreenshot[];
  session: ScreenshotSession | null;
  onRefresh: () => void;
}

interface CaptureProgress {
  total: number;
  completed: number;
  failed: number;
  current: string;
}

export const ScreenshotCapturePanel = ({ 
  screenshots, 
  session, 
  onRefresh 
}: ScreenshotCapturePanelProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDescription, setPreviewDescription] = useState('');
  const [privacyOptions, setPrivacyOptions] = useState<PrivacyOptions>({
    maskNames: true,
    blurAvatars: true,
    hideEmails: true,
  });

  // Stats
  const pendingCount = screenshots.filter(s => s.status === 'pending').length;
  const capturingCount = screenshots.filter(s => s.status === 'capturing').length;
  const completedCount = screenshots.filter(s => s.status === 'completed').length;
  const failedCount = screenshots.filter(s => s.status === 'failed').length;

  // Get public URL from storage path
  const getPublicUrl = (storagePath: string) => {
    return `https://rygowmzkvxgnxagqlyxf.supabase.co/storage/v1/object/public/doc_screenshots/${storagePath}`;
  };

  // Capture all pending screenshots
  const handleCaptureAll = async () => {
    if (!session) {
      toast.error('Please authenticate first to capture screenshots');
      return;
    }

    const pendingScreenshots = screenshots.filter(s => 
      s.status === 'pending' && 
      (selectedModule === 'all' || s.module === selectedModule)
    );

    if (pendingScreenshots.length === 0) {
      toast.info('No pending screenshots to capture');
      return;
    }

    setIsCapturing(true);
    setProgress({ 
      total: pendingScreenshots.length, 
      completed: 0, 
      failed: 0, 
      current: '' 
    });

    let completed = 0;
    let failed = 0;

    for (const screenshot of pendingScreenshots) {
      setProgress(prev => prev ? { ...prev, current: screenshot.description || screenshot.route_path } : null);

      try {
        const { error } = await supabase.functions.invoke('capture-doc-screenshot', {
          body: {
            screenshotId: screenshot.id,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            privacyMasks: buildPrivacyMasks(privacyOptions),
          },
        });

        if (error) {
          failed++;
          console.error(`Failed to capture ${screenshot.id}:`, error);
        } else {
          completed++;
        }
      } catch (err) {
        failed++;
        console.error(`Error capturing ${screenshot.id}:`, err);
      }

      setProgress(prev => prev ? { ...prev, completed, failed } : null);

      // Small delay between captures to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setIsCapturing(false);
    setProgress(null);
    onRefresh();

    if (failed === 0) {
      toast.success(`Successfully captured ${completed} screenshots`);
    } else {
      toast.warning(`Captured ${completed} screenshots, ${failed} failed`);
    }
  };

  // Retry failed screenshots
  const handleRetryFailed = async () => {
    if (!session) {
      toast.error('Please authenticate first');
      return;
    }

    const failedScreenshots = screenshots.filter(s => 
      s.status === 'failed' && 
      (selectedModule === 'all' || s.module === selectedModule)
    );

    if (failedScreenshots.length === 0) {
      toast.info('No failed screenshots to retry');
      return;
    }

    // Reset failed screenshots to pending
    for (const screenshot of failedScreenshots) {
      await supabase
        .from('support_screenshots')
        .update({ status: 'pending', error_message: null })
        .eq('id', screenshot.id);
    }

    onRefresh();
    toast.info(`Reset ${failedScreenshots.length} screenshots to pending. Click "Capture All" to retry.`);
  };

  // Build privacy masks based on options
  const buildPrivacyMasks = (options: PrivacyOptions) => {
    const masks: { type: 'blur' | 'replace' | 'hide'; selector: string; replacement?: string }[] = [];

    if (options.maskNames) {
      masks.push(
        { type: 'replace', selector: '[data-privacy="name"]', replacement: 'Demo User' },
        { type: 'replace', selector: '.employee-name, .profile-name, .team-member-name', replacement: 'Demo User' },
        { type: 'replace', selector: '[class*="name"]:not([class*="icon"]):not([class*="container"])', replacement: 'Demo User' }
      );
    }

    if (options.blurAvatars) {
      masks.push(
        { type: 'blur', selector: '[data-privacy="avatar"]' },
        { type: 'blur', selector: '.avatar img, [class*="avatar"] img, img[class*="profile"]' },
        { type: 'blur', selector: '[data-slot="avatar-image"]' }
      );
    }

    if (options.hideEmails) {
      masks.push(
        { type: 'replace', selector: '[data-privacy="email"]', replacement: 'demo@example.com' },
        { type: 'replace', selector: '.user-email, .employee-email', replacement: 'demo@example.com' }
      );
    }

    return masks;
  };

  // Filtered screenshots for display
  const filteredScreenshots = selectedModule === 'all' 
    ? screenshots 
    : screenshots.filter(s => s.module === selectedModule);

  const progressPercent = progress 
    ? ((progress.completed + progress.failed) / progress.total) * 100 
    : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Bulk Screenshot Capture
        </CardTitle>
        <CardDescription>
          Capture app screenshots with automatic privacy masking for documentation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Pending: {pendingCount}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Capturing: {capturingCount}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Completed: {completedCount}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Failed: {failedCount}
          </Badge>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Module:</Label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {SUPPORT_MODULES.map(mod => (
                  <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4 border-l pl-4">
            <div className="flex items-center gap-2">
              <Switch 
                id="mask-names" 
                checked={privacyOptions.maskNames}
                onCheckedChange={(checked) => setPrivacyOptions(prev => ({ ...prev, maskNames: checked }))}
              />
              <Label htmlFor="mask-names" className="text-xs">Mask Names</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                id="blur-avatars" 
                checked={privacyOptions.blurAvatars}
                onCheckedChange={(checked) => setPrivacyOptions(prev => ({ ...prev, blurAvatars: checked }))}
              />
              <Label htmlFor="blur-avatars" className="text-xs">Blur Avatars</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                id="hide-emails" 
                checked={privacyOptions.hideEmails}
                onCheckedChange={(checked) => setPrivacyOptions(prev => ({ ...prev, hideEmails: checked }))}
              />
              <Label htmlFor="hide-emails" className="text-xs">Hide Emails</Label>
            </div>
          </div>
        </div>

        {/* Progress Bar (when capturing) */}
        {progress && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Capturing screenshots...</span>
              <span className="text-muted-foreground">
                {progress.completed + progress.failed} / {progress.total}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground truncate">
              Current: {progress.current}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleCaptureAll} 
            disabled={isCapturing || !session || pendingCount === 0}
            className="gap-2"
          >
            {isCapturing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isCapturing ? 'Capturing...' : `Capture All (${pendingCount})`}
          </Button>

          <Button 
            variant="outline" 
            onClick={handleRetryFailed}
            disabled={isCapturing || failedCount === 0}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Failed ({failedCount})
          </Button>

          <Button 
            variant="ghost" 
            onClick={onRefresh}
            disabled={isCapturing}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {!session && (
            <span className="text-sm text-amber-600 flex items-center gap-1 ml-2">
              <AlertCircle className="h-4 w-4" />
              Authenticate above to capture
            </span>
          )}
        </div>

        {/* Recent Screenshots Preview */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Recent Captures</h4>
          <ScrollArea className="h-48">
            <div className="grid grid-cols-4 gap-3">
              {filteredScreenshots
                .filter(s => s.status === 'completed' && s.storage_path)
                .slice(0, 8)
                .map(screenshot => (
                  <Dialog key={screenshot.id}>
                    <DialogTrigger asChild>
                      <button 
                        className="relative aspect-video bg-muted rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all group"
                        onClick={() => {
                          setPreviewUrl(getPublicUrl(screenshot.storage_path!));
                          setPreviewDescription(screenshot.description || screenshot.route_path);
                        }}
                      >
                        <img 
                          src={getPublicUrl(screenshot.storage_path!)} 
                          alt={screenshot.description || 'Screenshot'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="absolute bottom-1 left-1 text-[10px] px-1"
                        >
                          {screenshot.module}
                        </Badge>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Image className="h-5 w-5" />
                          {screenshot.description || screenshot.route_path}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        <img 
                          src={getPublicUrl(screenshot.storage_path!)} 
                          alt={screenshot.description || 'Screenshot'}
                          className="w-full rounded-lg border"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Route: {screenshot.route_path}
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              {filteredScreenshots.filter(s => s.status === 'completed').length === 0 && (
                <div className="col-span-4 text-center py-8 text-muted-foreground">
                  <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No captured screenshots yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
