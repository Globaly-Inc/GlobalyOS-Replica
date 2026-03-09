import { useState, useMemo, useEffect } from 'react';
import { Search, X, User, Building, Briefcase, Users, Link2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useEmployees } from '@/services/useEmployees';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';

const ENTITY_TYPES = [
  { value: 'employee', label: 'Employee', icon: User },
  { value: 'department', label: 'Department', icon: Users },
  { value: 'contact', label: 'CRM Contact', icon: User },
  { value: 'company', label: 'CRM Company', icon: Building },
  { value: 'deal', label: 'CRM Deal', icon: Briefcase },
] as const;

type EntityType = typeof ENTITY_TYPES[number]['value'];

interface RelatedToPopoverProps {
  entityType: string | null;
  entityId: string | null;
  onUpdate: (type: string | null, id: string | null) => void;
  children: React.ReactNode;
}

export const RelatedToPopover = ({ entityType, entityId, onUpdate, children }: RelatedToPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'pick'>(entityId ? 'view' : 'pick');
  const [selectedType, setSelectedType] = useState<EntityType | null>(null);
  const [search, setSearch] = useState('');

  // Reset state when popover opens
  useEffect(() => {
    if (open) {
      setMode(entityId ? 'view' : 'pick');
      setSelectedType(null);
      setSearch('');
    }
  }, [open, entityId]);

  const handleSelect = (type: string, id: string) => {
    onUpdate(type, id);
    setOpen(false);
  };

  const handleClear = () => {
    onUpdate(null, null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">Related To</span>
          </div>
          {entityId && (
            <button className="text-xs text-muted-foreground hover:text-destructive" onClick={handleClear}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {mode === 'view' && entityId && entityType ? (
          <div className="p-3 space-y-3">
            {/* Current entity display */}
            <div className="rounded-md border bg-muted/30 p-2.5">
              <CurrentEntityDisplay entityType={entityType} entityId={entityId} />
            </div>

            {/* Radio options */}
            <RadioGroup
              defaultValue="keep"
              onValueChange={(v) => {
                if (v === 'change') {
                  setMode('pick');
                }
              }}
            >
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="keep" id="keep-current" />
                <Label htmlFor="keep-current" className="text-xs cursor-pointer">Keep current</Label>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value="change" id="change-relation" />
                <Label htmlFor="change-relation" className="text-xs cursor-pointer">Change / Add new</Label>
              </div>
            </RadioGroup>

            <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {!selectedType ? (
              <div className="p-2 space-y-0.5">
                {ENTITY_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                      onClick={() => setSelectedType(t.value)}
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="p-2 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] cursor-pointer" onClick={() => setSelectedType(null)}>
                      ← {ENTITY_TYPES.find(t => t.value === selectedType)?.label}
                    </Badge>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      className="h-7 text-xs pl-7"
                      autoFocus
                    />
                  </div>
                </div>
                <ScrollArea className="max-h-[200px]">
                  <EntityList type={selectedType} search={search} onSelect={(id) => handleSelect(selectedType, id)} />
                </ScrollArea>
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

/* ─── Current entity name display ─── */
const CurrentEntityDisplay = ({ entityType, entityId }: { entityType: string; entityId: string }) => {
  const { currentOrg } = useOrganization();
  const { data: employees = [] } = useEmployees({ status: 'active', includeOffice: false });

  const { data: entityName } = useQuery({
    queryKey: ['related-entity-name', entityType, entityId, currentOrg?.id],
    queryFn: async () => {
      if (entityType === 'employee') {
        const emp = employees.find((e: any) => e.id === entityId);
        return emp ? (emp as any).profiles?.full_name || 'Unknown' : 'Unknown';
      }
      if (entityType === 'department') {
        const { data } = await supabase.from('departments').select('name').eq('id', entityId).single();
        return data?.name || 'Unknown';
      }
      if (entityType === 'contact') {
        const { data } = await supabase.from('crm_contacts').select('first_name, last_name').eq('id', entityId).single();
        return data ? `${data.first_name} ${data.last_name || ''}`.trim() : 'Unknown';
      }
      if (entityType === 'company') {
        const { data } = await supabase.from('crm_companies').select('name').eq('id', entityId).single();
        return data?.name || 'Unknown';
      }
      if (entityType === 'deal') {
        const { data } = await supabase.from('crm_deals').select('title').eq('id', entityId).single();
        return data?.title || 'Unknown';
      }
      return 'Unknown';
    },
    enabled: !!entityId && !!entityType,
  });

  const typeLabel = ENTITY_TYPES.find(t => t.value === entityType)?.label || entityType;
  const TypeIcon = ENTITY_TYPES.find(t => t.value === entityType)?.icon || Link2;

  return (
    <div className="flex items-center gap-2">
      <TypeIcon className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
        <p className="text-sm font-medium truncate">{entityName || '…'}</p>
      </div>
    </div>
  );
};

const EntityList = ({ type, search, onSelect }: { type: EntityType; search: string; onSelect: (id: string) => void }) => {
  if (type === 'employee') return <EmployeeList search={search} onSelect={onSelect} />;
  if (type === 'department') return <DepartmentList search={search} onSelect={onSelect} />;
  if (type === 'contact') return <ContactList search={search} onSelect={onSelect} />;
  if (type === 'company') return <CompanyList search={search} onSelect={onSelect} />;
  if (type === 'deal') return <DealList search={search} onSelect={onSelect} />;
  return null;
};

const EmployeeList = ({ search, onSelect }: { search: string; onSelect: (id: string) => void }) => {
  const { data: employees = [] } = useEmployees({ status: 'active', includeOffice: false });
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e: any) => (e.profiles?.full_name || '').toLowerCase().includes(q));
  }, [employees, search]);

  return (
    <div className="p-1">
      {filtered.map((emp: any) => (
        <button
          key={emp.id}
          className="w-full text-left px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
          onClick={() => onSelect(emp.id)}
        >
          {emp.profiles?.full_name || 'Unknown'}
        </button>
      ))}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No results</p>}
    </div>
  );
};

const DepartmentList = ({ search, onSelect }: { search: string; onSelect: (id: string) => void }) => {
  const { currentOrg } = useOrganization();
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase.from('departments').select('id, name').eq('organization_id', currentOrg.id).order('name');
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return departments.filter((d: any) => d.name.toLowerCase().includes(q));
  }, [departments, search]);

  return (
    <div className="p-1">
      {filtered.map((dept: any) => (
        <button
          key={dept.id}
          className="w-full text-left px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
          onClick={() => onSelect(dept.id)}
        >
          {dept.name}
        </button>
      ))}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No results</p>}
    </div>
  );
};

const ContactList = ({ search, onSelect }: { search: string; onSelect: (id: string) => void }) => {
  const { currentOrg } = useOrganization();
  const { data: contacts = [] } = useQuery({
    queryKey: ['crm-contacts-picker', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, email, company:crm_companies(name)')
        .eq('organization_id', currentOrg.id)
        .eq('is_archived', false)
        .order('first_name')
        .limit(200);
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c: any) => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      return name.includes(q) || (c.email || '').toLowerCase().includes(q);
    });
  }, [contacts, search]);

  return (
    <div className="p-1">
      {filtered.map((c: any) => (
        <button
          key={c.id}
          className="w-full text-left px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
          onClick={() => onSelect(c.id)}
        >
          <span className="font-medium">{c.first_name} {c.last_name}</span>
          {c.company?.name && <span className="text-muted-foreground ml-1">· {c.company.name}</span>}
        </button>
      ))}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No results</p>}
    </div>
  );
};

