import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { OrgLink } from '@/components/OrgLink';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Mail, Phone, MapPin, Building, Calendar, Tag, Globe, Flame, Handshake, Snowflake, User } from 'lucide-react';
import { useCRMContact, useCRMActivities, useCreateCRMActivity } from '@/services/useCRM';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PageBody } from '@/components/ui/page-body';

const RatingBadge = ({ rating }: { rating: string | null }) => {
  if (rating === 'hot') return <Badge className="bg-red-100 text-red-700 border-red-200"><Flame className="h-3 w-3 mr-1" />Hot</Badge>;
  if (rating === 'warm') return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><Handshake className="h-3 w-3 mr-1" />Warm</Badge>;
  if (rating === 'cold') return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Snowflake className="h-3 w-3 mr-1" />Cold</Badge>;
  return null;
};

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
};

const CRMContactProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: contact, isLoading } = useCRMContact(id || null);
  const { data: activities = [] } = useCRMActivities(id || null, null);
  const createActivity = useCreateCRMActivity();
  const [noteText, setNoteText] = useState('');

  const handleAddNote = () => {
    if (!noteText.trim() || !id) return;
    createActivity.mutate(
      { contact_id: id, type: 'note', content: noteText },
      {
        onSuccess: () => { setNoteText(''); toast.success('Note added'); },
        onError: () => toast.error('Failed to add note'),
      }
    );
  };

  if (isLoading) {
    return (
      <PageBody>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </PageBody>
    );
  }

  if (!contact) {
    return (
      <PageBody>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Contact not found</p>
          <OrgLink to="/crm">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to CRM
            </Button>
          </OrgLink>
        </div>
      </PageBody>
    );
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  const address = [contact.address_street, contact.address_city, contact.address_state, contact.address_postcode, contact.address_country].filter(Boolean).join(', ');
  const noteActivities = activities.filter(a => a.type === 'note');

  return (
    <PageBody>
      <div className="space-y-4 md:space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between pt-[10px]">
          <OrgLink to="/crm">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Contacts</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </OrgLink>
        </div>

        {/* Top Card - Profile Header */}
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
                <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
                <RatingBadge rating={contact.rating} />
                {contact.is_archived && (
                  <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Archived</Badge>
                )}
              </div>
              {contact.job_title && (
                <p className="text-base font-medium text-primary">{contact.job_title}</p>
              )}
              {contact.company && (
                <div className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-muted-foreground" />
                  <OrgLink to={`/crm/companies/${contact.company.id}`} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                    {contact.company.name}
                  </OrgLink>
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
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Grid: Left sidebar + Right tabs */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-1">
            {/* Contact Details */}
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 bg-card border-b">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Contact Details</h2>
              </div>
              <CardContent className="p-4 space-y-1">
                <InfoItem icon={Mail} label="Email" value={contact.email} />
                <InfoItem icon={Phone} label="Phone" value={contact.phone} />
                <InfoItem icon={Calendar} label="Date of Birth" value={contact.date_of_birth ? format(new Date(contact.date_of_birth), 'dd MMM yyyy') : null} />
                <InfoItem icon={Globe} label="Source" value={contact.source} />
              </CardContent>
            </Card>

            {/* Address */}
            {address && (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 bg-card border-b">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Address</h2>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-foreground">{address}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {contact.notes && (
              <Card className="overflow-hidden">
                <div className="px-5 py-4 bg-card border-b">
                  <h2 className="text-base font-semibold text-foreground">Notes</h2>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <Tabs defaultValue="activity">
                <TabsList className="mx-4 mt-4 w-fit">
                  <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
                  <TabsTrigger value="notes">Notes ({noteActivities.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="p-4">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((a) => (
                        <div key={a.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={a.employee?.avatar_url || ''} />
                            <AvatarFallback className="text-[10px]">{a.employee?.first_name?.[0]}{a.employee?.last_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{a.employee?.first_name} {a.employee?.last_name}</span>
                              <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                              <span className="text-xs text-muted-foreground ml-auto">{format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}</span>
                            </div>
                            {a.content && <p className="text-sm text-muted-foreground mt-1">{a.content}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="p-4">
                  <div className="space-y-3 mb-4">
                    <Textarea placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} />
                    <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || createActivity.isPending}>
                      {createActivity.isPending ? 'Adding...' : 'Add Note'}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {noteActivities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
                    ) : (
                      noteActivities.map((a) => (
                        <div key={a.id} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{a.employee?.first_name} {a.employee?.last_name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}</span>
                          </div>
                          <p className="text-sm">{a.content}</p>
                        </div>
                      ))
                    )}
                  </div>
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
