import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Bell,
  BellOff,
  Star,
  Pencil,
  Camera,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useChatFavorites, useToggleFavorite } from "@/hooks/useChatFavorites";
import { 
  useSpace,
  useSpaceMembers,
  useConversationParticipants,
  useMuteConversation,
  useUpdateSpaceNotification,
  useUpdateConversation,
  useUpdateSpace,
} from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { supabase } from "@/integrations/supabase/client";
import InlineSearchResults from "./InlineSearchResults";
import EditGroupChatDialog from "./EditGroupChatDialog";
import { ImageCropper } from "@/components/ui/image-cropper";
import type { ActiveChat } from "@/types/chat";

interface OtherParticipant {
  id: string;
  position: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

interface ChatHeaderProps {
  activeChat: ActiveChat;
  onSearchResultClick?: (messageId: string) => void;
}

const ChatHeader = ({ activeChat, onSearchResultClick }: ChatHeaderProps) => {
  const navigate = useNavigate();
  const { orgCode } = useParams();
  const { data: currentEmployee } = useCurrentEmployee();
  const { data: favorites = [] } = useChatFavorites();
  const toggleFavorite = useToggleFavorite();
  const muteConversation = useMuteConversation();
  const updateSpaceNotification = useUpdateSpaceNotification();
  const updateSpace = useUpdateSpace();
  
  const [otherParticipant, setOtherParticipant] = useState<OtherParticipant | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCurrentIndex, setSearchCurrentIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [groupIconUrl, setGroupIconUrl] = useState<string | null>(activeChat.iconUrl || null);
  const [groupName, setGroupName] = useState(activeChat.name);
  const [isMuted, setIsMuted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(groupName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Space name editing state
  const [isEditingSpaceName, setIsEditingSpaceName] = useState(false);
  const [editSpaceNameValue, setEditSpaceNameValue] = useState(activeChat.name);
  const [isSavingSpaceName, setIsSavingSpaceName] = useState(false);
  
  // Space icon editing state
  const [spaceIconUrl, setSpaceIconUrl] = useState<string | null>(null);
  const [isUploadingSpacePhoto, setIsUploadingSpacePhoto] = useState(false);
  const [spaceCropperOpen, setSpaceCropperOpen] = useState(false);
  const [spaceTempImageSrc, setSpaceTempImageSrc] = useState<string | null>(null);
  const spaceFileInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  // Clear search when closed
  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchCurrentIndex(0);
  };

  // Handle keyboard navigation for search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCloseSearch();
    }
  };

  const updateConversation = useUpdateConversation();
  const { currentOrg } = useOrganization();

  const conversationId = activeChat.type === 'conversation' ? activeChat.id : null;
  const spaceId = activeChat.type === 'space' ? activeChat.id : null;

  const { data: space } = useSpace(spaceId);
  const { data: spaceMembers = [] } = useSpaceMembers(spaceId);
  const { data: conversationParticipants = [] } = useConversationParticipants(activeChat.isGroup ? conversationId : null);

  // Check if current user is a group admin
  const currentGroupMembership = conversationParticipants.find(
    p => p.employee_id === currentEmployee?.id
  );
  const isGroupAdmin = activeChat.isGroup && currentGroupMembership?.role === 'admin';

  // Check space notification setting and admin status
  const currentMembership = spaceMembers.find(m => m.employee_id === currentEmployee?.id);
  const spaceNotificationSetting = currentMembership?.notification_setting || 'all';
  const isSpaceAdmin = activeChat.type === 'space' && currentMembership?.role === 'admin';

