import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Building2, MapPin, Trash2, Users, Clock, CalendarDays } from 'lucide-react';
import { EditableField } from '@/components/EditableField';
import { OfficeScheduleCard } from './OfficeScheduleCard';
import { OfficeOverviewStats } from './OfficeOverviewStats';
import { OfficeTeamList } from './OfficeTeamList';
import { OfficeLeaveSettings } from '@/components/settings/OfficeLeaveSettings';
 import { OfficeAttendanceSettings } from './OfficeAttendanceSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';

export interface Office {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  organization_id: string;
  employee_count: number;
  leave_year_start_month?: number;
  leave_year_start_day?: number;
  leave_enabled?: boolean;
}

interface OfficeDetailViewProps {
  office: Office;
  onOfficeUpdated: (office: Partial<Office>) => void;
  onOfficeDeleted: (officeId: string) => void;
}

export const OfficeDetailView = ({ office, onOfficeUpdated, onOfficeDeleted }: OfficeDetailViewProps) => {
  const [deleting, setDeleting] = useState(false);
  const { currentOrg } = useOrganization();

  const handleUpdateField = async (field: keyof Office, value: string) => {
    const { error } = await supabase
      .from('offices')
      .update({ [field]: value || null })
      .eq('id', office.id);

    if (error) {
      toast.error('Failed to update office');
      console.error('Error updating office:', error);
      return;
    }

    onOfficeUpdated({ id: office.id, [field]: value || null });
    toast.success('Office updated');
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from('offices')
      .delete()
      .eq('id', office.id);

    setDeleting(false);

    if (error) {
      toast.error('Failed to delete office');
      console.error('Error deleting office:', error);
      return;
    }

    toast.success('Office deleted');
    onOfficeDeleted(office.id);
  };

  return (
    <div className="space-y-6">
      {/* Office Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <EditableField
                  label=""
                  value={office.name}
                  onSave={(value) => handleUpdateField('name', value)}
                  className="text-2xl font-semibold"
                />
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Office</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{office.name}"? This action cannot be undone.
                    {office.employee_count > 0 && (
                      <span className="block mt-2 text-destructive">
                        Warning: {office.employee_count} employees are assigned to this office.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EditableField
              label="Address"
              value={office.address || ''}
              onSave={(value) => handleUpdateField('address', value)}
              placeholder="Street address"
              icon={<MapPin className="h-4 w-4" />}
            />
            <EditableField
              label="City"
              value={office.city || ''}
              onSave={(value) => handleUpdateField('city', value)}
              placeholder="City"
            />
            <EditableField
              label="Country"
              value={office.country || ''}
              onSave={(value) => handleUpdateField('country', value)}
              placeholder="Country"
            />
          </div>
          <div className="pt-2 text-sm text-muted-foreground">
            {office.employee_count} {office.employee_count === 1 ? 'employee' : 'employees'} in this office
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="gap-1.5">
            <Users className="h-4 w-4" />
            Overview & Team
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Attendance Settings
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Leave Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-6">
            <OfficeOverviewStats officeId={office.id} />
            <OfficeTeamList officeId={office.id} officeName={office.name} />
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <div className="space-y-6">
            <OfficeScheduleCard office={office} onOfficeUpdated={onOfficeUpdated} />
            {currentOrg?.id && (
              <OfficeAttendanceSettings
                officeId={office.id}
                organizationId={currentOrg.id}
                embedded
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          {currentOrg?.id && (
            <OfficeLeaveSettings
              office={office}
              organizationId={currentOrg.id}
              onOfficeUpdated={onOfficeUpdated}
              embedded
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
