import { Building2, ChevronDown, Check, Plus, Settings } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";

export const OrganizationSwitcher = () => {
  const { currentOrg, organizations, switchOrganization } = useOrganization();
  const navigate = useNavigate();

  if (!currentOrg) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 px-3">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="max-w-[120px] truncate text-sm font-medium">
            {currentOrg.name}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground">Organizations</p>
        </div>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.id)}
            className="cursor-pointer"
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === currentOrg.id && (
              <Check className="ml-2 h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/settings")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Organization Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
