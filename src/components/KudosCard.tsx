import { Kudos } from "@/types/employee";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDateTime } from "@/lib/utils";

interface KudosCardProps {
  kudos: Kudos;
}

export const KudosCard = ({ kudos }: KudosCardProps) => {
  const getFirstName = (fullName: string) => fullName.split(" ")[0];
  
  const allRecipients = [
    getFirstName(kudos.employeeName),
    ...(kudos.otherRecipients?.map(getFirstName) || [])
  ];
  const recipientText = allRecipients.join(", ");

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 transition-all hover:bg-muted/50">
      {/* Title */}
      <p className="text-sm font-medium text-foreground mb-2">
        🙌 Kudos to {recipientText}
      </p>
      
      {/* Message */}
      <p className="text-sm text-foreground/80 leading-relaxed mb-3">
        "{kudos.comment}"
      </p>
      
      {/* Sender */}
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7 border border-border/50">
          {kudos.givenByAvatar && <AvatarImage src={kudos.givenByAvatar} />}
          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
            {kudos.givenBy.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{kudos.givenBy}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(kudos.date)}
          </p>
        </div>
      </div>
    </div>
  );
};
