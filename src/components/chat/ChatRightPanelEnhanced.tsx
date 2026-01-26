import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  X,
  Pin,
  Link2,
  Plus,
  ChevronDown,
  Users,
  Info,
  FileText,
  Star,
  Mail,
  MapPin,
  Clock,
  Calendar,
  Shield,
  MoreVertical,
  UserCircle,
  Crown,
  UserMinus,
  Settings,
  UserPlus,
  Bell,
  BellOff,
  LogOut,
  Camera,
  Loader2,
  Play,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import MessageSearch from "./MessageSearch";
import { PDFViewer } from "@/components/feed/PDFViewer";
import { VideoPlayer } from "@/components/feed/VideoPlayer";
import { format } from "date-fns";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import { 
  usePinnedMessages, 
  useSpaceMembers,
  useConversationParticipants,
  useUpdateSpaceMemberRole,
  useRemoveSpaceMember,
  useMuteConversation,
  useLeaveConversation,
  useLeaveSpace,
  useUpdateSpaceNotification,
  useUpdateSpace,
} from "@/services/useChat";
import { useChatFavorites, useToggleFavorite } from "@/hooks/useChatFavorites";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveChat, ChatSpace, ChatSpaceMember } from "@/types/chat";
import { cn } from "@/lib/utils";
import SpaceMembersDialog from "./SpaceMembersDialog";
import AddSpaceMembersDialog from "./AddSpaceMembersDialog";
import AddResourceDialog from "./AddResourceDialog";
import SpaceSettingsDialog from "./SpaceSettingsDialog";
import TransferAdminDialog from "./TransferAdminDialog";

interface ChatRightPanelEnhancedProps {
  activeChat: ActiveChat;
  onClose: () => void;
  onBack: () => void;
  isMobileOverlay?: boolean;
}

interface SpaceDetails {
  description: string | null;
  space_type: 'collaboration' | 'announcements';
  access_type: 'public' | 'private';
  access_scope: string | null;
  created_at: string;
  created_by: string;
  creator_name?: string;
}

interface OtherParticipantDetails {
  id: string;
  position: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
  timezone?: string;
  office_name?: string | null;
}

