import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { EditKpiOwnersDialog } from './EditKpiOwnersDialog';
import { KpiOwner } from '@/services/useKpiOwners';

interface KpiOwnersDisplayProps {
  owners: KpiOwner[];
  kpiId: string;
  canEdit: boolean;
  scopeType: string;
  maxDisplay?: number;
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

  // For individual KPIs, show single owner with full name and photo
  if (isIndividual) {
    const owner = owners[0];
    
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {owner ? (
            <>
              <Avatar className="h-10 w-10">
                <AvatarImage src={owner.avatar_url || undefined} alt={owner.full_name} />
                <AvatarFallback>
                  {owner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{owner.full_name}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No owner assigned</span>
          )}
        </div>
        
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
