/**
 * Support Markdown Renderer Component
 * Renders markdown content with support-specific features:
 * - Role badges (@role:owner, @role:admin, etc.)
 * - Callout boxes (:::tip, :::warning, :::note, :::prerequisites)
 * - Screenshot placeholders ([Screenshot: description])
 */

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { RoleBadge, UserRole } from './RoleBadge';
import { CalloutBox, CalloutType } from './CalloutBox';
import { ScreenshotPlaceholder, ScreenshotStatus } from './ScreenshotPlaceholder';

// Configure marked for synchronous rendering
marked.use({ async: false });

interface Screenshot {
  id?: string;
  description: string;
  imageUrl?: string;
  status?: ScreenshotStatus;
  annotation?: string;
}

interface SupportMarkdownRendererProps {
  content: string;
  screenshots?: Screenshot[];
  onCaptureScreenshot?: (description: string) => void;
  isAdmin?: boolean;
  className?: string;
}

// Parse role badges from content
const parseRoleBadges = (content: string): { html: string; roles: { role: UserRole; placeholder: string }[] } => {
  const roles: { role: UserRole; placeholder: string }[] = [];
  const roleRegex = /@role:(owner|admin|hr|user)/g;
  let match;
  let index = 0;
  
  let processedContent = content;
  while ((match = roleRegex.exec(content)) !== null) {
    const placeholder = `__ROLE_BADGE_${index}__`;
    processedContent = processedContent.replace(match[0], placeholder);
    roles.push({ role: match[1] as UserRole, placeholder });
    index++;
  }
  
  return { html: processedContent, roles };
};

// Parse callout boxes from content
const parseCallouts = (content: string): { 
  html: string; 
  callouts: { type: CalloutType; content: string; placeholder: string }[] 
} => {
  const callouts: { type: CalloutType; content: string; placeholder: string }[] = [];
  const calloutRegex = /:::(tip|warning|note|prerequisites|important)\n([\s\S]*?):::/g;
  let match;
  let index = 0;
  
  let processedContent = content;
  while ((match = calloutRegex.exec(content)) !== null) {
    const placeholder = `__CALLOUT_${index}__`;
    processedContent = processedContent.replace(match[0], placeholder);
    callouts.push({ 
      type: match[1] as CalloutType, 
      content: match[2].trim(),
      placeholder 
    });
    index++;
  }
  
  return { html: processedContent, callouts };
};

// Parse screenshot placeholders from content
const parseScreenshots = (content: string): { 
  html: string; 
  screenshotPlaceholders: { description: string; placeholder: string }[] 
} => {
  const screenshotPlaceholders: { description: string; placeholder: string }[] = [];
  const screenshotRegex = /\[Screenshot:\s*([^\]]+)\]/g;
  let match;
  let index = 0;
  
  let processedContent = content;
  while ((match = screenshotRegex.exec(content)) !== null) {
    const placeholder = `__SCREENSHOT_${index}__`;
    processedContent = processedContent.replace(match[0], placeholder);
    screenshotPlaceholders.push({ 
      description: match[1].trim(),
      placeholder 
    });
    index++;
  }
  
  return { html: processedContent, screenshotPlaceholders };
};

// Find matching screenshot data
const findScreenshotData = (description: string, screenshots?: Screenshot[]): Screenshot | undefined => {
  if (!screenshots) return undefined;
  return screenshots.find(s => 
    s.description.toLowerCase().includes(description.toLowerCase()) ||
    description.toLowerCase().includes(s.description.toLowerCase())
  );
};