  // Check if favorited
  const isFavorited = favorites.some(f => 
    (conversationId && f.conversation_id === conversationId) || 
    (spaceId && f.space_id === spaceId)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle mute toggle for conversations
  const handleToggleMute = async () => {
    if (conversationId) {
      await muteConversation.mutateAsync({ conversationId, mute: !isMuted });
      setIsMuted(!isMuted);
    }
  };

  // Handle space notification toggle
  const handleToggleSpaceMute = async () => {
    if (spaceId) {
      const newSetting = spaceNotificationSetting === 'mute' ? 'all' : 'mute';
      await updateSpaceNotification.mutateAsync({ spaceId, setting: newSetting });
    }
  };

  // Inline name editing handlers
  const handleSaveGroupName = async () => {
    if (!conversationId || editNameValue.trim() === groupName) {
      setIsEditingName(false);
      return;
    }
    
    // Admin check
    if (!isGroupAdmin) {
      toast.error("Only group admins can change the group name");
      setIsEditingName(false);
      return;
    }
    
    setIsSavingName(true);
    const previousName = groupName;
    
    try {
      await updateConversation.mutateAsync({
        conversationId,
        name: editNameValue.trim()
      });
      
      // Log the change as a system event
      if (currentOrg?.id && currentEmployee?.id) {
        const actorName = currentEmployee?.profiles?.full_name || 'Someone';
        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          conversation_id: conversationId,
          sender_id: currentEmployee.id,
          content: `${actorName} changed the group name`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'group_name_changed',
            target_employee_id: currentEmployee.id,
            target_name: actorName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName,
            old_value: previousName,
            new_value: editNameValue.trim()
          }
        });
      }
      
