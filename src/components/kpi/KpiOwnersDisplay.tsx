import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { EditKpiOwnersDialog } from './EditKpiOwnersDialog';
import { KpiOwner } from '@/services/useKpiOwners';
import { OrgLink } from '@/components/OrgLink';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface KpiOwnersDisplayProps {
  owners: KpiOwner[];
  kpiId: string;
  canEdit: boolean;
  scopeType: string;
  maxDisplay?: number;
}

// Sub-component for Individual KPI Owner with online status and link
function IndividualKpiOwner({ 
  owner, 
  kpiId, 
  owners,
  scopeType,
  canEdit 
}: { 
  owner: KpiOwner | undefined; 
  kpiId: string; 
  owners: KpiOwner[];
  scopeType: string;
  canEdit: boolean;
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { isOnline } = useOnlineStatus(owner?.employee_id);

  return (
    <div className="flex items-center justify-between">
      {owner ? (
        <OrgLink 
          to={`/team/${owner.employee_id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {/* Avatar with online status dot */}
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={owner.avatar_url || undefined} alt={owner.full_name} />
              <AvatarFallback>
                {owner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          
          {/* Name and Position */}
          <div className="flex flex-col">
            <span className="font-medium">{owner.full_name}</span>
            {owner.position && (
              <span className="text-xs text-muted-foreground">{owner.position}</span>
            )}
          </div>
        </OrgLink>
      ) : (
        <span className="text-sm text-muted-foreground">No owner assigned</span>
      )}
      
      {canEdit && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowEditDialog(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      
      <EditKpiOwnersDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        kpiId={kpiId}
        currentOwners={owners}
        scopeType={scopeType}
      />
    </div>
  );
}

export function KpiOwnersDisplay({ 
  owners, 
  kpiId, 
  canEdit,
  scopeType,
  maxDisplay = 3 
}: KpiOwnersDisplayProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const isIndividual = scopeType === 'individual';
  const displayedOwners = owners.slice(0, maxDisplay);
  const remainingCount = owners.length - maxDisplay;

  // For individual KPIs, show single owner with full name, position, online status and link to profile
  if (isIndividual) {
    return <IndividualKpiOwner 
      owner={owners[0]} 
      kpiId={kpiId} 
      owners={owners}
      scopeType={scopeType}
      canEdit={canEdit} 
    />;
  }

  // For group/organization KPIs, show stacked avatars
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {owners.length === 0 ? (
          <span className="text-sm text-muted-foreground">No owners assigned</span>
        ) : (
          <>
            {/* Stacked Avatars */}
            <div className="flex -space-x-2">
              {displayedOwners.map((owner) => (
                <Avatar 
                  key={owner.employee_id} 
                  className="h-8 w-8 border-2 border-background ring-0"
                  title={owner.full_name}
                >
                  <AvatarImage src={owner.avatar_url || undefined} alt={owner.full_name} />
                  <AvatarFallback className="text-xs">
                    {owner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              
              {remainingCount > 0 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </div>
            
            {/* Name(s) */}
            <span className="text-sm font-medium">
              {owners.length === 1 && owners[0].full_name}
              {owners.length > 1 && `${owners.length} owners`}
            </span>
          </>
        )}
      </div>
      
      {/* Edit Button */}
      {canEdit && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0"
          onClick={() => setShowEditDialog(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      
      {/* Edit Dialog */}
      <EditKpiOwnersDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        kpiId={kpiId}
        currentOwners={owners}
        scopeType={scopeType}
      />
    </div>
  );
}
