import { SupportRequest } from '@/types/support';

interface GenerateLovableUrlParams {
  request: SupportRequest;
  attachmentUrls?: string[];
}

export function generateLovableUrl({ request, attachmentUrls = [] }: GenerateLovableUrlParams): string {
  // Build structured prompt
  const typeLabel = request.type === 'bug' ? 'Bug Report' : 'Feature Request';
  
  let prompt = `## ${typeLabel}: ${request.title}

**Type:** ${request.type === 'bug' ? 'Bug' : 'Feature Request'}
**Priority:** ${request.priority}
**Page URL:** ${request.page_url || 'Not specified'}
**Environment:** ${request.browser_info || 'Unknown'} on ${request.device_type || 'Unknown'}

### Description
${request.ai_improved_description || request.description}`;

  if (request.screenshot_url) {
    prompt += `\n\n### Screenshot attached as reference image`;
  }

  prompt += `\n\nPlease analyze this ${request.type === 'bug' ? 'issue' : 'feature request'} and provide:
1. A clear understanding of the problem/requirement
2. Step-by-step implementation plan
3. Any potential edge cases or considerations`;

  // Collect all images (max 10)
  const images: string[] = [];
  if (request.screenshot_url) {
    images.push(request.screenshot_url);
  }
  attachmentUrls.forEach(url => {
    if (images.length < 10 && isImageUrl(url)) {
      images.push(url);
    }
  });

  // Check URL length - truncate prompt if needed (browsers typically limit to ~8000 chars)
  const maxPromptLength = 40000; // Leave room for URL encoding expansion and image params
  if (prompt.length > maxPromptLength) {
    prompt = prompt.substring(0, maxPromptLength) + '\n\n[Description truncated due to length...]';
  }

  // Build URL - target existing GlobalyOS project
  const GLOBALYOS_PROJECT_ID = 'e82dc3a3-760d-4b67-b09d-75a73e25acd5';
  const baseUrl = `https://lovable.dev/projects/${GLOBALYOS_PROJECT_ID}#`;
  const encodedPrompt = encodeURIComponent(prompt);
  const imageParams = images.map(url => `images=${encodeURIComponent(url)}`).join('&');
  
  return `${baseUrl}prompt=${encodedPrompt}${imageParams ? '&' + imageParams : ''}`;
}

// Helper to check if URL is likely an image
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowercaseUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
}
