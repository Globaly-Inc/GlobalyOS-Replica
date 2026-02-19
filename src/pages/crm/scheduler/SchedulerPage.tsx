import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Users, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageBody } from '@/components/ui/page-body';
import { EventTypesTab } from './EventTypesTab';
import { ScheduledEventsTab } from './ScheduledEventsTab';
import { IntegrationsTab } from './IntegrationsTab';
import { CreateEventTypeWizard } from '@/components/crm/scheduler/CreateEventTypeWizard';

export default function SchedulerPage() {
  const { currentOrg } = useOrganization();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <PageBody>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Scheduler</h1>
            <p className="text-sm text-muted-foreground">
              Create booking pages and manage your scheduled meetings
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setEditId(null); setWizardOpen(true); }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Event Type
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="event-types" className="space-y-4">
        <TabsList className="w-fit">
          <TabsTrigger value="event-types" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Event Types
          </TabsTrigger>
          <TabsTrigger value="scheduled-events" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Scheduled Events
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="event-types">
          <EventTypesTab
            onEdit={(id) => { setEditId(id); setWizardOpen(true); }}
            onNew={() => { setEditId(null); setWizardOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="scheduled-events">
          <ScheduledEventsTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>

      {/* Create / Edit Wizard */}
      <CreateEventTypeWizard
        open={wizardOpen}
        editId={editId}
        onClose={() => { setWizardOpen(false); setEditId(null); }}
      />
    </PageBody>
  );
}
