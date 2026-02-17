import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Phone, Mail, MapPin, Flame, Handshake, Snowflake, Users } from 'lucide-react';
import { useCRMCompany, useCRMActivities, useCreateCRMActivity, useCRMContacts } from '@/services/useCRM';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
  companyId: string | null;
  onClose: () => void;
}

const RatingBadge = ({ rating }: { rating: string | null }) => {
  if (rating === 'hot') return <Badge className="bg-red-100 text-red-700 border-red-200"><Flame className="h-3 w-3 mr-1" />Hot</Badge>;
  if (rating === 'warm') return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><Handshake className="h-3 w-3 mr-1" />Warm</Badge>;
  if (rating === 'cold') return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Snowflake className="h-3 w-3 mr-1" />Cold</Badge>;
  return null;
};

const InfoRow = ({ icon: Icon, label, value, isLink }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null; isLink?: boolean }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{value.replace(/^https?:\/\//, '')}</a>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    </div>
  );
};

export const CompanyDetailDialog = ({ companyId, onClose }: Props) => {
  const { data: company, isLoading } = useCRMCompany(companyId);
  const { data: activities = [] } = useCRMActivities(null, companyId);
  const { data: contactsData } = useCRMContacts({ company_id: companyId || undefined, per_page: 50 });
  const companyContacts = contactsData?.data || [];
  const createActivity = useCreateCRMActivity();
  const [noteText, setNoteText] = useState('');

  const handleAddNote = () => {
    if (!noteText.trim() || !companyId) return;
    createActivity.mutate(
      { company_id: companyId, type: 'note', content: noteText },
      {
        onSuccess: () => { setNoteText(''); toast.success('Note added'); },
        onError: () => toast.error('Failed to add note'),
      }
    );
  };

  const address = company ? [company.address_street, company.address_city, company.address_state, company.address_postcode, company.address_country].filter(Boolean).join(', ') : null;

  return (
    <Dialog open={!!companyId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Company Details</DialogTitle>
        {isLoading || !company ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
        ) : (
          <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
            {/* Left – Profile */}
            <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-border p-6 overflow-y-auto">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-20 w-20 mb-3">
                  <AvatarImage src={company.logo_url || ''} />
                  <AvatarFallback className="text-lg">{company.name?.[0]}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold">{company.name}</h2>
                {company.industry && <p className="text-sm text-muted-foreground">{company.industry}</p>}
                <div className="mt-2"><RatingBadge rating={company.rating} /></div>
              </div>

              <div className="space-y-1 border-t border-border pt-4">
                <InfoRow icon={Globe} label="Website" value={company.website} isLink />
                <InfoRow icon={Phone} label="Phone" value={company.phone} />
                <InfoRow icon={Mail} label="Email" value={company.email} />
                <InfoRow icon={MapPin} label="Address" value={address} />
              </div>

              {company.source && (
                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-xs text-muted-foreground">Source</p>
                  <Badge variant="outline" className="mt-1 text-xs">{company.source}</Badge>
                </div>
              )}
            </div>

            {/* Right – Tabs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs defaultValue="contacts" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="mx-6 mt-4 w-fit">
                  <TabsTrigger value="contacts">Contacts ({companyContacts.length})</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="contacts" className="flex-1 overflow-y-auto px-6 pb-6">
                  {companyContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-4">No contacts linked to this company.</p>
                  ) : (
                    <div className="space-y-2 mt-4">
                      {companyContacts.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={c.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{c.first_name?.[0]}{c.last_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                            {c.job_title && <p className="text-xs text-muted-foreground">{c.job_title}</p>}
                          </div>
                          {c.email && <span className="text-xs text-muted-foreground hidden sm:block">{c.email}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="flex-1 overflow-y-auto px-6 pb-6">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-4">No activity yet.</p>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {activities.map((a) => (
                        <div key={a.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={a.employee?.avatar_url || ''} />
                            <AvatarFallback className="text-[10px]">{a.employee?.first_name?.[0]}{a.employee?.last_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
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

                <TabsContent value="notes" className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
                  <div className="mt-4 space-y-3">
                    <Textarea placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} />
                    <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || createActivity.isPending}>
                      {createActivity.isPending ? 'Adding...' : 'Add Note'}
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto mt-4 space-y-3">
                    {activities.filter(a => a.type === 'note').map((a) => (
                      <div key={a.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{a.employee?.first_name} {a.employee?.last_name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}</span>
                        </div>
                        <p className="text-sm">{a.content}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
