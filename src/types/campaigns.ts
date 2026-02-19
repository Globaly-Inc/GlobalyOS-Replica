/**
 * Email Campaigns Module — Type Definitions
 */

// ─── Status Types ─────────────────────────────────────────────────────────────

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'archived';

export type RecipientStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'unsubscribed'
  | 'complaint'
  | 'failed';

export type AudienceSource = 'crm_contacts' | 'crm_companies' | 'manual';

export type SuppressionType = 'unsubscribed' | 'bounced' | 'complaint' | 'manual';

// ─── Audience Filters ─────────────────────────────────────────────────────────

export interface AudienceFilters {
  tags?: string[];
  rating?: 'hot' | 'warm' | 'cold' | null;
  source?: string | null;
}

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface EmailCampaign {
  id: string;
  organization_id: string;
  name: string;
  status: CampaignStatus;
  subject: string | null;
  preview_text: string | null;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  content_json: EmailBuilderState | null;
  content_html_cache: string | null;
  audience_source: AudienceSource;
  audience_filters: AudienceFilters;
  recipient_count: number;
  track_opens: boolean;
  track_clicks: boolean;
  schedule_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  organization_id: string;
  campaign_id: string;
  contact_id: string | null;
  email: string;
  full_name: string | null;
  status: RecipientStatus;
  provider_message_id: string | null;
  unsubscribe_token: string;
  events: CampaignEvent[];
  created_at: string;
  updated_at: string;
}

export interface CampaignEvent {
  type: 'sent' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'complaint';
  ts: string;
  meta?: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  content_json: EmailBuilderState;
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SenderIdentity {
  id: string;
  organization_id: string;
  display_name: string;
  from_email: string;
  reply_to: string | null;
  is_verified: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface EmailSuppression {
  id: string;
  organization_id: string;
  email: string;
  type: SuppressionType;
  reason: string | null;
  campaign_id: string | null;
  created_at: string;
}

// ─── Email Builder Schema ─────────────────────────────────────────────────────

export interface EmailBuilderState {
  blocks: EmailBlock[];
  globalStyles: GlobalEmailStyles;
}

export interface GlobalEmailStyles {
  backgroundColor: string;
  fontFamily: string;
  maxWidth: number;
}

export type EmailBlock =
  | HeaderBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | SocialBlock
  | FooterBlock;

export type EmailBlockType =
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'social'
  | 'footer';

interface BaseBlock {
  id: string;
}

export interface HeaderBlock extends BaseBlock {
  type: 'header';
  props: {
    logoUrl: string;
    orgName: string;
    backgroundColor: string;
    textColor: string;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  props: {
    content: string;
    backgroundColor: string;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
  };
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  props: {
    src: string;
    alt: string;
    link: string;
    width: number;
    align: 'left' | 'center' | 'right';
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  props: {
    label: string;
    href: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    align: 'left' | 'center' | 'right';
    paddingTop: number;
    paddingBottom: number;
    fontSize: number;
  };
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  props: {
    color: string;
    height: number;
    paddingTop: number;
    paddingBottom: number;
  };
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  props: {
    height: number;
  };
}

export interface ColumnsBlock extends BaseBlock {
  type: 'columns';
  props: {
    backgroundColor: string;
    paddingTop: number;
    paddingBottom: number;
    column1: {
      content: string;
      textAlign: 'left' | 'center' | 'right';
    };
    column2: {
      content: string;
      textAlign: 'left' | 'center' | 'right';
    };
  };
}

export interface SocialLink {
  platform: 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'youtube';
  url: string;
}

export interface SocialBlock extends BaseBlock {
  type: 'social';
  props: {
    links: SocialLink[];
    align: 'left' | 'center' | 'right';
    paddingTop: number;
    paddingBottom: number;
    backgroundColor: string;
  };
}

export interface FooterBlock extends BaseBlock {
  type: 'footer';
  props: {
    companyName: string;
    address: string;
    unsubscribeText: string;
    backgroundColor: string;
    textColor: string;
    paddingTop: number;
    paddingBottom: number;
  };
}

// ─── Default Block Factory ────────────────────────────────────────────────────

export const createDefaultBlock = (type: EmailBlockType, id: string): EmailBlock => {
  switch (type) {
    case 'header':
      return {
        id, type,
        props: {
          logoUrl: '',
          orgName: 'Your Company',
          backgroundColor: '#1a56db',
          textColor: '#ffffff',
          paddingTop: 24,
          paddingBottom: 24,
        },
      } as HeaderBlock;
    case 'text':
      return {
        id, type,
        props: {
          content: '<p>Start writing your email content here...</p>',
          backgroundColor: '#ffffff',
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 24,
          paddingRight: 24,
          fontSize: 15,
          textAlign: 'left',
        },
      } as TextBlock;
    case 'image':
      return {
        id, type,
        props: {
          src: 'https://via.placeholder.com/600x200',
          alt: 'Email image',
          link: '',
          width: 100,
          align: 'center',
          paddingTop: 0,
          paddingBottom: 0,
        },
      } as ImageBlock;
    case 'button':
      return {
        id, type,
        props: {
          label: 'Click here',
          href: '',
          backgroundColor: '#1a56db',
          textColor: '#ffffff',
          borderRadius: 6,
          align: 'center',
          paddingTop: 20,
          paddingBottom: 20,
          fontSize: 15,
        },
      } as ButtonBlock;
    case 'divider':
      return {
        id, type,
        props: {
          color: '#e5e7eb',
          height: 1,
          paddingTop: 16,
          paddingBottom: 16,
        },
      } as DividerBlock;
    case 'spacer':
      return {
        id, type,
        props: { height: 32 },
      } as SpacerBlock;
    case 'columns':
      return {
        id, type,
        props: {
          backgroundColor: '#ffffff',
          paddingTop: 16,
          paddingBottom: 16,
          column1: { content: '<p>Column 1 content</p>', textAlign: 'left' },
          column2: { content: '<p>Column 2 content</p>', textAlign: 'left' },
        },
      } as ColumnsBlock;
    case 'social':
      return {
        id, type,
        props: {
          links: [
            { platform: 'linkedin', url: '' },
            { platform: 'twitter', url: '' },
          ],
          align: 'center',
          paddingTop: 16,
          paddingBottom: 16,
          backgroundColor: '#f9fafb',
        },
      } as SocialBlock;
    case 'footer':
      return {
        id, type,
        props: {
          companyName: '{{org_name}}',
          address: 'Your Company Address',
          unsubscribeText: 'Unsubscribe from these emails',
          backgroundColor: '#f9fafb',
          textColor: '#6b7280',
          paddingTop: 24,
          paddingBottom: 24,
        },
      } as FooterBlock;
  }
};

export const DEFAULT_BUILDER_STATE: EmailBuilderState = {
  blocks: [],
  globalStyles: {
    backgroundColor: '#f3f4f6',
    fontFamily: 'Inter, sans-serif',
    maxWidth: 600,
  },
};
