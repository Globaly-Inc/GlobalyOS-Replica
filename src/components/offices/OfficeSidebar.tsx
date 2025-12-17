import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Building2, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddOfficeDialog } from './AddOfficeDialog';
import type { Office } from '@/pages/ManageOffices';

interface OfficeSidebarProps {
  offices: Office[];
  selectedOfficeId: string | null;
  onSelectOffice: (id: string) => void;
  onOfficeCreated: (office: Office) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading: boolean;
}

export const OfficeSidebar = ({
  offices,
  selectedOfficeId,
  onSelectOffice,
  onOfficeCreated,
  searchQuery,
  onSearchChange,
  loading,
}: OfficeSidebarProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <Card className="w-80 flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Offices</h3>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search offices..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Office List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </>
          ) : offices.length === 0 ? (
            <div className="p-6 text-center">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No offices found' : 'No offices yet'}
              </p>
            </div>
          ) : (
            offices.map((office) => (
              <button
                key={office.id}
                onClick={() => onSelectOffice(office.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  selectedOfficeId === office.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedOfficeId === office.id ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Building2 className={cn(
                      "h-4 w-4",
                      selectedOfficeId === office.id ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {office.name}
                    </h4>
                    {(office.city || office.country) && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">
                          {[office.city, office.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {office.employee_count} {office.employee_count === 1 ? 'employee' : 'employees'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <AddOfficeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onOfficeCreated={onOfficeCreated}
      />
    </Card>
  );
};
