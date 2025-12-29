import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { EditKpiOwnersDialog } from './EditKpiOwnersDialog';

interface Owner {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface KpiOwnersDisplayProps {
  owners: Owner[];
  kpiId: string;
  canEdit: boolean;
  maxDisplay?: number;
}

export function KpiOwnersDisplay({ 
  owners, 
  kpiId, 
  canEdit, 
  maxDisplay = 3 
}: KpiOwnersDisplayProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const displayedOwners = owners.slice(0, maxDisplay);
  const remainingCount = owners.length - maxDisplay;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Stacked Avatars */}
        <div className="flex -space-x-2">
          {displayedOwners.map((owner) => (
            <Avatar 
              key={owner.id} 
              className="h-8 w-8 border-2 border-background ring-0"
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
          {owners.length === 0 && 'No owner assigned'}
          {owners.length === 1 && owners[0].full_name}
          {owners.length > 1 && `${owners.length} owners`}
        </span>
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
      />
    </div>
  );
}
