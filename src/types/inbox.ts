// Omni-Channel Inbox Types

export type InboxChannelType = 'whatsapp' | 'telegram' | 'messenger' | 'instagram' | 'tiktok' | 'email';
export type InboxConversationStatus = 'open' | 'pending' | 'snoozed' | 'closed';
export type InboxMessageDirection = 'inbound' | 'outbound';
export type InboxMessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'template' | 'interactive' | 'system' | 'note';
export type InboxDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface InboxChannel {
  id: string;
  organization_id: string;
  channel_type: InboxChannelType;
  display_name: string;
  credentials: Record<string, unknown>;
  webhook_status: string;
  webhook_secret: string | null;
  last_webhook_at: string | null;
  last_error: string | null;
  config: Record<string, unknown>;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InboxContact {
  id: string;
  organization_id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  handles: Record<string, unknown>;
  crm_contact_id: string | null;
  consent: Record<string, unknown>;
  tags: string[];
  custom_fields: Record<string, unknown>;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxConversation {
  id: string;
  organization_id: string;
  channel_type: InboxChannelType;
  channel_id: string | null;
  contact_id: string;
  status: InboxConversationStatus;
  priority: string;
  tags: string[];
  assigned_to: string | null;
  assigned_at: string | null;
  team_id: string | null;
  subject: string | null;
  channel_thread_ref: string | null;
  last_message_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  unread_count: number;
  snoozed_until: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  sla_breach_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  inbox_contacts?: InboxContact;
}

export interface InboxMessage {
  id: string;
  organization_id: string;
  conversation_id: string;
  direction: InboxMessageDirection;
  msg_type: InboxMessageType;
  content: Record<string, unknown>;
  media_urls: string[];
  template_id: string | null;
  provider_message_id: string | null;
  delivery_status: InboxDeliveryStatus;
  delivery_status_updated_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_by: string | null;
  created_by_type: string;
  created_at: string;
}

export interface InboxMacro {
  id: string;
  organization_id: string;
  name: string;
  content: string;
  channel_compatibility: InboxChannelType[];
  variables: string[];
  category: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxAIEvent {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  event_type: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  confidence: number | null;
  citations: unknown[];
  model_version: string | null;
  reviewer_id: string | null;
  reviewer_feedback: string | null;
  feedback_label: string | null;
  created_at: string;
}

export interface InboxWebhookEvent {
  id: string;
  organization_id: string | null;
  channel_type: InboxChannelType;
  idempotency_key: string;
  raw_payload: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  error: string | null;
  retry_count: number;
  created_at: string;
}

// Channel icon/label mapping
export const CHANNEL_META: Record<InboxChannelType, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  telegram: { label: 'Telegram', color: '#0088cc' },
  messenger: { label: 'Messenger', color: '#0084FF' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  tiktok: { label: 'TikTok', color: '#000000' },
  email: { label: 'Email', color: '#6366F1' },
};