export const SupportMarkdownRenderer = ({
  content,
  screenshots,
  onCaptureScreenshot,
  isAdmin = false,
  className,
}: SupportMarkdownRendererProps) => {
  const renderedContent = useMemo(() => {
    if (!content) return { html: '', roles: [], callouts: [], screenshotPlaceholders: [] };

    // Step 1: Parse special syntax
    const { html: afterRoles, roles } = parseRoleBadges(content);
    const { html: afterCallouts, callouts } = parseCallouts(afterRoles);
    const { html: afterScreenshots, screenshotPlaceholders } = parseScreenshots(afterCallouts);

    // Step 2: Convert markdown to HTML
    const rawHtml = marked(afterScreenshots) as string;

    // Step 3: Sanitize HTML
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'ul', 'ol', 'li',
        'strong', 'em', 'b', 'i', 'u', 's', 'del',
        'a', 'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'figure', 'figcaption',
        'div', 'span',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
    });

    return { html: sanitizedHtml, roles, callouts, screenshotPlaceholders };
  }, [content]);

  // Split HTML by placeholders and render components inline
  const renderContent = () => {
    let htmlParts = [renderedContent.html];
    const elements: React.ReactNode[] = [];

    // Process role badges
    renderedContent.roles.forEach(({ role, placeholder }) => {
      const newParts: string[] = [];
      htmlParts.forEach(part => {
        if (typeof part === 'string') {
          const splits = part.split(placeholder);
          splits.forEach((split, i) => {
            newParts.push(split);
            if (i < splits.length - 1) {
              newParts.push(`__RENDER_ROLE_${role}__`);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      htmlParts = newParts;
    });

    // Process callouts
    renderedContent.callouts.forEach(({ type, content: calloutContent, placeholder }, index) => {
      const newParts: string[] = [];
      htmlParts.forEach(part => {
        if (typeof part === 'string') {
          const splits = part.split(placeholder);
          splits.forEach((split, i) => {
            newParts.push(split);
            if (i < splits.length - 1) {
              newParts.push(`__RENDER_CALLOUT_${index}__`);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      htmlParts = newParts;
    });

    // Process screenshots
    renderedContent.screenshotPlaceholders.forEach(({ description, placeholder }, index) => {
      const newParts: string[] = [];
      htmlParts.forEach(part => {
        if (typeof part === 'string') {
          const splits = part.split(placeholder);
          splits.forEach((split, i) => {
            newParts.push(split);
            if (i < splits.length - 1) {
              newParts.push(`__RENDER_SCREENSHOT_${index}__`);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      htmlParts = newParts;
    });

    // Render all parts
    htmlParts.forEach((part, index) => {
      if (typeof part === 'string') {
        // Check for role render markers
        const roleMatch = part.match(/__RENDER_ROLE_(owner|admin|hr|user)__/);
        if (roleMatch) {
          const before = part.split(`__RENDER_ROLE_${roleMatch[1]}__`)[0];
          const after = part.split(`__RENDER_ROLE_${roleMatch[1]}__`)[1];
          if (before) {
            elements.push(
              <span key={`before-${index}`} dangerouslySetInnerHTML={{ __html: before }} />
            );
          }
          elements.push(
            <RoleBadge key={`role-${index}`} role={roleMatch[1] as UserRole} size="sm" className="mx-0.5" />
          );
          if (after) {
            elements.push(
              <span key={`after-${index}`} dangerouslySetInnerHTML={{ __html: after }} />
            );
          }
          return;
        }

        // Check for callout render markers
        const calloutMatch = part.match(/__RENDER_CALLOUT_(\d+)__/);
        if (calloutMatch) {
          const calloutIndex = parseInt(calloutMatch[1]);
          const callout = renderedContent.callouts[calloutIndex];
          const before = part.split(`__RENDER_CALLOUT_${calloutIndex}__`)[0];
          const after = part.split(`__RENDER_CALLOUT_${calloutIndex}__`)[1];
          if (before) {
            elements.push(
              <div key={`before-callout-${index}`} dangerouslySetInnerHTML={{ __html: before }} />
            );
          }
          if (callout) {
            const calloutHtml = marked(callout.content) as string;
            elements.push(
              <CalloutBox key={`callout-${index}`} type={callout.type}>
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(calloutHtml) }} />
              </CalloutBox>
            );
          }
          if (after) {
            elements.push(
              <div key={`after-callout-${index}`} dangerouslySetInnerHTML={{ __html: after }} />
            );
          }
          return;
        }

        // Check for screenshot render markers
        const screenshotMatch = part.match(/__RENDER_SCREENSHOT_(\d+)__/);
        if (screenshotMatch) {
          const screenshotIndex = parseInt(screenshotMatch[1]);
          const screenshotInfo = renderedContent.screenshotPlaceholders[screenshotIndex];
          const before = part.split(`__RENDER_SCREENSHOT_${screenshotIndex}__`)[0];
          const after = part.split(`__RENDER_SCREENSHOT_${screenshotIndex}__`)[1];
          if (before) {
            elements.push(
              <div key={`before-ss-${index}`} dangerouslySetInnerHTML={{ __html: before }} />
            );
          }
          if (screenshotInfo) {
            const screenshotData = findScreenshotData(screenshotInfo.description, screenshots);
            elements.push(
              <ScreenshotPlaceholder
                key={`screenshot-${index}`}
                description={screenshotInfo.description}
                screenshotId={screenshotData?.id}
                imageUrl={screenshotData?.imageUrl}
                status={screenshotData?.status}
                annotation={screenshotData?.annotation}
                isAdmin={isAdmin}
                onCapture={onCaptureScreenshot ? () => onCaptureScreenshot(screenshotInfo.description) : undefined}
              />
            );
          }
          if (after) {
            elements.push(
              <div key={`after-ss-${index}`} dangerouslySetInnerHTML={{ __html: after }} />
            );
          }
          return;
        }

        // Regular HTML content
        if (part.trim()) {
          elements.push(
            <div key={`html-${index}`} dangerouslySetInnerHTML={{ __html: part }} />
          );
        }
      }
    });

    return elements;
  };

  return (
    <div className={cn(
      'prose prose-slate dark:prose-invert max-w-none',
      // Enhanced heading styling with descendant selectors
      '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-6 [&_h1]:pb-3 [&_h1]:border-b-2 [&_h1]:border-primary/30',
      '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border',
      '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:pl-3 [&_h3]:border-l-4 [&_h3]:border-primary',
      '[&_h4]:text-lg [&_h4]:font-medium [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-foreground/90',
      '[&_h5]:text-base [&_h5]:font-medium [&_h5]:mt-4 [&_h5]:mb-2',
      // List styling with proper nesting
      '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_ol]:space-y-2',
      '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-1.5',
      '[&_li]:leading-relaxed [&_li]:text-foreground/80',
      '[&_li>p]:my-1',
      // Nested list styling
      '[&_ol_ol]:list-[lower-alpha] [&_ol_ol]:mt-2',
      '[&_ul_ul]:list-[circle] [&_ul_ul]:mt-2',
      // Paragraph spacing
      '[&_p]:my-4 [&_p]:leading-relaxed [&_p]:text-foreground/80',
      // Code blocks
      '[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4',
      '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
      '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
      // Links
      '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 [&_a]:transition-colors',
      // Blockquotes
      '[&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground',
      // Tables
      '[&_table]:w-full [&_table]:border-collapse [&_table]:my-4',
      '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-3 [&_th]:text-left [&_th]:font-semibold',
      '[&_td]:border [&_td]:border-border [&_td]:p-3',
      '[&_tr:nth-child(even)]:bg-muted/30',
      // Horizontal rules
      '[&_hr]:my-8 [&_hr]:border-t-2 [&_hr]:border-border',
      // Strong and emphasis
      '[&_strong]:font-semibold [&_strong]:text-foreground',
      '[&_em]:italic',
      className
    )}>
      {renderContent()}
    </div>
  );
};
