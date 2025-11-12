import { Kudos } from "@/types/employee";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card } from "./ui/card";
import { Heart } from "lucide-react";

interface KudosCardProps {
  kudos: Kudos;
}

export const KudosCard = ({ kudos }: KudosCardProps) => {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md border-accent/20">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border-2 border-accent/20">
            <AvatarFallback className="bg-gradient-to-br from-accent to-accent/80 text-accent-foreground font-semibold">
              {kudos.employeeName.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{kudos.employeeName}</p>
                <p className="text-sm text-muted-foreground">
                  Kudos from {kudos.givenBy} • {new Date(kudos.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Heart className="h-5 w-5 text-accent fill-accent" />
            </div>
            
            <p className="text-foreground leading-relaxed italic">"{kudos.comment}"</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
