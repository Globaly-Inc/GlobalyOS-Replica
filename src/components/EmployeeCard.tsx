import { Employee } from "@/types/employee";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Mail, Calendar, Send, MapPin, Building2, Users } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCountryFlag } from "@/lib/countryFlags";
import { formatMonthYear } from "@/lib/utils";
import { OrgLink } from "./OrgLink";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface EmployeeCardProps {
  employee: Employee;
  showResendInvite?: boolean;
  role?: string | null;
  isOnline?: boolean;
}

export const EmployeeCard = ({ employee, showResendInvite = false, role, isOnline }: EmployeeCardProps) => {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      case 'inactive':
        return { label: 'Inactive', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
      case 'invited':
      default:
        return { label: 'Invited', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    }
  };

  const getRoleConfig = (role?: string | null) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
      case 'hr':
        return { label: 'HR', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      default:
        return { label: 'User', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
    }
  };

  const statusConfig = getStatusConfig(employee.status);
  const roleConfig = getRoleConfig(role);

  const handleResendInvite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('resend-invite', {
        body: { employeeId: employee.id },
      });

      if (error || data?.error) {
        toast({
          title: "Failed to resend invite",
          description: data?.error || error?.message || "Please try again later",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation Resent",
          description: `A reminder email has been sent to ${employee.email}`,
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <OrgLink to={`/team/${employee.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full">
        <div className="p-6 relative">
          {showResendInvite && employee.status === 'invited' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={handleResendInvite}
                    disabled={resending}
                  >
                    <Send className={`h-4 w-4 ${resending ? 'animate-pulse' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{resending ? 'Sending...' : 'Resend Invite'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-primary/10 transition-transform group-hover:scale-105">
                {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-bold">
                  {employee.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-card" />
              )}
              <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium rounded-full ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>
            
            <div className="space-y-2 w-full">
              <h3 className="font-bold text-lg text-foreground">{employee.name}</h3>
              <p className="text-sm font-medium text-primary">{employee.position}</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="secondary" className="font-normal">
                  {employee.department}
                </Badge>
                <Badge className={`font-normal ${roleConfig.className} border-0`}>
                  {roleConfig.label}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 w-full pt-4 border-t border-border">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{employee.email}</span>
              </div>
              {employee.officeName && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{employee.officeName}</span>
                  {employee.officeEmployeeCount !== undefined && (
                    <span className="flex items-center gap-1 text-muted-foreground/70">
                      <Users className="h-3 w-3" />
                      {employee.officeEmployeeCount}
                    </span>
                  )}
                </div>
              )}
              {(employee.city || employee.country) && (
                <div className="hidden sm:flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {employee.city}
                    {employee.city && employee.country && ", "}
                    {employee.country && (
                      <span>
                        {getCountryFlag(employee.country)} {employee.country}
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="hidden sm:flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  Joined {formatMonthYear(employee.joinDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </OrgLink>
  );
};
