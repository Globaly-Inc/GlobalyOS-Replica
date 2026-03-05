import { Mail, Phone, Building, Briefcase, User, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrgLink } from '@/components/OrgLink';
import { useCRMContact, useCRMCompany } from '@/services/useCRM';
import { useCRMDeal } from '@/services/useCRMDeals';

interface RelatedEntityCardProps {
  entityType: string;
  entityId: string;
}

export const RelatedEntityCard = ({ entityType, entityId }: RelatedEntityCardProps) => {
  if (entityType === 'contact') return <ContactCard id={entityId} />;
  if (entityType === 'company') return <CompanyCard id={entityId} />;
  if (entityType === 'deal') return <DealCard id={entityId} />;
  return null;
};

const ContactCard = ({ id }: { id: string }) => {
  const { data: contact, isLoading } = useCRMContact(id);
  if (isLoading || !contact) return null;

  const fullName = `${contact.first_name} ${contact.last_name || ''}`.trim();

  return (
    <Card className="p-3 bg-muted/30 border-dashed">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{fullName}</span>
          </div>
          {contact.job_title && (
            <p className="text-xs text-muted-foreground pl-5">{contact.job_title}</p>
          )}
          {contact.company && (
            <div className="flex items-center gap-1 pl-5">
              <Building className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{contact.company.name}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-1 pl-5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-1 pl-5">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{contact.phone}</span>
            </div>
          )}
        </div>
        <OrgLink to={`/crm/contacts/${id}`}>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
        </OrgLink>
      </div>
    </Card>
  );
};

const CompanyCard = ({ id }: { id: string }) => {
  const { data: company, isLoading } = useCRMCompany(id);
  if (isLoading || !company) return null;

  return (
    <Card className="p-3 bg-muted/30 border-dashed">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{company.name}</span>
          </div>
          {company.industry && (
            <p className="text-xs text-muted-foreground pl-5">{company.industry}</p>
          )}
          {company.email && (
            <div className="flex items-center gap-1 pl-5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">{company.email}</span>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-1 pl-5">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{company.phone}</span>
            </div>
          )}
        </div>
        <OrgLink to={`/crm/companies/${id}`}>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
        </OrgLink>
      </div>
    </Card>
  );
};

const DealCard = ({ id }: { id: string }) => {
  const { data: deal, isLoading } = useCRMDeal(id);
  if (isLoading || !deal) return null;

  return (
    <Card className="p-3 bg-muted/30 border-dashed">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{deal.title}</span>
          </div>
          {deal.current_stage && (
            <div className="pl-5">
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: deal.current_stage.color || undefined }}>
                {deal.current_stage.name}
              </Badge>
            </div>
          )}
          {deal.contact && (
            <div className="flex items-center gap-1 pl-5">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{deal.contact.first_name} {deal.contact.last_name}</span>
            </div>
          )}
          {deal.value != null && (
            <p className="text-xs text-muted-foreground pl-5">
              Value: {deal.currency || '$'}{Number(deal.value).toLocaleString()}
            </p>
          )}
        </div>
        <OrgLink to={`/crm/deals/${id}`}>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
        </OrgLink>
      </div>
    </Card>
  );
};
