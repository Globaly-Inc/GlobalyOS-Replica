import { SupportRequest, SupportRequestComment } from '@/types/support';
import { format } from 'date-fns';

export interface LovablePromptSection {
  id: string;
  title: string;
  content: string;
  editable: boolean;
}

export interface LovablePromptContent {
  sections: LovablePromptSection[];
  fullPrompt: string;
  projectUrl: string;
  imageUrls: string[];
}

interface GenerateLovableContentParams {
  request: SupportRequest;
  comments?: SupportRequestComment[];
  attachmentUrls?: string[];
}

// Detect module from page URL
function detectModule(pageUrl: string): string {
  const url = pageUrl.toLowerCase();
  if (url.includes('/team') || url.includes('/profile')) return 'Team/HR';
  if (url.includes('/wiki')) return 'Wiki/Knowledge Base';
  if (url.includes('/calendar')) return 'Calendar';
  if (url.includes('/crm')) return 'CRM';
  if (url.includes('/chat')) return 'Team Chat';
  if (url.includes('/kpi') || url.includes('/okr')) return 'KPIs/OKRs';
  if (url.includes('/settings')) return 'Settings';
  if (url.includes('/leave')) return 'Leave Management';
  if (url.includes('/attendance')) return 'Attendance';
  if (url.includes('/super-admin')) return 'Super Admin Portal';
  if (url.includes('/auth')) return 'Authentication';
  if (url.includes('/onboarding')) return 'Onboarding';
  return 'General';
}

// Helper to check if URL is likely an image
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowercaseUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
}

// Format comment for prompt
function formatComment(comment: SupportRequestComment): string {
  const author = comment.profiles?.full_name || 'Unknown';
  const time = format(new Date(comment.created_at), 'MMM d, yyyy h:mm a');
  const content = comment.content.length > 500 
    ? comment.content.substring(0, 500) + '...' 
    : comment.content;
  const attachment = comment.attachment_url 
    ? `\n   📎 Attachment: ${comment.attachment_url}` 
    : '';
  return `> **${author}** - ${time}\n> ${content}${attachment}`;
}

