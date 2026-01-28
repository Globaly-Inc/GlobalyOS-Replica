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
  ChevronUp,
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
  MessageSquare,
  Hash,
  RefreshCw,
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
  useUpdateGroupMemberRole,
  useRemoveGroupMember,
  useSpace,
} from "@/services/useChat";
import { useExemptEmployeeIds, isExemptFromAutoSync } from "@/hooks/useExemptRoles";
import { useTeamPresence } from "@/services/useTeamData";
import { useOrganization } from "@/hooks/useOrganization";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChatFavorites, useToggleFavorite } from "@/hooks/useChatFavorites";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveChat, ChatSpace, ChatSpaceMember, ChatParticipant } from "@/types/chat";
import { cn } from "@/lib/utils";
import SpaceMembersDialog from "./SpaceMembersDialog";
import AddSpaceMembersDialog from "./AddSpaceMembersDialog";
import AddGroupMembersDialog from "./AddGroupMembersDialog";
import AddResourceDialog from "./AddResourceDialog";
import SpaceSettingsDialog from "./SpaceSettingsDialog";
import TransferAdminDialog from "./TransferAdminDialog";
import TransferGroupAdminDialog from "./TransferGroupAdminDialog";

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

// Helper functions for auto-sync tooltip
const getAutoSyncScopeLabel = (scope?: string | null): string => {
  switch (scope) {
    case 'company': return 'organization';
    case 'offices': return 'office(s)';
    case 'projects': return 'project(s)';
    default: return scope || 'custom';
  }
};

const getAutoSyncTriggers = (scope?: string | null): string[] => {
  const baseTriggers = [
    'New member added to the organization',
    'Team member is deactivated',
  ];
  
  switch (scope) {
    case 'company':
      return baseTriggers;
    case 'offices':
      return [
        ...baseTriggers,
        'Office assignment changed in team profile',
      ];
    case 'projects':
      return [
        ...baseTriggers,
        'Project assignment updated in team profile',
      ];
    default:
      return baseTriggers;
  }
};

const getAutoSyncScopedEntities = (space?: { access_scope?: string | null; offices?: { name: string }[]; projects?: { name: string }[] } | null): string => {
  if (!space) return '';
  
  if (space.access_scope === 'offices' && space.offices?.length) {
    return space.offices.map(o => o.name).join(', ');
  }
  if (space.access_scope === 'projects' && space.projects?.length) {
    return space.projects.map(p => p.name).join(', ');
  }
  return '';
};

