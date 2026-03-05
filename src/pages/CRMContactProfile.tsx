import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { OrgLink } from '@/components/OrgLink';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Mail, Phone, MapPin, Building, Calendar, Globe, Flame, Handshake, Snowflake, User, CalendarPlus, Copy, ExternalLink, Clock, Video } from 'lucide-react';
import { useCRMContact, useCRMActivities, useUpdateCRMContact } from '@/services/useCRM';
import { useCRMDuplicateContacts } from '@/services/useCRMDuplicates';
import { useSchedulerEventTypes } from '@/services/useScheduler';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PageBody } from '@/components/ui/page-body';
import { EditableField } from '@/components/EditableField';
import { ClickToEdit } from '@/components/ui/ClickToEdit';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { CRMLinkedTasks } from '@/components/crm/CRMLinkedTasks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TagSelector } from '@/components/crm/TagSelector';
import { DuplicateDetector } from '@/components/crm/DuplicateDetector';
import { CRMCustomFieldsDisplay } from '@/components/crm/CRMCustomFieldsDisplay';

const RatingBadge = ({ rating, onChangeRating }: { rating: string | null; onChangeRating: (r: string) => void }) => {
  const [open, setOpen] = useState(false);
  const icon = rating === 'hot' ? <Flame className="h-3 w-3 mr-1" /> : rating === 'warm' ? <Handshake className="h-3 w-3 mr-1" /> : rating === 'cold' ? <Snowflake className="h-3 w-3 mr-1" /> : null;
  const colors = rating === 'hot' ? 'bg-red-100 text-red-700 border-red-200' : rating === 'warm' ? 'bg-orange-100 text-orange-700 border-orange-200' : rating === 'cold' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-muted text-muted-foreground';

  return (
    <Select value={rating || ''} onValueChange={(v) => onChangeRating(v)}>
      <SelectTrigger className={`w-auto h-7 px-2 border ${colors} text-xs font-medium gap-1`}>
        {icon}{rating ? rating.charAt(0).toUpperCase() + rating.slice(1) : 'Set Rating'}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="hot"><span className="flex items-center gap-1"><Flame className="h-3 w-3 text-red-500" />Hot</span></SelectItem>
        <SelectItem value="warm"><span className="flex items-center gap-1"><Handshake className="h-3 w-3 text-orange-500" />Warm</span></SelectItem>
        <SelectItem value="cold"><span className="flex items-center gap-1"><Snowflake className="h-3 w-3 text-blue-500" />Cold</span></SelectItem>
      </SelectContent>
    </Select>
  );
};

const CRMContactProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: contact, isLoading } = useCRMContact(id || null);
  const { data: activities = [] } = useCRMActivities(id || null, null);
  const updateContact = useUpdateCRMContact();
  const { data: duplicates = [] } = useCRMDuplicateContacts(contact);
  const { data: eventTypes = [] } = useSchedulerEventTypes();
  const { orgCode } = useOrgNavigation();
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);

  const updateField = async (field: string, value: string) => {
    if (!id) return;
    updateContact.mutate(
      { id, [field]: value || null } as any,
      { onSuccess: () => toast.success('Updated'), onError: () => toast.error('Failed to update') }
    );
  };

  const updateRating = (rating: string) => {
    if (!id) return;
    updateContact.mutate({ id, rating } as any, { onSuccess: () => toast.success('Rating updated') });
  };

  const updateTags = (tags: string[]) => {
    if (!id) return;
    updateContact.mutate({ id, tags } as any, { onSuccess: () => toast.success('Tags updated') });
  };

  const updateCustomFields = async (customFields: Record<string, any>) => {
    if (!id) return;
    updateContact.mutate({ id, custom_fields: customFields } as any, { onSuccess: () => toast.success('Updated') });
  };

  if (isLoading) {
    return <PageBody><Card className="p-12 text-center"><p className="text-muted-foreground">Loading...</p></Card></PageBody>;
  }

  if (!contact) {
    return (
      <PageBody>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Contact not found</p>
          <OrgLink to="/crm"><Button className="mt-4" variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to CRM</Button></OrgLink>
        </div>
      </PageBody>
    );
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  const address = [contact.address_street, contact.address_city, contact.address_state, contact.address_postcode, contact.address_country].filter(Boolean).join(', ');

  return (
    <PageBody>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between pt-[10px]">
          <OrgLink to="/crm">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Contacts</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </OrgLink>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleMeetingOpen(true)}
            disabled={eventTypes.filter(e => e.is_active).length === 0}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>

        {/* Schedule Meeting Dialog */}
        <Dialog open={scheduleMeetingOpen} onOpenChange={setScheduleMeetingOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule a Meeting</DialogTitle>
              <DialogDescription>
                Pick an event type to generate a pre-filled booking link for{' '}
                <span className="font-medium text-foreground">{contact?.first_name}</span>.
                {contact?.email && (
                  <span className="block text-xs mt-1 text-muted-foreground">
                    Contact email: <span className="font-mono">{contact.email}</span>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {eventTypes.filter(e => e.is_active).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No active event types. Create one in the Scheduler.
                </p>
              ) : (
                eventTypes.filter(e => e.is_active).map(et => {
                  const bookingUrl = `${window.location.origin}/s/${orgCode}/scheduler/${et.slug}${contact?.email ? `?email=${encodeURIComponent(contact.email)}&name=${encodeURIComponent([contact.first_name, contact.last_name].filter(Boolean).join(' '))}` : ''}`;
                  return (
                    <div
                      key={et.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{et.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {et.duration_minutes} min
                          </span>
                          {et.location_type === 'google_meet' && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Video className="h-3 w-3" />
                              Google Meet
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(bookingUrl);
                            toast.success('Booking link copied!');
                          }}
                          title="Copy link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(bookingUrl, '_blank', 'noopener,noreferrer')}
                          title="Open booking page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Top Card */}
        <Card className="p-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <Avatar className="h-28 w-28 border-4 border-primary/10 shrink-0">
              <AvatarImage src={contact.avatar_url || undefined} alt={fullName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-3xl font-bold">
                {contact.first_name?.[0]}{contact.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ClickToEdit canEdit onEdit={() => {}} className="text-2xl font-bold text-foreground">
                  <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
                </ClickToEdit>
                <RatingBadge rating={contact.rating} onChangeRating={updateRating} />
                {contact.is_archived && <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Archived</Badge>}
              </div>
              {contact.job_title && <p className="text-base font-medium text-primary">{contact.job_title}</p>}
              {contact.company && (
                <div className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-muted-foreground" />
                  <OrgLink to={`/crm/companies/${contact.company.id}`} className="text-sm text-muted-foreground hover:text-primary hover:underline">{contact.company.name}</OrgLink>
                </div>
              )}
              <div className="flex items-center gap-4 flex-wrap pt-1">
                {contact.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-sm text-muted-foreground hover:text-primary">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{contact.phone}</span>
                  </div>
                )}
              </div>
              {/* Tags */}
              <div className="pt-1">
                <TagSelector selectedTags={contact.tags || []} onTagsChange={updateTags} />
              </div>
            </div>
          </div>
        </Card>

        {/* Duplicate Detector */}
        <DuplicateDetector type="contact" current={contact} duplicates={duplicates} />

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-1">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 bg-card border-b">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Contact Details</h2>
              </div>
              <CardContent className="p-4 space-y-4">
                <EditableField icon={<Mail className="h-5 w-5" />} label="Email" value={contact.email} onSave={(v) => updateField('email', v)} />
                <EditableField icon={<Phone className="h-5 w-5" />} label="Phone" value={contact.phone} onSave={(v) => updateField('phone', v)} />
                <EditableField icon={<Building className="h-5 w-5" />} label="Job Title" value={contact.job_title} onSave={(v) => updateField('job_title', v)} />
                <EditableField icon={<Calendar className="h-5 w-5" />} label="Date of Birth" value={contact.date_of_birth ? format(new Date(contact.date_of_birth), 'dd MMM yyyy') : null} onSave={(v) => updateField('date_of_birth', v)} />
                <EditableField icon={<Globe className="h-5 w-5" />} label="Source" value={contact.source} onSave={(v) => updateField('source', v)} />
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 bg-card border-b">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Address</h2>
              </div>
              <CardContent className="p-4 space-y-4">
                <EditableField label="Street" value={contact.address_street} onSave={(v) => updateField('address_street', v)} />
                <EditableField label="City" value={contact.address_city} onSave={(v) => updateField('address_city', v)} />
                <EditableField label="State" value={contact.address_state} onSave={(v) => updateField('address_state', v)} />
                <EditableField label="Postcode" value={contact.address_postcode} onSave={(v) => updateField('address_postcode', v)} />
                <EditableField label="Country" value={contact.address_country} onSave={(v) => updateField('address_country', v)} />
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="overflow-hidden">
              <div className="px-5 py-4 bg-card border-b">
                <h2 className="text-base font-semibold text-foreground">Notes</h2>
              </div>
              <CardContent className="p-4">
                <EditableField label="" value={contact.notes} onSave={(v) => updateField('notes', v)} type="textarea" placeholder="Add notes..." />
              </CardContent>
            </Card>

            {/* Custom Fields */}
            <CRMCustomFieldsDisplay entityType="contact" customFieldValues={contact.custom_fields} onSave={updateCustomFields} />
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <Tabs defaultValue="activity">
                <TabsList className="mx-4 mt-4 w-fit">
                  <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                </TabsList>
                <TabsContent value="activity" className="p-4">
                  <ActivityTimeline activities={activities} contactId={id} />
                </TabsContent>
                <TabsContent value="tasks" className="p-4">
                  {id && <CRMLinkedTasks entityType="contact" entityId={id} />}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </PageBody>
  );
};

export default CRMContactProfile;
