import { useCRMContact, useCRMCompany } from '@/services/useCRM';
import { useCRMDeal } from '@/services/useCRMDeals';

interface RelatedEntityNameProps {
  entityType: string;
  entityId: string;
}

export const RelatedEntityName = ({ entityType, entityId }: RelatedEntityNameProps) => {
  switch (entityType) {
    case 'contact': return <ContactName id={entityId} />;
    case 'company': return <CompanyName id={entityId} />;
    case 'deal': return <DealName id={entityId} />;
    default: return <span>Linked</span>;
  }
};

const ContactName = ({ id }: { id: string }) => {
  const { data: contact } = useCRMContact(id);
  if (!contact) return <span className="text-muted-foreground">…</span>;
  return <>{`${contact.first_name} ${contact.last_name || ''}`.trim()}</>;
};

const CompanyName = ({ id }: { id: string }) => {
  const { data: company } = useCRMCompany(id);
  if (!company) return <span className="text-muted-foreground">…</span>;
  return <>{company.name}</>;
};

const DealName = ({ id }: { id: string }) => {
  const { data: deal } = useCRMDeal(id);
  if (!deal) return <span className="text-muted-foreground">…</span>;
  return <>{deal.title}</>;
};
