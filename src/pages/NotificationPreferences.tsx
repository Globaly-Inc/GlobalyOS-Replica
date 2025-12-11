import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotificationPreferences, SOUND_OPTIONS, SoundType } from "@/hooks/useNotificationPreferences";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { ArrowLeft, Volume2, VolumeX, Bell, Heart, AtSign, Calendar, Moon, RotateCcw, Play, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SoundSelector = ({ 
  selectedSound, 
  onSelectSound 
}: { 
  selectedSound: SoundType; 
  onSelectSound: (sound: SoundType) => void;
}) => {
  const { playNotificationSound } = useNotificationSound();

  const handlePreview = (sound: SoundType, e: React.MouseEvent) => {
    e.stopPropagation();
    playNotificationSound(sound);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {SOUND_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelectSound(option.value)}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
            selectedSound === option.value
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {selectedSound === option.value && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
              <span className="text-sm font-medium">{option.label}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{option.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => handlePreview(option.value, e)}
          >
            <Play className="h-4 w-4" />
          </Button>
        </button>
      ))}
    </div>
  );
};

const NotificationPreferences = () => {
  const navigate = useNavigate();
  const {
    preferences,
    isLoading,
    updatePreference,
    updateNotificationType,
    updateQuietHours,
    resetToDefaults,
  } = useNotificationPreferences();

  const handleReset = () => {
    resetToDefaults();
    toast.success("Preferences reset to defaults");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/notifications")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader title="Notification Preferences" />
        </div>

        <div className="space-y-6">
          {/* Sound Settings */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                {preferences.soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-primary" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base">Notification Sound</CardTitle>
                  <CardDescription>
                    Play a sound when new notifications arrive
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-toggle" className="text-sm">
                  Enable notification sound
                </Label>
                <Switch
                  id="sound-toggle"
                  checked={preferences.soundEnabled}
                  onCheckedChange={(checked) => updatePreference("soundEnabled", checked)}
                />
              </div>
              
              {preferences.soundEnabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Choose Sound</Label>
                    <SoundSelector
                      selectedSound={preferences.soundType}
                      onSelectSound={(sound) => updatePreference("soundType", sound)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Notification Types</CardTitle>
                  <CardDescription>
                    Choose which types of notifications you want to receive
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <Label htmlFor="kudos-toggle" className="text-sm font-normal">
                    Kudos & Recognition
                  </Label>
                </div>
                <Switch
                  id="kudos-toggle"
                  checked={preferences.notificationTypes.kudos}
                  onCheckedChange={(checked) => updateNotificationType("kudos", checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AtSign className="h-4 w-4 text-blue-500" />
                  <Label htmlFor="mentions-toggle" className="text-sm font-normal">
                    Mentions in Posts
                  </Label>
                </div>
                <Switch
                  id="mentions-toggle"
                  checked={preferences.notificationTypes.mentions}
                  onCheckedChange={(checked) => updateNotificationType("mentions", checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <Label htmlFor="leave-toggle" className="text-sm font-normal">
                    Leave Requests & Approvals
                  </Label>
                </div>
                <Switch
                  id="leave-toggle"
                  checked={preferences.notificationTypes.leave}
                  onCheckedChange={(checked) => updateNotificationType("leave", checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="general-toggle" className="text-sm font-normal">
                    General Notifications
                  </Label>
                </div>
                <Switch
                  id="general-toggle"
                  checked={preferences.notificationTypes.general}
                  onCheckedChange={(checked) => updateNotificationType("general", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Quiet Hours</CardTitle>
                  <CardDescription>
                    Mute notification sounds during specific hours
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="quiet-toggle" className="text-sm">
                  Enable quiet hours
                </Label>
                <Switch
                  id="quiet-toggle"
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) => updateQuietHours({ enabled: checked })}
                />
              </div>
              
              {preferences.quietHours.enabled && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-sm">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={preferences.quietHours.startTime}
                        onChange={(e) => updateQuietHours({ startTime: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time" className="text-sm">End Time</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={preferences.quietHours.endTime}
                        onChange={(e) => updateQuietHours({ endTime: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sounds will be muted from {preferences.quietHours.startTime} to {preferences.quietHours.endTime}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Reset Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotificationPreferences;
