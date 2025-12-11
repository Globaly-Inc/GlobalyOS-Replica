import { Kudos } from "@/types/employee";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface KudosCardProps {
  kudos: Kudos;
  compact?: boolean;
}

export const KudosCard = ({ kudos, compact = false }: KudosCardProps) => {
  return (
    <div className={cn(
      "group rounded-lg border border-border/50 bg-muted/30 transition-all hover:bg-muted/50",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-start gap-3">
        <Avatar className={cn(
          "border-2 border-accent/20 shrink-0",
          compact ? "h-8 w-8" : "h-10 w-10"
        )}>
          <AvatarFallback className={cn(
            "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground font-semibold",
            compact ? "text-xs" : "text-sm"
          )}>
            {kudos.employeeName.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className={cn(
                "font-medium text-foreground truncate",
                compact ? "text-sm" : "text-base"
              )}>{kudos.employeeName}</p>
              <p className={cn(
                "text-muted-foreground",
                compact ? "text-xs" : "text-sm"
              )}>
                from {kudos.givenBy} • {new Date(kudos.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <Heart className={cn(
              "text-accent fill-accent shrink-0",
              compact ? "h-4 w-4" : "h-5 w-5"
            )} />
          </div>
          
          <p className={cn(
            "text-foreground/80 leading-relaxed mt-2",
            compact ? "text-sm" : "text-base"
          )}>"{kudos.comment}"</p>
        </div>
      </div>
    </div>
  );
};