      setGroupName(editNameValue.trim());
      toast.success("Group name updated");
    } catch (error) {
      toast.error("Failed to update group name");
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditNameValue(groupName);
    setIsEditingName(false);
  };

  // Space name editing handlers
  const handleSaveSpaceName = async () => {
    if (!spaceId || editSpaceNameValue.trim() === activeChat.name) {
      setIsEditingSpaceName(false);
      return;
    }
    
    if (!isSpaceAdmin) {
      toast.error("Only space admins can change the space name");
      setIsEditingSpaceName(false);
      return;
    }
    
    setIsSavingSpaceName(true);
    try {
      await updateSpace.mutateAsync({
        spaceId,
        name: editSpaceNameValue.trim()
      });
      toast.success("Space name updated");
    } catch (error) {
      toast.error("Failed to update space name");
      setEditSpaceNameValue(activeChat.name);
    } finally {
      setIsSavingSpaceName(false);
      setIsEditingSpaceName(false);
    }
  };

  const handleCancelSpaceEdit = () => {
    setEditSpaceNameValue(activeChat.name);
    setIsEditingSpaceName(false);
  };

  // Space photo selection handler (opens cropper)
  const handleSpacePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Admin check
    if (!isSpaceAdmin) {
      toast.error("Only space admins can change the space icon");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Read file and open cropper
    const reader = new FileReader();
    reader.onloadend = () => {
      setSpaceTempImageSrc(reader.result as string);
      setSpaceCropperOpen(true);
    };
    reader.readAsDataURL(file);
    
    if (spaceFileInputRef.current) spaceFileInputRef.current.value = '';
  };

  // Handle cropped space image upload
  const handleSpaceCropComplete = async (croppedBlob: Blob) => {
    if (!currentOrg?.id || !spaceId) return;

    setIsUploadingSpacePhoto(true);
    try {
      const fileName = `${Date.now()}.png`;
      const filePath = `${currentOrg.id}/space-icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await updateSpace.mutateAsync({
        spaceId,
        iconUrl: publicUrl
      });

      setSpaceIconUrl(publicUrl);
      toast.success("Space icon updated");
    } catch (error) {
      toast.error("Failed to update space icon");
    } finally {
      setIsUploadingSpacePhoto(false);
      setSpaceTempImageSrc(null);
    }
  };

  // Direct photo upload handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg?.id || !conversationId) return;

    // Admin check
    if (!isGroupAdmin) {
      toast.error("Only group admins can change the group photo");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${currentOrg.id}/group-icons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await updateConversation.mutateAsync({
        conversationId,
        iconUrl: publicUrl
      });

      // Log the change as a system event
      if (currentEmployee?.id) {
        const actorName = currentEmployee?.profiles?.full_name || 'Someone';
        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          conversation_id: conversationId,
          sender_id: currentEmployee.id,
          content: `${actorName} updated the group photo`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'group_photo_changed',
            target_employee_id: currentEmployee.id,
            target_name: actorName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName
          }
        });
      }

      setGroupIconUrl(publicUrl);
      toast.success("Group photo updated");
    } catch (error) {
      toast.error("Failed to update group photo");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Update local state when activeChat changes
  useEffect(() => {
    setGroupIconUrl(activeChat.iconUrl || null);
    setGroupName(activeChat.name);
    setEditSpaceNameValue(activeChat.name);
    setSpaceIconUrl(null); // Reset, will be set from space data
  }, [activeChat.id, activeChat.iconUrl, activeChat.name]);

  // Sync space icon from space data
  useEffect(() => {
    if (space?.icon_url) {
      setSpaceIconUrl(space.icon_url);
    }
  }, [space?.icon_url]);

  // Fetch other participant details for direct chats
  useEffect(() => {
    const fetchOtherParticipant = async () => {
      if (activeChat.type !== 'conversation' || activeChat.isGroup || !currentEmployee?.id) {
        setOtherParticipant(null);
        return;
      }

      const { data: participants } = await supabase
        .from('chat_participants')
        .select('employee_id')
        .eq('conversation_id', activeChat.id)
        .neq('employee_id', currentEmployee.id)
        .limit(1);

      if (!participants?.[0]) return;

      const otherEmployeeId = participants[0].employee_id;

      const { data: employee } = await supabase
        .from('employees')
        .select('id, position, user_id')
        .eq('id', otherEmployeeId)
        .single();

      if (!employee) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', employee.user_id)
        .single();

      const { data: presence } = await supabase
        .from('chat_presence')
        .select('is_online, last_seen_at')
        .eq('employee_id', otherEmployeeId)
        .single();

      const isOnline = presence?.is_online && presence?.last_seen_at
        ? (new Date().getTime() - new Date(presence.last_seen_at).getTime()) < 60000
        : false;

      setOtherParticipant({
        id: employee.id,
        position: employee.position,
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        is_online: isOnline,
      });
    };

    fetchOtherParticipant();
  }, [activeChat, currentEmployee?.id]);

  // Subscribe to presence changes
  useEffect(() => {
    if (!otherParticipant?.id) return;

    const channel = supabase
      .channel(`presence-header-${otherParticipant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_presence',
          filter: `employee_id=eq.${otherParticipant.id}`
        },
        (payload: any) => {
          if (payload.new) {
            const lastSeen = payload.new.last_seen_at ? new Date(payload.new.last_seen_at) : null;
            const isStale = lastSeen ? (new Date().getTime() - lastSeen.getTime()) > 60000 : true;
            const isOnline = payload.new.is_online && !isStale;
            setOtherParticipant(prev => prev ? { ...prev, is_online: isOnline } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherParticipant?.id]);

  const handleSearchResultClick = (messageId: string) => {
    // Scroll to the message
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-primary');
      }, 2000);
    }
    onSearchResultClick?.(messageId);
  };

  return (
    <>
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {activeChat.type === 'conversation' && !activeChat.isGroup ? (
            // Direct message - show other participant (clickable)
            <div 
              className="relative flex-shrink-0 cursor-pointer"
              onClick={() => otherParticipant?.id && navigate(`/org/${orgCode}/team/${otherParticipant.id}`)}
            >
              <Avatar className="h-10 w-10 transition-opacity hover:opacity-80">
                <AvatarImage src={otherParticipant?.avatar_url || undefined} alt={activeChat.name} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(activeChat.name)}
                </AvatarFallback>
              </Avatar>
              {otherParticipant?.is_online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
              )}
            </div>
          ) : activeChat.type === 'conversation' && activeChat.isGroup ? (
            // Group chat - show group icon with direct photo upload (admin only)
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <div 
                className={cn(
                  "relative h-10 w-10 rounded-full flex-shrink-0",
                  isGroupAdmin ? "cursor-pointer group" : ""
                )}
                onClick={() => isGroupAdmin && !isUploadingPhoto && fileInputRef.current?.click()}
              >
                {groupIconUrl ? (
                  <img 
                    src={groupIconUrl} 
                    alt={groupName} 
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full w-full rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(groupName || "GC")}
                  </div>
                )}
                {isGroupAdmin && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingPhoto ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            // Space - with editable icon for admins
            <>
              <input
                ref={spaceFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSpacePhotoSelect}
              />
              <div 
                className={cn(
                  "relative h-10 w-10 rounded flex-shrink-0 overflow-hidden",
                  isSpaceAdmin ? "cursor-pointer group" : ""
                )}
                onClick={() => isSpaceAdmin && !isUploadingSpacePhoto && spaceFileInputRef.current?.click()}
              >
                {spaceIconUrl || space?.icon_url ? (
                  <img 
                    src={spaceIconUrl || space?.icon_url} 
                    alt={activeChat.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full w-full bg-primary/10 text-primary font-semibold text-sm">
                    {activeChat.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {isSpaceAdmin && (
                  <div className="absolute inset-0 rounded bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingSpacePhoto ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="flex-1 min-w-0">
            {activeChat.type === 'conversation' && activeChat.isGroup ? (
              // Group chat info with inline editing (admin only)
              <div className="group/name">
                {isEditingName && isGroupAdmin ? (
                  // Editing mode (admin only)
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveGroupName();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="h-7 text-base font-semibold py-0 px-2 w-auto min-w-[120px]"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveGroupName}
                      disabled={isSavingName}
                      className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isSavingName ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSavingName}
                      className="p-1 rounded bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : isGroupAdmin ? (
                  // Display mode for admins (editable)
                  <div 
                    className="cursor-pointer"
                    onClick={() => {
                      setEditNameValue(groupName);
                      setIsEditingName(true);
                    }}
                  >
                    <h2 className="font-semibold text-foreground text-base flex items-center gap-1 truncate">
                      {groupName}
                      <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                    </h2>
                  </div>
                ) : (
                  // Display mode for non-admins (read-only)
                  <h2 className="font-semibold text-foreground text-base truncate">
                    {groupName}
                  </h2>
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {conversationParticipants
                    .filter(p => p.employee_id !== currentEmployee?.id)
                    .map(p => p.employee?.profiles?.full_name?.split(' ')[0])
                    .filter(Boolean)
                    .join(', ') || 'Group members'}
                </p>
              </div>
            ) : activeChat.type === 'conversation' ? (
              // Direct message info (clickable)
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => otherParticipant?.id && navigate(`/org/${orgCode}/team/${otherParticipant.id}`)}
              >
                <div className="flex items-center gap-1.5">
                  <h2 className="font-semibold text-foreground text-base truncate">{activeChat.name}</h2>
                </div>
                {otherParticipant?.position && (
                  <p className="text-xs text-muted-foreground">{otherParticipant.position}</p>
                )}
              </div>
            ) : (
              // Space info with inline editing (admin only)
              <div className="group/name">
                {isEditingSpaceName && isSpaceAdmin ? (
                  // Editing mode (admin only)
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={editSpaceNameValue}
                      onChange={(e) => setEditSpaceNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSpaceName();
                        if (e.key === 'Escape') handleCancelSpaceEdit();
                      }}
                      className="h-7 text-base font-semibold py-0 px-2 w-auto min-w-[120px]"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveSpaceName}
                      disabled={isSavingSpaceName}
                      className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isSavingSpaceName ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelSpaceEdit}
                      disabled={isSavingSpaceName}
                      className="p-1 rounded bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : isSpaceAdmin ? (
                  // Display mode for admins (editable)
                  <div 
                    className="cursor-pointer"
                    onClick={() => {
                      setEditSpaceNameValue(activeChat.name);
                      setIsEditingSpaceName(true);
                    }}
                  >
                    <h2 className="font-semibold text-foreground text-base flex items-center gap-1 truncate">
                      {activeChat.name}
                      <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                    </h2>
                  </div>
                ) : (
                  // Display mode for non-admins (read-only)
                  <h2 className="font-semibold text-foreground text-base truncate">
                    {activeChat.name}
                  </h2>
                )}
                <p className="text-xs text-muted-foreground">
                  {spaceMembers.length} member{spaceMembers.length !== 1 ? 's' : ''}
                  {(() => {
                    if (!space) return null;
                    if (space.access_scope === 'company') return ' · Everyone';
                    if (space.access_scope === 'members') return ' · Private';
                    
                    // For custom or legacy scopes, combine all criteria
                    const parts: string[] = [];
                    if (space.offices?.length) parts.push(...space.offices.map(o => o.name));
                    if (space.departments?.length) parts.push(...space.departments.map(d => d.name));
                    if (space.projects?.length) parts.push(...space.projects.map(p => p.name));
                    
                    if (parts.length === 0) return ' · Private';
                    return ` · ${parts.join(' + ')}`;
                  })()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right section - Actions with inline search */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Inline Search Bar with Portal-based Results */}
          {showSearch ? (
            <Popover 
              open={searchQuery.trim().length > 0}
              onOpenChange={(open) => {
                if (!open && searchQuery.trim()) {
                  // Don't close search when popover closes from outside click
                  // just clear the results view
                }
              }}
            >
              <div className="flex items-center gap-1.5 mr-1">
                <PopoverAnchor asChild>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="h-8 w-[200px] md:w-[260px] pl-8 pr-7 text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </PopoverAnchor>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCloseSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Search results rendered in Portal via PopoverContent */}
              <PopoverContent 
                side="bottom" 
                align="end" 
                sideOffset={6}
                className="p-0 w-[min(400px,calc(100vw-1.5rem))] max-h-[400px] overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <InlineSearchResults
                  query={searchQuery}
                  conversationId={conversationId}
                  spaceId={spaceId}
                  onResultClick={handleSearchResultClick}
                  onClose={handleCloseSearch}
                  currentIndex={searchCurrentIndex}
                  setCurrentIndex={setSearchCurrentIndex}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Search messages</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={activeChat.type === 'space' ? handleToggleSpaceMute : handleToggleMute}
              >
                {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted) ? (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted)
                ? 'Unmute notifications'
                : 'Mute notifications'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => toggleFavorite.mutate({
                  conversationId: conversationId || undefined,
                  spaceId: spaceId || undefined,
                })}
              >
                <Star className={cn("h-4 w-4", isFavorited && "fill-orange-500 text-orange-500")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            </TooltipContent>
          </Tooltip>

        </div>
      </div>

      {/* Edit Group Chat Dialog */}
      {activeChat.type === 'conversation' && activeChat.isGroup && (
        <EditGroupChatDialog
          open={showEditGroupDialog}
          onOpenChange={setShowEditGroupDialog}
          conversationId={activeChat.id}
          currentName={groupName}
          currentIconUrl={groupIconUrl}
          onUpdated={(newName, newIconUrl) => {
            setGroupName(newName);
            setGroupIconUrl(newIconUrl);
          }}
        />
      )}

      {/* Space Icon Cropper */}
      {spaceTempImageSrc && (
        <ImageCropper
          open={spaceCropperOpen}
          onOpenChange={(open) => {
            setSpaceCropperOpen(open);
            if (!open) setSpaceTempImageSrc(null);
          }}
          imageSrc={spaceTempImageSrc}
          onCropComplete={handleSpaceCropComplete}
          cropShape="square"
          aspectRatio={1}
        />
      )}
    </>
  );
};

export default ChatHeader;