const ChatRightPanelEnhanced = ({ activeChat, onClose, onBack, isMobileOverlay = false }: ChatRightPanelEnhancedProps) => {
  const navigate = useNavigate();
  const { orgCode } = useParams();
  const spaceIconInputRef = useRef<HTMLInputElement>(null);
  
  const [aboutOpen, setAboutOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(true);
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);
  
  const [spaceDetails, setSpaceDetails] = useState<SpaceDetails | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<OtherParticipantDetails | null>(null);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [spaceIconUrl, setSpaceIconUrl] = useState<string | null>(activeChat.iconUrl || null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  
  // Dialog states
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const [showAddResourceDialog, setShowAddResourceDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTransferAdminDialog, setShowTransferAdminDialog] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Shared files lightbox state
  const [filesLightboxOpen, setFilesLightboxOpen] = useState(false);
  const [filesLightboxIndex, setFilesLightboxIndex] = useState(0);
  
  const { data: currentEmployee } = useCurrentEmployee();
  const updateRole = useUpdateSpaceMemberRole();
  const removeMember = useRemoveSpaceMember();
  const muteConversation = useMuteConversation();
  const leaveConversation = useLeaveConversation();
  const leaveSpace = useLeaveSpace();
  const updateSpaceNotification = useUpdateSpaceNotification();
  const updateSpace = useUpdateSpace();
  const { data: favorites = [] } = useChatFavorites();
  const toggleFavorite = useToggleFavorite();

  const conversationId = activeChat.type === 'conversation' ? activeChat.id : null;
  const spaceId = activeChat.type === 'space' ? activeChat.id : null;
  
  const { data: pinnedMessages = [] } = usePinnedMessages(conversationId, spaceId);
  const { data: spaceMembers = [] } = useSpaceMembers(spaceId);
  const { data: conversationParticipants = [] } = useConversationParticipants(
    activeChat.isGroup ? conversationId : null
  );
  
  // Update local icon URL when activeChat changes
  useEffect(() => {
    setSpaceIconUrl(activeChat.iconUrl || null);
  }, [activeChat.id, activeChat.iconUrl]);

  const isFavorited = favorites.some(f => 
    (conversationId && f.conversation_id === conversationId) ||
    (spaceId && f.space_id === spaceId)
  );

  // Fetch space details
  useEffect(() => {
    const fetchSpaceDetails = async () => {
      if (!spaceId) {
        setSpaceDetails(null);
        return;
      }

      const { data: space } = await supabase
        .from('chat_spaces')
        .select(`
          description,
          space_type,
          access_type,
          access_scope,
          created_at,
          created_by,
          employees:created_by (
            profiles:user_id (
              full_name
            )
          )
        `)
        .eq('id', spaceId)
        .single();

      if (space) {
        setSpaceDetails({
          description: space.description,
          space_type: space.space_type as 'collaboration' | 'announcements',
          access_type: space.access_type as 'public' | 'private',
          access_scope: space.access_scope,
          created_at: space.created_at,
          created_by: space.created_by,
          creator_name: (space.employees as any)?.profiles?.full_name,
        });
      }
    };

    fetchSpaceDetails();
  }, [spaceId]);

  // Fetch other participant details for DMs
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
        .select('id, position, user_id, office_id, offices:office_id(name)')
        .eq('id', otherEmployeeId)
        .single();

      if (!employee) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, email, timezone')
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

      const officeName = (employee as any).offices?.name || null;

      setOtherParticipant({
        id: employee.id,
        position: employee.position,
        email: profile?.email || null,
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        is_online: isOnline,
        timezone: profile?.timezone || undefined,
        office_name: officeName,
      });
    };

    fetchOtherParticipant();
  }, [activeChat, currentEmployee?.id]);

  // Fetch shared files
  useEffect(() => {
    const fetchSharedFiles = async () => {
      let query = supabase
        .from('chat_attachments')
        .select(`
          id,
          file_name,
          file_path,
          file_type,
          file_size,
          created_at,
          chat_messages!inner (
            conversation_id,
            space_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (conversationId) {
        query = query.eq('chat_messages.conversation_id', conversationId);
      } else if (spaceId) {
        query = query.eq('chat_messages.space_id', spaceId);
      } else {
        setSharedFiles([]);
        return;
      }

      const { data } = await query;
      setSharedFiles(data || []);
    };

    fetchSharedFiles();
  }, [conversationId, spaceId]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // File type detection helpers for preview
  const isImageFile = (fileType: string | null) => fileType?.startsWith('image/');
  const isVideoFile = (fileType: string | null) => fileType?.startsWith('video/');
  const isPdfFile = (fileType: string | null, fileName?: string) => 
    fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');

  const getFilePublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Lightbox navigation
  const currentLightboxFile = sharedFiles[filesLightboxIndex];
  const goToPrevFile = () => {
    setFilesLightboxIndex((prev) => (prev === 0 ? sharedFiles.length - 1 : prev - 1));
  };
  const goToNextFile = () => {
    setFilesLightboxIndex((prev) => (prev === sharedFiles.length - 1 ? 0 : prev + 1));
  };

  const members = spaceId ? spaceMembers : conversationParticipants;
  const memberCount = members.length;

  // Check if current user is a space admin
  const currentMembership = spaceMembers.find(m => m.employee_id === currentEmployee?.id);
  const isSpaceAdmin = currentMembership?.role === 'admin';
  const spaceNotificationSetting = currentMembership?.notification_setting || 'all';
  
  // Count admins and get non-admin members for transfer
  const adminCount = spaceMembers.filter(m => m.role === 'admin').length;
  const nonAdminMembers = spaceMembers.filter(m => 
    m.role !== 'admin' && m.employee_id !== currentEmployee?.id
  ) as ChatSpaceMember[];
  
  // Can admin leave: either there are 2+ admins, or they transfer first
  const canAdminLeaveDirectly = adminCount >= 2;

  // Handle mute toggle for conversations
  const handleToggleMute = async () => {
    if (conversationId) {
      await muteConversation.mutateAsync({ conversationId, mute: !isMuted });
      setIsMuted(!isMuted);
    }
  };

  // Handle space notification toggle (mute = 'mute', unmute = 'all')
  const handleToggleSpaceMute = async () => {
    if (spaceId) {
      const newSetting = spaceNotificationSetting === 'mute' ? 'all' : 'mute';
      await updateSpaceNotification.mutateAsync({ spaceId, setting: newSetting });
    }
  };

  // Handle leave conversation/space
  const handleLeave = async () => {
    try {
      if (conversationId) {
        await leaveConversation.mutateAsync(conversationId);
        onBack();
      } else if (spaceId) {
        await leaveSpace.mutateAsync(spaceId);
        onBack();
      }
      setShowLeaveConfirm(false);
    } catch (error) {
      showErrorToast(error, "Failed to leave chat", {
        componentName: "ChatRightPanelEnhanced",
        actionAttempted: activeChat.type === 'space' ? "Leave space" : "Leave conversation",
        errorType: "database",
      });
    }
  };

  // Handle space icon upload
  const handleSpaceIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !spaceId || !currentEmployee?.organization_id) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    setIsUploadingIcon(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `space-icons/${spaceId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Update space with new icon URL
      await updateSpace.mutateAsync({
        spaceId,
        iconUrl: publicUrl,
      });

      setSpaceIconUrl(publicUrl);
      toast.success("Space icon updated");
    } catch (error) {
      showErrorToast(error, "Failed to upload icon", {
        componentName: "ChatRightPanelEnhanced",
        actionAttempted: "Upload space icon",
        errorType: "network",
      });
    } finally {
      setIsUploadingIcon(false);
      // Reset input
      if (spaceIconInputRef.current) {
        spaceIconInputRef.current.value = '';
      }
    }
  };

  // Member management handlers
  const handleViewMember = (employeeId: string) => {
    navigate(`/org/${orgCode}/team/${employeeId}`);
  };

  const handlePromote = async (member: any) => {
    const profile = member.employee?.profiles || member.employees?.profiles;
    try {
      await updateRole.mutateAsync({
        spaceId: spaceId!,
        employeeId: member.employee_id,
        role: 'admin'
      });
      toast.success(`${profile?.full_name || 'Member'} is now an admin`);
    } catch (error) {
      showErrorToast(error, "Failed to promote member");
    }
  };

  const handleDemote = async (member: any) => {
    const profile = member.employee?.profiles || member.employees?.profiles;
    try {
      await updateRole.mutateAsync({
        spaceId: spaceId!,
        employeeId: member.employee_id,
        role: 'member'
      });
      toast.success(`${profile?.full_name || 'Member'} is now a regular member`);
    } catch (error) {
      showErrorToast(error, "Failed to change member role");
    }
  };

  const handleRemove = async (member: any) => {
    const profile = member.employee?.profiles || member.employees?.profiles;
    try {
      await removeMember.mutateAsync({
        spaceId: spaceId!,
        employeeId: member.employee_id
      });
      toast.success(`${profile?.full_name || 'Member'} has been removed from the space`);
    } catch (error) {
      showErrorToast(error, "Failed to remove member");
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border w-80">
      {/* Hidden file input for space icon upload */}
      {activeChat.type === 'space' && (
        <input
          ref={spaceIconInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleSpaceIconUpload}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        {/* Left: Back button (mobile) + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isMobileOverlay && (
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {activeChat.type === 'space' && <span className="text-muted-foreground">#</span>}
              <h2 className="font-semibold text-foreground truncate text-sm">{activeChat.name}</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeChat.type === 'space' 
                ? `${memberCount} members` 
                : activeChat.isGroup 
                ? 'Group' 
                : 'Direct message'}
            </p>
          </div>
        </div>
        
        {/* Right: Action buttons - Mute, Favorite, Search */}
        <div className="flex items-center gap-0.5">
          {/* Mute Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={activeChat.type === 'space' ? handleToggleSpaceMute : handleToggleMute}
              >
                {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted) ? (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted)
                ? 'Unmute notifications'
                : 'Mute notifications'}
            </TooltipContent>
          </Tooltip>

          {/* Favorite Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleFavorite.mutate({
                  conversationId: conversationId || undefined,
                  spaceId: spaceId || undefined,
                })}
              >
                <Star className={cn(
                  "h-4 w-4",
                  isFavorited && "fill-orange-500 text-orange-500"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            </TooltipContent>
          </Tooltip>

          {/* Search Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", showSearch && "bg-accent")}
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search messages</TooltipContent>
          </Tooltip>
          
          {/* Close button for mobile only */}
          {isMobileOverlay && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Message Search Panel */}
      <MessageSearch
        conversationId={conversationId}
        spaceId={spaceId}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onResultClick={(messageId) => {
          const messageElement = document.getElementById(`message-${messageId}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('ring-2', 'ring-primary');
            setTimeout(() => {
              messageElement.classList.remove('ring-2', 'ring-primary');
            }, 2000);
          }
          setShowSearch(false);
        }}
      />

      <ScrollArea className="flex-1">
        {/* About Section */}
        <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">About</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", aboutOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-3 text-sm">
              {/* DM: Show profile info */}
              {activeChat.type === 'conversation' && !activeChat.isGroup && otherParticipant && (
                <>
                  {otherParticipant.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{otherParticipant.email}</span>
                    </div>
                  )}
                  {otherParticipant.office_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{otherParticipant.office_name}</span>
                    </div>
                  )}
                  {otherParticipant.timezone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>{otherParticipant.timezone}</span>
                    </div>
                  )}
                </>
              )}

              {/* Space: Show space info */}
              {activeChat.type === 'space' && spaceDetails && (
                <>
                  {spaceDetails.description && (
                    <p className="text-muted-foreground">{spaceDetails.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    <span className="capitalize">
                      {spaceDetails.access_type} • {spaceDetails.space_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>Created {format(new Date(spaceDetails.created_at), "dd MMM yyyy")}</span>
                  </div>
                  {spaceDetails.creator_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span>Created by {spaceDetails.creator_name}</span>
                    </div>
                  )}
                </>
              )}

              {/* Group chat: Show creation info */}
              {activeChat.type === 'conversation' && activeChat.isGroup && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>{memberCount} members</span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Members Section (for groups and spaces) */}
        {(activeChat.isGroup || activeChat.type === 'space') && (
          <Collapsible open={membersOpen} onOpenChange={setMembersOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-accent/50 transition-colors border-t border-border">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Members</span>
                <span className="text-xs text-muted-foreground">({memberCount})</span>
              </div>
              <div className="flex items-center gap-1">
                {isSpaceAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMembersDialog(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", membersOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-1">
                {members.slice(0, 10).map((member: any) => {
                  const employee = member.employee || member.employees;
                  const profile = employee?.profiles;
                  const isAdmin = member.role === 'admin';
                  const isSelf = member.employee_id === currentEmployee?.id;

                  return (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-2 p-1.5 -mx-1.5 rounded-lg group hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {getInitials(profile?.full_name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm truncate">{profile?.full_name || "Unknown"}</span>
                          {isAdmin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        {profile?.email && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {profile.email}
                          </span>
                        )}
                      </div>
                      
                      {/* 3-dot menu - visible on hover for admins, cannot modify self */}
                      {isSpaceAdmin && !isSelf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
                            <DropdownMenuItem onClick={() => handleViewMember(member.employee_id)}>
                              <UserCircle className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            {isAdmin ? (
                              <DropdownMenuItem onClick={() => handleDemote(member)}>
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handlePromote(member)}>
                                <Crown className="h-4 w-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleRemove(member)}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Space
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
                {memberCount > 10 && (
                  <Button 
                    variant="link" 
                    className="w-full text-xs text-primary p-0 h-auto mt-2"
                    onClick={() => setShowMembersDialog(true)}
                  >
                    View all {memberCount} members
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Pinned Messages Section */}
        <Collapsible open={pinnedOpen} onOpenChange={setPinnedOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-accent/50 transition-colors border-t border-border">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Pinned Messages</span>
              {pinnedMessages.length > 0 && (
                <span className="text-xs text-muted-foreground">({pinnedMessages.length})</span>
              )}
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", pinnedOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            {pinnedMessages.length === 0 ? (
              <div className="text-center py-4">
                <Pin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pinned messages yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pinnedMessages.map((message) => (
                  <div 
                    key={message.id}
                    className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={message.sender?.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {getInitials(message.sender?.profiles?.full_name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">
                        {message.sender?.profiles?.full_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {format(new Date(message.created_at), "MMM d")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Shared Files Section */}
        <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-accent/50 transition-colors border-t border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Shared Files</span>
              {sharedFiles.length > 0 && (
                <span className="text-xs text-muted-foreground">({sharedFiles.length})</span>
              )}
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", filesOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            {sharedFiles.length === 0 ? (
              <div className="text-center py-4">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No files shared yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {sharedFiles.map((file, index) => {
                  const publicUrl = getFilePublicUrl(file.file_path);
                  const fileIsImage = isImageFile(file.file_type);
                  const fileIsVideo = isVideoFile(file.file_type);
                  const fileIsPdf = isPdfFile(file.file_type, file.file_name);
                  
                  return (
                    <button
                      key={file.id}
                      onClick={() => {
                        setFilesLightboxIndex(index);
                        setFilesLightboxOpen(true);
                      }}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-muted/50 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer text-left"
                    >
                      {fileIsImage ? (
                        <img
                          src={publicUrl}
                          alt={file.file_name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : fileIsVideo ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 rounded-full bg-black/60 flex items-center justify-center">
                              <Play className="h-4 w-4 text-white ml-0.5" />
                            </div>
                          </div>
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      ) : fileIsPdf ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10">
                          <FileText className="h-6 w-6 text-destructive" />
                          <span className="text-[9px] font-medium text-destructive mt-1">PDF</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground mt-1 uppercase">
                            {file.file_name?.split('.').pop() || 'FILE'}
                          </span>
                        </div>
                      )}
                      
                      {/* Hover overlay with filename */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white truncate">{file.file_name}</p>
                        <p className="text-[8px] text-white/70">{formatFileSize(file.file_size)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Add Resources */}
        <div className="px-4 py-3 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-primary"
            onClick={() => setShowAddResourceDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Add Resources
          </Button>
        </div>
      </ScrollArea>

      {/* Dialogs */}
      {spaceId && (
        <>
          <SpaceMembersDialog
            open={showMembersDialog}
            onOpenChange={setShowMembersDialog}
            spaceId={spaceId}
            spaceName={activeChat.name}
            onAddMembers={() => {
              setShowMembersDialog(false);
              setShowAddMembersDialog(true);
            }}
          />
          <AddSpaceMembersDialog
            open={showAddMembersDialog}
            onOpenChange={setShowAddMembersDialog}
            spaceId={spaceId}
            spaceName={activeChat.name}
          />
          <SpaceSettingsDialog
            open={showSettingsDialog}
            onOpenChange={setShowSettingsDialog}
            spaceId={spaceId}
            onDeleted={onBack}
            onArchived={onBack}
          />
          <TransferAdminDialog
            open={showTransferAdminDialog}
            onOpenChange={setShowTransferAdminDialog}
            spaceId={spaceId}
            spaceName={activeChat.name}
            members={nonAdminMembers}
            onTransferComplete={() => {
              setShowTransferAdminDialog(false);
              onBack();
            }}
          />
        </>
      )}

      <AddResourceDialog
        open={showAddResourceDialog}
        onOpenChange={setShowAddResourceDialog}
        conversationId={conversationId}
        spaceId={spaceId}
      />
      
      {/* Leave Confirmation Dialog */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Leave {activeChat.type === 'space' ? 'space' : 'group'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You won't receive any more messages from this {activeChat.type === 'space' ? 'space' : 'group'}. 
              {activeChat.type === 'space' && " You can rejoin later if it's a public space."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaveConversation.isPending || leaveSpace.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(leaveConversation.isPending || leaveSpace.isPending) ? "Leaving..." : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shared Files Lightbox */}
      <Dialog open={filesLightboxOpen} onOpenChange={setFilesLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setFilesLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation buttons */}
            {sharedFiles.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                  onClick={goToPrevFile}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                  onClick={goToNextFile}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Current file preview */}
            <div className="p-8">
              {currentLightboxFile && (
                isImageFile(currentLightboxFile.file_type) ? (
                  <img
                    src={getFilePublicUrl(currentLightboxFile.file_path)}
                    alt={currentLightboxFile.file_name}
                    className="max-w-full max-h-[80vh] mx-auto rounded-lg"
                  />
                ) : isVideoFile(currentLightboxFile.file_type) ? (
                  <video
                    src={getFilePublicUrl(currentLightboxFile.file_path)}
                    controls
                    autoPlay
                    className="max-w-full max-h-[80vh] mx-auto rounded-lg"
                  />
                ) : isPdfFile(currentLightboxFile.file_type, currentLightboxFile.file_name) ? (
                  <PDFViewer
                    fileUrl={getFilePublicUrl(currentLightboxFile.file_path)}
                    mode="lightbox"
                    className="min-h-[500px]"
                  />
                ) : (
                  <div className="text-center text-white">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg mb-2">{currentLightboxFile.file_name}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {formatFileSize(currentLightboxFile.file_size)}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => window.open(getFilePublicUrl(currentLightboxFile.file_path), '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )
              )}
            </div>

            {/* Dots indicator */}
            {sharedFiles.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {sharedFiles.map((_, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      idx === filesLightboxIndex ? "bg-white" : "bg-white/40"
                    )}
                    onClick={() => setFilesLightboxIndex(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatRightPanelEnhanced;