const ChatRightPanelEnhanced = ({ activeChat, onClose, onBack, isMobileOverlay = false }: ChatRightPanelEnhancedProps) => {
  const navigate = useNavigate();
  const { orgCode } = useParams();
  const spaceIconInputRef = useRef<HTMLInputElement>(null);
  
  const [aboutOpen, setAboutOpen] = useState(true);
  const [membersOpen, setMembersOpen] = useState(true);
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  
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
  const [showTransferGroupAdminDialog, setShowTransferGroupAdminDialog] = useState(false);
  const [showAddGroupMembersDialog, setShowAddGroupMembersDialog] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Shared files lightbox state
  const [filesLightboxOpen, setFilesLightboxOpen] = useState(false);
  const [filesLightboxIndex, setFilesLightboxIndex] = useState(0);
  
  const { data: currentEmployee } = useCurrentEmployee();
  const updateRole = useUpdateSpaceMemberRole();
  const removeMember = useRemoveSpaceMember();
  const updateGroupRole = useUpdateGroupMemberRole();
  const removeGroupMember = useRemoveGroupMember();
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
  const { data: spaceData } = useSpace(spaceId || '');
  const { currentOrg } = useOrganization();
  
  // Check if auto-sync is enabled for this space
  const autoSyncEnabled = spaceData?.auto_sync_members || false;
  
  // Get exempt member IDs for auto-sync restrictions
  const spaceMemberIds = spaceMembers.map(m => m.employee_id);
  const { exemptIds } = useExemptEmployeeIds(spaceMemberIds, currentOrg?.id || null);
  
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

  const unsortedMembers = spaceId ? spaceMembers : conversationParticipants;
  // Sort members with admins first
  const members = [...unsortedMembers].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return 0;
  });
  const memberCount = members.length;
  
  // Get online status for all members
  const allMemberIds = members.map((m: any) => m.employee_id);
  const { data: onlineStatuses = {} } = useTeamPresence(allMemberIds);

  // Check if current user is a space admin
  const currentMembership = spaceMembers.find(m => m.employee_id === currentEmployee?.id);
  const isSpaceAdmin = currentMembership?.role === 'admin';
  const spaceNotificationSetting = currentMembership?.notification_setting || 'all';
  
  // Check if current user is a group admin
  const currentGroupMembership = conversationParticipants.find(
    p => p.employee_id === currentEmployee?.id
  );
  const isGroupAdmin = activeChat.isGroup && currentGroupMembership?.role === 'admin';
  
  // Combined admin check for UI
  const canManageMembers = isSpaceAdmin || isGroupAdmin;
  
  // Count admins and get non-admin members for transfer (space)
  const adminCount = spaceMembers.filter(m => m.role === 'admin').length;
  const nonAdminMembers = spaceMembers.filter(m => 
    m.role !== 'admin' && m.employee_id !== currentEmployee?.id
  ) as ChatSpaceMember[];
  
  // Group admin counts (for leave logic)
  const groupAdminCount = conversationParticipants.filter(p => p.role === 'admin').length;
  const nonAdminGroupMembers = conversationParticipants.filter(
    p => p.role !== 'admin' && p.employee_id !== currentEmployee?.id
  ) as ChatParticipant[];
  const canGroupAdminLeaveDirectly = groupAdminCount >= 2;
  
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
        await leaveConversation.mutateAsync({ conversationId });
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

  // Handle group admin leave - check if transfer is needed
  const handleAdminLeaveGroup = () => {
    if (canGroupAdminLeaveDirectly) {
      // 2+ admins exist, can leave directly (show confirmation)
      setShowLeaveConfirm(true);
    } else {
      // Sole admin, must transfer first
      setShowTransferGroupAdminDialog(true);
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
    const memberName = profile?.full_name || 'Member';
    try {
      if (spaceId) {
        await updateRole.mutateAsync({
          spaceId,
          employeeId: member.employee_id,
          role: 'admin'
        });
      } else if (conversationId) {
        await updateGroupRole.mutateAsync({
          conversationId,
          employeeId: member.employee_id,
          employeeName: memberName,
          role: 'admin'
        });
      }
      toast.success(`${memberName} is now an admin`);
    } catch (error) {
      showErrorToast(error, "Failed to promote member");
    }
  };

  const handleDemote = async (member: any) => {
    const profile = member.employee?.profiles || member.employees?.profiles;
    const memberName = profile?.full_name || 'Member';
    try {
      if (spaceId) {
        await updateRole.mutateAsync({
          spaceId,
          employeeId: member.employee_id,
          role: 'member'
        });
      } else if (conversationId) {
        await updateGroupRole.mutateAsync({
          conversationId,
          employeeId: member.employee_id,
          employeeName: memberName,
          role: 'member'
        });
      }
      toast.success(`${memberName} is now a regular member`);
    } catch (error) {
      showErrorToast(error, "Failed to change member role");
    }
  };

  const handleRemove = async (member: any) => {
    const profile = member.employee?.profiles || member.employees?.profiles;
    const memberName = profile?.full_name || 'Member';
    try {
      if (spaceId) {
        await removeMember.mutateAsync({
          spaceId,
          employeeId: member.employee_id
        });
        toast.success(`${memberName} has been removed from the space`);
      } else if (conversationId) {
        await removeGroupMember.mutateAsync({
          conversationId,
          employeeId: member.employee_id,
          employeeName: memberName
        });
        toast.success(`${memberName} has been removed from the group`);
      }
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

      {/* Mobile close button */}
      {isMobileOverlay && (
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Details</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header - Matching Ask AI pattern */}
      {!isMobileOverlay && (
        <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            activeChat.type === 'space' 
              ? "bg-gradient-to-br from-primary/20 to-primary/5"
              : activeChat.isGroup
                ? "bg-gradient-to-br from-violet-500/20 to-violet-500/5"
                : "bg-gradient-to-br from-sky-500/20 to-sky-500/5"
          )}>
            {activeChat.type === 'space' ? (
              <Hash className="h-4 w-4 text-primary" />
            ) : activeChat.isGroup ? (
              <Users className="h-4 w-4 text-violet-500" />
            ) : (
              <MessageSquare className="h-4 w-4 text-sky-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {activeChat.type === 'space' ? 'Space Info' : activeChat.isGroup ? 'Group Chat Info' : 'Individual Chat Info'}
            </h3>
            <p className="text-xs text-muted-foreground">Details & pinned items</p>
          </div>
        </div>
      )}

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
        
        {/* Members Section (for groups and spaces) */}
        {(activeChat.isGroup || activeChat.type === 'space') && (
          <Collapsible open={membersOpen} onOpenChange={setMembersOpen} className="border-b border-border">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Members
                <span className="text-xs text-muted-foreground font-normal">({memberCount})</span>
              </h4>
              <div className="flex items-center gap-1">
                {canManageMembers && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={spaceId ? autoSyncEnabled : false}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (spaceId) {
                              setShowAddMembersDialog(true);
                            } else if (conversationId && activeChat.isGroup) {
                              setShowAddGroupMembersDialog(true);
                            }
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {spaceId && autoSyncEnabled && (
                      <TooltipContent>
                        <p>Disable auto-sync in settings to add members</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                )}
                {membersOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              {/* Auto-sync banner for spaces */}
              {spaceId && autoSyncEnabled && (
                <Alert className="mb-3 bg-muted/50 border-border">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    <AlertDescription className="text-xs flex-1">
                      <span>Auto-sync enabled. Members synced with </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors font-medium">
                            {getAutoSyncScopeLabel(spaceData?.access_scope)}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start" className="max-w-xs">
                          <div className="space-y-1.5">
                            <p className="font-medium text-xs">Sync triggers:</p>
                            <ul className="text-xs space-y-1 list-disc list-inside">
                              {getAutoSyncTriggers(spaceData?.access_scope).map((trigger, i) => (
                                <li key={i}>{trigger}</li>
                              ))}
                            </ul>
                            {getAutoSyncScopedEntities(spaceData) && (
                              <>
                                <p className="font-medium text-xs mt-2">Synced with:</p>
                                <p className="text-xs text-muted-foreground">
                                  {getAutoSyncScopedEntities(spaceData)}
                                </p>
                              </>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      .
                    </AlertDescription>
                  </div>
                </Alert>
              )}
              <div className="space-y-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                
                {/* Scrollable Members List - Fixed height for ~5 visible members */}
                <ScrollArea className="h-[220px]">
                  <div className="space-y-1 pr-2">
                    {(() => {
                      const filteredMembers = members.filter((member: any) => {
                        const employee = member.employee || member.employees;
                        const profile = employee?.profiles;
                        const name = profile?.full_name || "";
                        const email = profile?.email || "";
                        const searchLower = memberSearch.toLowerCase();
                        return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower);
                      });
                      
                      if (filteredMembers.length === 0) {
                        return (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No members found
                          </p>
                        );
                      }
                      
                      return filteredMembers.map((member: any) => {
                        const employee = member.employee || member.employees;
                        const profile = employee?.profiles;
                        const isAdmin = member.role === 'admin';
                        const isSelf = member.employee_id === currentEmployee?.id;
                        const isMemberExempt = exemptIds.has(member.employee_id);
                        const canRemoveThisMember = !autoSyncEnabled || isMemberExempt || !spaceId;

                        return (
                          <div 
                            key={member.id} 
                            className="flex items-center gap-2 p-1.5 -mx-1.5 rounded-lg group hover:bg-accent/50 transition-colors"
                          >
                            <div className="relative">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {getInitials(profile?.full_name || "U")}
                                </AvatarFallback>
                              </Avatar>
                              {onlineStatuses[member.employee_id] && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border-[1.5px] border-card" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm truncate">{profile?.full_name || "Unknown"}</span>
                                {isAdmin && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                                    Admin
                                  </span>
                                )}
                                {spaceId && autoSyncEnabled && isMemberExempt && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 shrink-0">
                                    Exempt
                                  </span>
                                )}
                              </div>
                              {profile?.email && (
                                <span className="text-xs text-muted-foreground truncate block">
                                  {profile.email}
                                </span>
                              )}
                            </div>
                            
                            {/* 3-dot menu - visible on hover for admins (space or group), or for self if group admin */}
                            {(canManageMembers || (isSelf && isGroupAdmin)) && (
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
                                  {/* View Profile - always shown for non-self */}
                                  {!isSelf && (
                                    <DropdownMenuItem onClick={() => handleViewMember(member.employee_id)}>
                                      <UserCircle className="h-4 w-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {/* Admin management actions - only for non-self */}
                                  {!isSelf && canManageMembers && (
                                    <>
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
                                      {canRemoveThisMember ? (
                                        <DropdownMenuItem 
                                          onClick={() => handleRemove(member)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <UserMinus className="h-4 w-4 mr-2" />
                                          {spaceId ? "Remove from Space" : "Remove from Group"}
                                        </DropdownMenuItem>
                                      ) : (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="relative flex cursor-not-allowed select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                                              <UserMinus className="h-4 w-4 mr-2" />
                                              Remove from Space
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="left">
                                            <p>Cannot remove - auto-sync is enabled</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Leave Space - only for self (space admin) */}
                                  {isSelf && isSpaceAdmin && spaceId && (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        // Check if sole admin - need to transfer first
                                        if (adminCount === 1) {
                                          setShowTransferAdminDialog(true);
                                        } else {
                                          setShowLeaveConfirm(true);
                                        }
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <LogOut className="h-4 w-4 mr-2" />
                                      Leave Space
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {/* Leave Group - only for self (group admin) */}
                                  {isSelf && isGroupAdmin && (
                                    <DropdownMenuItem 
                                      onClick={handleAdminLeaveGroup}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <LogOut className="h-4 w-4 mr-2" />
                                      Leave Group
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </ScrollArea>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Pinned Messages Section */}
        <Collapsible open={pinnedOpen} onOpenChange={setPinnedOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Pin className="h-4 w-4 text-muted-foreground" />
              Pinned Messages
              {pinnedMessages.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">({pinnedMessages.length})</span>
              )}
            </h4>
            {pinnedOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
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

        <div className="border-t border-border" />

        {/* Shared Files Section */}
        <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Shared Files
              {sharedFiles.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">({sharedFiles.length})</span>
              )}
            </h4>
            {filesOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
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
            autoSyncEnabled={autoSyncEnabled}
          />
          <AddSpaceMembersDialog
            open={showAddMembersDialog}
            onOpenChange={setShowAddMembersDialog}
            spaceId={spaceId}
            spaceName={activeChat.name}
            autoSyncEnabled={autoSyncEnabled}
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

      {/* Group Members Dialog */}
      {conversationId && activeChat.isGroup && (
        <>
          <AddGroupMembersDialog
            open={showAddGroupMembersDialog}
            onOpenChange={setShowAddGroupMembersDialog}
            conversationId={conversationId}
            groupName={activeChat.name}
            existingMemberIds={conversationParticipants.map(p => p.employee_id)}
          />
          <TransferGroupAdminDialog
            open={showTransferGroupAdminDialog}
            onOpenChange={setShowTransferGroupAdminDialog}
            conversationId={conversationId}
            groupName={activeChat.name}
            members={conversationParticipants}
            onTransferComplete={() => {
              setShowTransferGroupAdminDialog(false);
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
            <div className="p-4 sm:p-8 flex items-center justify-center w-full">
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
                  <div className="w-full max-w-5xl mx-auto">
                    <PDFViewer
                      fileUrl={getFilePublicUrl(currentLightboxFile.file_path)}
                      mode="lightbox"
                      className="w-full"
                    />
                  </div>
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
