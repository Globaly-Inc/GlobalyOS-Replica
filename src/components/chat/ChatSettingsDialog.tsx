import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  MessageCircle,
  Hash,
  AtSign,
  SmilePlus,
  Play,
  RotateCcw,
} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useChatNotificationPreferences } from "@/hooks/useChatNotificationPreferences";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { SOUND_OPTIONS, SoundType } from "@/hooks/useNotificationPreferences";
import { cn } from "@/lib/utils";

interface ChatSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatSettingsDialog = ({ open, onOpenChange }: ChatSettingsDialogProps) => {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications();
  const {
    preferences,
    updateSoundEnabled,
    updateSoundType,
    updateNotificationType,
    resetToDefaults,
  } = useChatNotificationPreferences();
  const { playNotificationSound } = useNotificationSound();
  const [playingSound, setPlayingSound] = useState<SoundType | null>(null);

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handlePlaySound = (soundType: SoundType) => {
    setPlayingSound(soundType);
    playNotificationSound(soundType);
    setTimeout(() => setPlayingSound(null), 500);
  };

  const getPushStatusText = () => {
    if (!isSupported) return "Not supported in this browser";
    if (permission === "denied") return "Blocked by browser";
    if (isSubscribed) return "Enabled";
    return "Disabled";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Push Notifications Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Push Notifications</h3>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Browser notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    {getPushStatusText()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isSubscribed ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={loading || !isSupported || permission === "denied"}
                  />
                </div>
              </div>
            </div>

            {/* Sound Settings Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Notification Sound</h3>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable chat sounds</Label>
                  <p className="text-xs text-muted-foreground">
                    Play sound when receiving messages
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {preferences.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-primary" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={preferences.soundEnabled}
                    onCheckedChange={updateSoundEnabled}
                  />
                </div>
              </div>

              {preferences.soundEnabled && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {SOUND_OPTIONS.map((sound) => (
                    <button
                      key={sound.value}
                      onClick={() => updateSoundType(sound.value)}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 text-left text-sm transition-colors",
                        preferences.soundType === sound.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div>
                        <p className="font-medium">{sound.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {sound.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySound(sound.value);
                        }}
                      >
                        <Play
                          className={cn(
                            "h-4 w-4",
                            playingSound === sound.value && "text-primary"
                          )}
                        />
                      </Button>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Types Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Notification Types</h3>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Direct Messages</Label>
                      <p className="text-xs text-muted-foreground">
                        1-on-1 and group chats
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.notificationTypes.directMessages}
                    onCheckedChange={(checked) =>
                      updateNotificationType("directMessages", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Space Messages</Label>
                      <p className="text-xs text-muted-foreground">
                        Messages in channels
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.notificationTypes.spaceMessages}
                    onCheckedChange={(checked) =>
                      updateNotificationType("spaceMessages", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Mentions</Label>
                      <p className="text-xs text-muted-foreground">
                        When someone @mentions you
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.notificationTypes.mentions}
                    onCheckedChange={(checked) =>
                      updateNotificationType("mentions", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SmilePlus className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Reactions</Label>
                      <p className="text-xs text-muted-foreground">
                        When someone reacts to your message
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.notificationTypes.reactions}
                    onCheckedChange={(checked) =>
                      updateNotificationType("reactions", checked)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={resetToDefaults}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
