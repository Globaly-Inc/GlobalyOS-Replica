import { ChevronDown, Plus, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

export const OrganizationSwitcher = () => {
  const { currentOrg, organizations, switchOrganization, orgRole } = useOrganization();
  const { isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();

  if (!currentOrg) return null;

  const handleSwitchOrg = (orgId: string, orgSlug: string) => {
    switchOrganization(orgId);
    // Navigate to the new org's home page using slug (orgCode)
    navigate(`/org/${orgSlug}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 px-3">
          <Avatar className="h-5 w-5 rounded">
            <AvatarImage src={currentOrg.logo_url || ''} alt={currentOrg.name} className="object-cover" />
            <AvatarFallback className="rounded bg-primary/10 text-primary text-xs font-semibold">
              {currentOrg.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
            onClick={() => handleSwitchOrg(org.id, org.slug)}
            className="cursor-pointer group"
          >
            <Avatar className="h-5 w-5 rounded mr-2">
              <AvatarImage src={org.logo_url || ''} alt={org.name} className="object-cover" />
              <AvatarFallback className="rounded bg-primary/10 text-primary text-xs">
                {org.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate">{org.name}</span>
          </DropdownMenuItem>
        ))}
        {(orgRole === 'owner' || orgRole === 'admin') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate('/signup')}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Org
            </DropdownMenuItem>
          </>
        )}
        {isSuperAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate('/super-admin')}
              className="cursor-pointer text-amber-600"
            >
              <Shield className="mr-2 h-4 w-4" />
              Super Admin
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};