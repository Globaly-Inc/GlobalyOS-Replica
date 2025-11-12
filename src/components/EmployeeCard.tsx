import { Employee } from "@/types/employee";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Mail, MapPin, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface EmployeeCardProps {
  employee: Employee;
}

export const EmployeeCard = ({ employee }: EmployeeCardProps) => {
  return (
    <Link to={`/team/${employee.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
        <div className="p-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <Avatar className="h-24 w-24 border-4 border-primary/10 transition-transform group-hover:scale-105">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
                {employee.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2 w-full">
              <h3 className="font-bold text-lg text-foreground">{employee.name}</h3>
              <p className="text-sm font-medium text-primary">{employee.position}</p>
              <Badge variant="secondary" className="font-normal">
                {employee.department}
              </Badge>
            </div>

            <div className="space-y-2 w-full pt-4 border-t border-border">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{employee.email}</span>
              </div>
              {employee.location && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{employee.location}</span>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  Joined {new Date(employee.joinDate).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};
