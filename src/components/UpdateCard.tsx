import { Update } from "@/types/employee";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Trophy, MessageSquare, TrendingUp } from "lucide-react";

interface UpdateCardProps {
  update: Update;
}

const typeConfig = {
  win: {
    icon: Trophy,
    badge: "Win",
    className: "bg-accent-light text-accent border-accent/20",
  },
  achievement: {
    icon: Trophy,
    badge: "Achievement",
    className: "bg-success/10 text-success border-success/20",
  },
  update: {
    icon: MessageSquare,
    badge: "Update",
    className: "bg-primary-light text-primary border-primary/20",
  },
};

export const UpdateCard = ({ update }: UpdateCardProps) => {
  const config = typeConfig[update.type];
  const Icon = config.icon;

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border-2 border-primary/10">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold">
              {update.employeeName.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{update.employeeName}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(update.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge variant="outline" className={config.className}>
                <Icon className="mr-1 h-3 w-3" />
                {config.badge}
              </Badge>
            </div>
            
            <p className="text-foreground leading-relaxed">{update.content}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