export function generateLovableContent({ 
  request, 
  comments = [], 
  attachmentUrls = [] 
}: GenerateLovableContentParams): LovablePromptContent {
  const typeLabel = request.type === 'bug' ? 'Bug Report' : 'Feature Request';
  const module = detectModule(request.page_url || '');
  
  // Separate user comments and internal notes
  const userComments = comments.filter(c => !c.is_internal);
  const internalNotes = comments.filter(c => c.is_internal);
  
  // Collect all images
  const images: string[] = [];
  if (request.screenshot_url) {
    images.push(request.screenshot_url);
  }
  attachmentUrls.forEach(url => {
    if (images.length < 10 && isImageUrl(url)) {
      images.push(url);
    }
  });
  
  // Build sections
  const sections: LovablePromptSection[] = [
    {
      id: 'header',
      title: 'Ticket Information',
      editable: false,
      content: `## ${typeLabel}: ${request.title}

### Ticket Information
- **Type:** ${request.type === 'bug' ? 'Bug' : 'Feature Request'}
- **Priority:** ${request.priority}
- **Status:** ${request.status}
- **Reported by:** ${request.profiles?.full_name || 'Unknown'}${request.organizations?.name ? ` from ${request.organizations.name}` : ''}
- **Created:** ${format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
- **Last Updated:** ${format(new Date(request.updated_at), 'MMM d, yyyy h:mm a')}`
    },
    {
      id: 'technicalContext',
      title: 'Technical Context',
      editable: false,
      content: `### Technical Context
- **Page URL:** ${request.page_url || 'Not specified'}
- **Module:** ${module}
- **Browser:** ${request.browser_info || 'Unknown'}
- **Device:** ${request.device_type || 'Unknown'}`
    },
    {
      id: 'description',
      title: 'Description',
      editable: true,
      content: `### Description
${request.ai_improved_description || request.description}`
    },
    {
      id: 'adminNotes',
      title: 'Admin Notes',
      editable: true,
      content: `### Admin Notes
${request.admin_notes || 'No admin notes added'}`
    },
    {
      id: 'userComments',
      title: `User Comments (${userComments.length})`,
      editable: false,
      content: userComments.length > 0
        ? `### Conversation History

#### User Comments (${userComments.length})
${userComments.slice(-10).map(formatComment).join('\n\n')}${userComments.length > 10 ? `\n\n*${userComments.length - 10} earlier comments not shown*` : ''}`
        : `### Conversation History

#### User Comments
No user comments yet.`
    },
    {
      id: 'internalNotes',
      title: `Internal Notes (${internalNotes.length})`,
      editable: false,
      content: internalNotes.length > 0
        ? `#### Internal Notes (${internalNotes.length}) [ADMIN ONLY]
${internalNotes.map(formatComment).join('\n\n')}`
        : `#### Internal Notes
No internal notes.`
    },
    {
      id: 'securityGuidelines',
      title: 'Security & Access Control',
      editable: true,
      content: `---

## Implementation Guidelines

### 1. Security & Access Control
GlobalyOS uses role-based access control: **Owner > Admin > HR > User**

Key patterns to follow:
- Use \`useUserRole()\` hook to check permissions: \`{ isOwner, isAdmin, isHR, hasRole }\`
- Scope all data queries by \`organization_id\` (multi-tenant architecture)
- Sensitive fields (salary, tax, banking, ID numbers) visible only to Admin/HR or own profile
- Managers can view direct reports' data via manager relationship
- RLS policies enforce server-side security - never trust client-side checks alone

Example permission check:
\`\`\`typescript
const { isAdmin, isHR, isOwner } = useUserRole();
const canEdit = isAdmin || isHR || (isOwnProfile && allowSelfEdit);
\`\`\``
    },
    {
      id: 'uiGuidelines',
      title: 'UI & UX Standards',
      editable: true,
      content: `### 2. UI & UX Standards
Available components in \`src/components/ui/\`:
- **Modals/Overlays:** Dialog, Sheet, AlertDialog, Popover
- **Interactions:** Button, Badge, Avatar, Toggle
- **Organization:** Tabs, Accordion, Collapsible, Card
- **Forms:** Select, Input, Textarea, Checkbox, Switch
- **Display:** ScrollArea, Table, Separator
- **Notifications:** Toast (sonner)

Styling patterns:
- Use Tailwind CSS classes with semantic tokens from design system
- Use \`cn()\` utility from \`@/lib/utils\` for conditional classes
- Primary actions: blue buttons in top-right of dialogs/cards
- Cards: rounded corners, soft shadows, consistent padding
- Follow existing GlobalyOS styling patterns`
    },
    {
      id: 'responsiveGuidelines',
      title: 'Responsive Design',
      editable: true,
      content: `### 3. Responsive Design Requirements
- Desktop-first approach with mobile fallbacks
- Use \`useIsMobile()\` hook for breakpoint detection
- Hide secondary actions on mobile: \`className="hidden sm:inline-flex"\`
- Stack layouts on mobile: \`className="flex flex-col sm:flex-row"\`
- Touch-friendly tap targets (min 44px height/width)
- Test on both desktop AND mobile viewports`
    },
    {
      id: 'checklist',
      title: 'Implementation Checklist',
      editable: true,
      content: `### 4. Implementation Checklist
Before marking complete, verify:
- [ ] Changes respect role-based permissions (useUserRole hook)
- [ ] All database queries scoped by organization_id
- [ ] UI works on desktop AND mobile viewports
- [ ] Using existing UI components from src/components/ui/
- [ ] Error states handled with toast notifications
- [ ] Loading states shown during async operations
- [ ] No console errors or warnings
- [ ] Feature matches existing GlobalyOS styling
- [ ] Edge cases considered and handled`
    },
    {
      id: 'imageReferences',
      title: 'Reference Images',
      editable: false,
      content: images.length > 0
        ? `### Reference Images
${images.map((url, i) => `${i + 1}. ${url}`).join('\n')}`
        : `### Reference Images
No images attached.`
    },
    {
      id: 'instructions',
      title: 'Analysis Request',
      editable: true,
      content: `---

Please analyze this ${request.type === 'bug' ? 'bug report' : 'feature request'} and provide:
1. ${request.type === 'bug' ? 'Root cause analysis' : 'Requirement breakdown'}
2. Step-by-step implementation plan following above guidelines
3. Potential edge cases and how to handle them
4. Security considerations specific to this change`
    }
  ];
  
  // Combine all sections into full prompt
  const fullPrompt = sections.map(s => s.content).join('\n\n');
  
  // Build project URL
  const GLOBALYOS_PROJECT_ID = 'e82dc3a3-760d-4b67-b09d-75a73e25acd5';
  const projectUrl = `https://lovable.dev/projects/${GLOBALYOS_PROJECT_ID}`;
  
  return {
    sections,
    fullPrompt,
    projectUrl,
    imageUrls: images
  };
}

// Legacy function for backwards compatibility
export function generateLovableUrl({ request, attachmentUrls = [] }: { request: SupportRequest; attachmentUrls?: string[] }): string {
  const content = generateLovableContent({ request, comments: [], attachmentUrls });
  
  // Truncate if needed
  let prompt = content.fullPrompt;
  const maxPromptLength = 40000;
  if (prompt.length > maxPromptLength) {
    prompt = prompt.substring(0, maxPromptLength) + '\n\n[Description truncated due to length...]';
  }
  
  const encodedPrompt = encodeURIComponent(prompt);
  const imageParams = content.imageUrls.map(url => `images=${encodeURIComponent(url)}`).join('&');
  
  return `${content.projectUrl}#prompt=${encodedPrompt}${imageParams ? '&' + imageParams : ''}`;
}
