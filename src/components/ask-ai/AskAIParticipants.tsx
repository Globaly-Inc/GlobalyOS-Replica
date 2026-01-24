import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  employee_id: string;
  role: string;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface AskAIParticipantsProps {
  participants: Participant[];
  ownerName: string;
  ownerAvatar?: string | null;
  maxVisible?: number;
  className?: string;
}

export const AskAIParticipants = ({
  participants,
  ownerName,
  ownerAvatar,
  maxVisible = 3,
  className,
}: AskAIParticipantsProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Include owner + participants
  const allParticipants = [
    { name: ownerName, avatar: ownerAvatar, isOwner: true },
    ...participants.map((p) => ({
      name: p.employee?.profiles.full_name || "Unknown",
      avatar: p.employee?.profiles.avatar_url,
      isOwner: false,
    })),
  ];

  const visibleParticipants = allParticipants.slice(0, maxVisible);
  const remainingCount = allParticipants.length - maxVisible;

  if (allParticipants.length <= 1) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center -space-x-2", className)}>
        {visibleParticipants.map((participant, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  "h-7 w-7 border-2 border-background",
                  participant.isOwner && "ring-2 ring-primary/20"
                )}
              >
                <AvatarImage src={participant.avatar || undefined} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {participant.name}
                {participant.isOwner && " (Owner)"}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-[10px] font-medium text-muted-foreground">
                  +{remainingCount}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-0.5">
                {allParticipants.slice(maxVisible).map((p, i) => (
                  <p key={i}>{p.name}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
