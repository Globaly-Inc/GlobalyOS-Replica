import { useState } from 'react';
import { CRMSidebar } from '@/components/crm/CRMSidebar';
import { ContactListView } from '@/components/crm/ContactListView';
import { CompanyListView } from '@/components/crm/CompanyListView';
import type { CRMSidebarCategory, CRMView } from '@/types/crm';

const CRM = () => {
  const [view, setView] = useState<CRMView>('contacts');
  const [category, setCategory] = useState<CRMSidebarCategory>('all');

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
      <CRMSidebar
        view={view}
        category={category}
        onViewChange={(v) => { setView(v); setCategory('all'); }}
        onCategoryChange={setCategory}
      />
      <div className="flex-1 overflow-hidden">
        {view === 'contacts' ? (
          <ContactListView category={category} />
        ) : (
          <CompanyListView />
        )}
      </div>
    </div>
  );
};

export default CRM;
