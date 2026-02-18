import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { OrgLink } from '@/components/OrgLink';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Mail, Phone, MapPin, Globe, Building, Flame, Handshake, Snowflake, Users } from 'lucide-react';
import { useCRMCompany, useCRMActivities, useCRMContacts, useUpdateCRMCompany } from '@/services/useCRM';
import { useCRMDuplicateCompanies } from '@/services/useCRMDuplicates';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PageBody } from '@/components/ui/page-body';
import { EditableField } from '@/components/EditableField';
import { ClickToEdit } from '@/components/ui/ClickToEdit';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { DuplicateDetector } from '@/components/crm/DuplicateDetector';
import { CRMCustomFieldsDisplay } from '@/components/crm/CRMCustomFieldsDisplay';

const RatingBadge = ({ rating, onChangeRating }: { rating: string | null; onChangeRating: (r: string) => void }) => {
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

const CRMCompanyProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useCRMCompany(id || null);
  const { data: activities = [] } = useCRMActivities(null, id || null);
  const { data: contactsData } = useCRMContacts({ company_id: id || undefined, per_page: 50 });
  const companyContacts = contactsData?.data || [];
  const updateCompany = useUpdateCRMCompany();
  const { data: duplicates = [] } = useCRMDuplicateCompanies(company);

  const updateField = async (field: string, value: string) => {
    if (!id) return;
    updateCompany.mutate(
      { id, [field]: value || null } as any,
      { onSuccess: () => toast.success('Updated'), onError: () => toast.error('Failed to update') }
    );
  };

  const updateRating = (rating: string) => {
    if (!id) return;
    updateCompany.mutate({ id, rating } as any, { onSuccess: () => toast.success('Rating updated') });
  };

  const updateCustomFields = async (customFields: Record<string, any>) => {
    if (!id) return;
    updateCompany.mutate({ id, custom_fields: customFields } as any, { onSuccess: () => toast.success('Updated') });
  };

  if (isLoading) {
    return <PageBody><Card className="p-12 text-center"><p className="text-muted-foreground">Loading...</p></Card></PageBody>;
  }

  if (!company) {
    return (
      <PageBody>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Company not found</p>
          <OrgLink to="/crm"><Button className="mt-4" variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to CRM</Button></OrgLink>
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between pt-[10px]">
          <OrgLink to="/crm">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Companies</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </OrgLink>
        </div>

        {/* Top Card */}
        <Card className="p-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <Avatar className="h-28 w-28 border-4 border-primary/10 shrink-0">
              <AvatarImage src={company.logo_url || undefined} alt={company.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-3xl font-bold">
                {company.name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
                <RatingBadge rating={company.rating} onChangeRating={updateRating} />
              </div>
              {company.industry && <p className="text-base font-medium text-primary">{company.industry}</p>}
              <div className="flex items-center gap-4 flex-wrap pt-1">
                {company.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`mailto:${company.email}`} className="text-sm text-muted-foreground hover:text-primary">{company.email}</a>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{company.phone}</span>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{companyContacts.length} contact{companyContacts.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Duplicate Detector */}
        <DuplicateDetector type="company" current={company} duplicates={duplicates} />

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-1">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 bg-card border-b">
                <Building className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Company Details</h2>
              </div>
              <CardContent className="p-4 space-y-4">
                <EditableField icon={<Mail className="h-5 w-5" />} label="Email" value={company.email} onSave={(v) => updateField('email', v)} />
                <EditableField icon={<Phone className="h-5 w-5" />} label="Phone" value={company.phone} onSave={(v) => updateField('phone', v)} />
                <EditableField icon={<Globe className="h-5 w-5" />} label="Website" value={company.website} onSave={(v) => updateField('website', v)} />
                <EditableField icon={<Building className="h-5 w-5" />} label="Industry" value={company.industry} onSave={(v) => updateField('industry', v)} />
                <EditableField icon={<Globe className="h-5 w-5" />} label="Source" value={company.source} onSave={(v) => updateField('source', v)} />
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 bg-card border-b">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Address</h2>
              </div>
              <CardContent className="p-4 space-y-4">
                <EditableField label="Street" value={company.address_street} onSave={(v) => updateField('address_street', v)} />
                <EditableField label="City" value={company.address_city} onSave={(v) => updateField('address_city', v)} />
                <EditableField label="State" value={company.address_state} onSave={(v) => updateField('address_state', v)} />
                <EditableField label="Postcode" value={company.address_postcode} onSave={(v) => updateField('address_postcode', v)} />
                <EditableField label="Country" value={company.address_country} onSave={(v) => updateField('address_country', v)} />
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="overflow-hidden">
              <div className="px-5 py-4 bg-card border-b">
                <h2 className="text-base font-semibold text-foreground">Notes</h2>
              </div>
              <CardContent className="p-4">
                <EditableField label="" value={company.notes} onSave={(v) => updateField('notes', v)} type="textarea" placeholder="Add notes..." />
              </CardContent>
            </Card>

            {/* Custom Fields */}
            <CRMCustomFieldsDisplay entityType="company" customFieldValues={company.custom_fields} onSave={updateCustomFields} />
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <Tabs defaultValue="contacts">
                <TabsList className="mx-4 mt-4 w-fit">
                  <TabsTrigger value="contacts">Contacts ({companyContacts.length})</TabsTrigger>
                  <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="contacts" className="p-4">
                  {companyContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No contacts linked to this company.</p>
                  ) : (
                    <div className="space-y-2">
                      {companyContacts.map((c) => (
                        <OrgLink key={c.id} to={`/crm/contacts/${c.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={c.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{c.first_name?.[0]}{c.last_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                            {c.job_title && <p className="text-xs text-muted-foreground">{c.job_title}</p>}
                          </div>
                          {c.email && <span className="text-xs text-muted-foreground hidden sm:block">{c.email}</span>}
                        </OrgLink>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="p-4">
                  <ActivityTimeline activities={activities} companyId={id} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </PageBody>
  );
};

export default CRMCompanyProfile;
