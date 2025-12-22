/**
 * Social Feed Composer
 * Inline composer matching the reference design
 */

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Image, Video, BarChart3, Smile, Globe } from 'lucide-react';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { CreatePostModal } from './CreatePostModal';
import { PostType } from '@/services/useSocialFeed';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SocialFeedComposerProps {
  canPostAnnouncement?: boolean;
  canPostExecutive?: boolean;
}

export const SocialFeedComposer = ({ 
  canPostAnnouncement = false,
  canPostExecutive = false 
}: SocialFeedComposerProps) => {
  const { data: currentEmployee } = useCurrentEmployee();
  const [modalOpen, setModalOpen] = useState(false);
  const [initialPostType, setInitialPostType] = useState<PostType | null>(null);
  const [initialWithPoll, setInitialWithPoll] = useState(false);

  const handleOpenModal = (postType?: PostType, withPoll?: boolean) => {
    setInitialPostType(postType || null);
    setInitialWithPoll(withPoll || false);
    setModalOpen(true);
  };

  if (!currentEmployee) return null;

  const initials = currentEmployee.profiles.full_name
    .split(' ')
    .map(n => n[0])
    .join('');

  return (
    <>
      <Card className="p-4 bg-card border-border shadow-sm">
        {/* Main composer row */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border/50 shrink-0">
            <AvatarImage src={currentEmployee.profiles.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <button
            onClick={() => handleOpenModal()}
            className="flex-1 text-left px-4 py-2.5 rounded-full bg-muted/50 hover:bg-muted border border-border/50 text-muted-foreground text-sm transition-colors"
          >
            Share something...
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenModal()}
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={() => handleOpenModal('social')}
            >
              <Image className="h-4 w-4 text-emerald-500" />
              <span className="hidden sm:inline">Image</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={() => handleOpenModal('social')}
            >
              <Video className="h-4 w-4 text-blue-500" />
              <span className="hidden sm:inline">Video</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={() => handleOpenModal('social', true)}
            >
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <span className="hidden sm:inline">Poll</span>
            </Button>
          </div>

          {/* Visibility dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Public</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => handleOpenModal()}>
                Company Wide
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenModal()}>
                Specific Offices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenModal()}>
                Specific Departments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <CreatePostModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialPostType={initialPostType}
        initialWithPoll={initialWithPoll}
        canPostAnnouncement={canPostAnnouncement}
        canPostExecutive={canPostExecutive}
      />
    </>
  );
};