const CompanyList = ({ search, onSelect }: { search: string; onSelect: (id: string) => void }) => {
  const { currentOrg } = useOrganization();
  const { data: companies = [] } = useQuery({
    queryKey: ['crm-companies-picker', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from('crm_companies')
        .select('id, name, industry')
        .eq('organization_id', currentOrg.id)
        .order('name')
        .limit(200);
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter((c: any) => c.name.toLowerCase().includes(q));
  }, [companies, search]);

  return (
    <div className="p-1">
      {filtered.map((c: any) => (
        <button
          key={c.id}
          className="w-full text-left px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
          onClick={() => onSelect(c.id)}
        >
          <span className="font-medium">{c.name}</span>
          {c.industry && <span className="text-muted-foreground ml-1">· {c.industry}</span>}
        </button>
      ))}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No results</p>}
    </div>
  );
};

const DealList = ({ search, onSelect }: { search: string; onSelect: (id: string) => void }) => {
  const { currentOrg } = useOrganization();
  const { data: deals = [] } = useQuery({
    queryKey: ['crm-deals-picker', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from('crm_deals')
        .select('id, title, contact:crm_contacts!crm_deals_contact_id_fkey(first_name, last_name)')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return deals.filter((d: any) => d.title.toLowerCase().includes(q));
  }, [deals, search]);

  return (
    <div className="p-1">
      {filtered.map((d: any) => (
        <button
          key={d.id}
          className="w-full text-left px-3 py-1.5 text-xs rounded-md hover:bg-muted transition-colors"
          onClick={() => onSelect(d.id)}
        >
          <span className="font-medium">{d.title}</span>
          {d.contact && <span className="text-muted-foreground ml-1">· {d.contact.first_name} {d.contact.last_name}</span>}
        </button>
      ))}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No results</p>}
    </div>
  );
};
