export interface ChatConversation {
  id: string;
  organization_id: string;
  name: string | null;
  icon_url: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  employee_id: string;
  organization_id: string;
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  employee?: {
    id: string;
    user_id: string;
    position: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      email: string;
    };
  };
}

export type AccessScope = 'company' | 'offices' | 'projects' | 'members';

export interface ChatSpace {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  space_type: 'collaboration' | 'announcements';
  access_type: 'public' | 'private';
  access_scope: AccessScope;
  history_enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  last_message?: ChatMessage;
  unread_count?: number;
  offices?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

export interface ChatSpaceMember {
  id: string;
  space_id: string;
  employee_id: string;
  organization_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string | null;
  notification_setting: 'all' | 'mentions' | 'mute';
  employee?: {
    id: string;
    user_id: string;
    position: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      email: string;
    };
  };
}

export interface CallLogData {
  call_id: string;
  call_type: 'audio' | 'video';
  status: 'ended' | 'missed' | 'declined';
  duration_seconds?: number;
  initiated_by: string;
  initiator_name: string;
  initiator_avatar?: string;
  participants: Array<{
    name: string;
    avatar?: string;
  }>;
  recording_url?: string;
  has_transcript?: boolean;
  ai_summary?: string;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  space_id: string | null;
  sender_id: string;
  content: string;
  content_type: 'text' | 'file' | 'image' | 'call_log';
  call_log_data?: CallLogData;
  is_pinned: boolean;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
  status?: MessageDeliveryStatus;
  delivered_at?: string;
  read_at?: string;
  sender?: {
    id: string;
    user_id: string;
    position: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  attachments?: ChatAttachment[];
  mentions?: ChatMention[];
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface ChatMention {
  id: string;
  message_id: string;
  employee_id: string;
  organization_id: string;
  created_at: string;
}

export interface ChatPinnedResource {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  space_id: string | null;
  title: string;
  url: string | null;
  file_path: string | null;
  pinned_by: string;
  created_at: string;
}

export interface ChatPresence {
  id: string;
  employee_id: string;
  organization_id: string;
  is_online: boolean;
  last_seen_at: string;
  typing_in_conversation_id: string | null;
  typing_in_space_id: string | null;
}

export type ChatContextType = 'conversation' | 'space' | 'mentions' | 'starred';

export interface ActiveChat {
  type: ChatContextType;
  id: string;
  name: string;
  isGroup?: boolean;
  iconUrl?: string | null;
  participantNames?: string[];
}
