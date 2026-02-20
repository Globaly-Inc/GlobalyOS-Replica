/**
 * MeetLinkCard
 * Renders Google Meet URLs as rich interactive cards with a Join button.
 */

import { Video, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MeetLinkCardProps {
  url: string;
}

const MEET_PATTERN = /https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;

export function isMeetLink(text: string): boolean {
  return MEET_PATTERN.test(text);
}

export function extractMeetLinks(text: string): string[] {
  return text.match(new RegExp(MEET_PATTERN.source, 'gi')) || [];
}

const MeetLinkCard = ({ url }: MeetLinkCardProps) => {
  const meetCode = url.replace(/https?:\/\/meet\.google\.com\//, '');

  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-border bg-card p-3 my-1 max-w-xs shadow-sm">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Google Meet</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{meetCode}</p>
      </div>
      <Button
        size="sm"
        variant="default"
        className="shrink-0 gap-1.5 text-xs"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      >
        Join
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default MeetLinkCard;
