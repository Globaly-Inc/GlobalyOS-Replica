import { Users, Building2, UserCheck, UserPlus, Archive, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CRMSidebarCategory, CRMView } from '@/types/crm';

interface CRMSidebarProps {
  view: CRMView;
  category: CRMSidebarCategory;
  onViewChange: (view: CRMView) => void;
  onCategoryChange: (cat: CRMSidebarCategory) => void;
}

const contactCategories: { key: CRMSidebarCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'all', label: 'All Contacts', icon: Users },
  { key: 'enquiries', label: 'Enquiries', icon: Inbox },
  { key: 'prospects', label: 'Prospects', icon: UserPlus },
  { key: 'clients', label: 'Clients', icon: UserCheck },
  { key: 'archived', label: 'Archived', icon: Archive },
];

export const CRMSidebar = ({ view, category, onViewChange, onCategoryChange }: CRMSidebarProps) => {
  return (
    <div className="w-56 shrink-0 border-r border-border bg-muted/30 p-3 flex flex-col gap-4">
      {/* View toggle */}
      <div className="flex rounded-lg bg-muted p-1 gap-1">
        <button
          onClick={() => onViewChange('contacts')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            view === 'contacts' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Contacts
        </button>
        <button
          onClick={() => onViewChange('companies')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            view === 'companies' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          Companies
        </button>
      </div>

      {/* Categories (contacts only) */}
      {view === 'contacts' && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1">Categories</span>
          {contactCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                category === cat.key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <cat.icon className="h-4 w-4 shrink-0" />
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {view === 'companies' && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1">Companies</span>
          <button
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-primary/10 text-primary font-medium text-left"
          >
            <Building2 className="h-4 w-4 shrink-0" />
            All Companies
          </button>
        </div>
      )}
    </div>
  );
};
