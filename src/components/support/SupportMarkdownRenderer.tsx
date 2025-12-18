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
      // Enhanced section styling
      '[&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-border',
      '[&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:pl-3 [&>h3]:border-l-4 [&>h3]:border-primary',
      '[&>h4]:text-lg [&>h4]:font-medium [&>h4]:mt-4 [&>h4]:mb-2',
      // List styling
      '[&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:my-2',
      '[&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:my-1',
      // Paragraph spacing
      '[&>p]:my-4 [&>p]:leading-relaxed',
      // Code blocks
      '[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto',
      '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm',
      // Links
      '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80',
      // Tables
      '[&_table]:w-full [&_table]:border-collapse',
      '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left',
      '[&_td]:border [&_td]:border-border [&_td]:p-2',
      className
    )}>
      {renderContent()}
    </div>
  );
};
