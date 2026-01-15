import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {activeChat.type === 'conversation' && !activeChat.isGroup ? (
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherParticipant?.avatar_url || undefined} />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {getInitials(activeChat.name)}
                </AvatarFallback>
              </Avatar>
              {otherParticipant?.is_online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
              )}
            </div>
          ) : activeChat.type === 'space' ? (
            <>
              {/* Hidden file input for space icon upload */}
              <input
                ref={spaceIconInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleSpaceIconUpload}
              />
              <div 
                className={cn(
                  "relative flex items-center justify-center h-10 w-10 rounded bg-primary/10 text-primary font-semibold",
                  isSpaceAdmin && "cursor-pointer group"
                )}
                onClick={() => isSpaceAdmin && spaceIconInputRef.current?.click()}
                title={isSpaceAdmin ? "Click to change space icon" : undefined}
              >
                {isUploadingIcon ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : spaceIconUrl ? (
                  <img src={spaceIconUrl} alt={activeChat.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  activeChat.name.charAt(0).toUpperCase()
                )}
                {/* Camera overlay for admins on hover */}
                {isSpaceAdmin && !isUploadingIcon && (
                  <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarImage src={activeChat.iconUrl || undefined} />
              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                {getInitials(activeChat.name)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {activeChat.type === 'space' && <span className="text-muted-foreground">#</span>}
              <h2 className="font-semibold text-foreground truncate">{activeChat.name}</h2>
            </div>
            {otherParticipant?.position && (
              <p className="text-xs text-muted-foreground truncate">{otherParticipant.position}</p>
            )}
            {activeChat.type === 'space' && (
              <p className="text-xs text-muted-foreground">{memberCount} members</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleFavorite.mutate({
              conversationId: conversationId || undefined,
              spaceId: spaceId || undefined,
            })}
          >
            <Star className={cn("h-4 w-4", isFavorited && "fill-yellow-500 text-yellow-500")} />
          </Button>
          
          {/* 3-dot dropdown menu for spaces */}
          {activeChat.type === 'space' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  View members
                </DropdownMenuItem>
                {isSpaceAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => setShowAddMembersDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add members
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Space settings
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggleSpaceMute}>
                  {spaceNotificationSetting === 'mute' ? (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Unmute notifications
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Mute notifications
                    </>
                  )}
                </DropdownMenuItem>
                {/* Leave space option - conditional based on admin status */}
                {isSpaceAdmin ? (
                  canAdminLeaveDirectly ? (
                    <DropdownMenuItem 
                      onClick={() => setShowLeaveConfirm(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave space
                    </DropdownMenuItem>
                  ) : nonAdminMembers.length > 0 ? (
                    <DropdownMenuItem 
                      onClick={() => setShowTransferAdminDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave space (transfer admin)
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      disabled 
                      className="text-muted-foreground"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Cannot leave (only member)
                    </DropdownMenuItem>
                  )
                ) : (
                  <DropdownMenuItem 
                    onClick={() => setShowLeaveConfirm(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave space
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* 3-dot dropdown menu for conversations */}
          {activeChat.type === 'conversation' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={handleToggleMute}>
                  {isMuted ? (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Unmute chat
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Mute chat
                    </>
                  )}
                </DropdownMenuItem>
                {activeChat.isGroup && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowLeaveConfirm(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave group
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {isMobileOverlay && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

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
                    <span>Created {format(new Date(spaceDetails.created_at), "MMM d, yyyy")}</span>
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
              <div className="space-y-2">
                {sharedFiles.map((file) => (
                  <div 
                    key={file.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.file_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </p>
                    </div>
                  </div>
                ))}
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
    </div>
  );
};

export default ChatRightPanelEnhanced;
