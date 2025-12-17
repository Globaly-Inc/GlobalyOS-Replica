import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { OfficeSidebar } from '@/components/offices/OfficeSidebar';
import { OfficeDetailView } from '@/components/offices/OfficeDetailView';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

export interface Office {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  organization_id: string;
  employee_count: number;
}

export interface OfficeSchedule {
  id: string;
  office_id: string;
  organization_id: string;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  timezone: string;
}

const ManageOffices = () => {
  const { isOwner, isAdmin, loading: roleLoading } = useUserRole();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load offices
  useEffect(() => {
    if (currentOrg?.id) {
      loadOffices();
    }
  }, [currentOrg?.id]);

  const loadOffices = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);

    const { data: officesData, error } = await supabase
      .from('offices')
      .select('*')
      .eq('organization_id', currentOrg.id)
      .order('name');

    if (error) {
      console.error('Error loading offices:', error);
      setLoading(false);
      return;
    }

    // Get employee counts per office
    const { data: employeeCounts } = await supabase
      .from('employees')
      .select('office_id')
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active');

    const countMap: Record<string, number> = {};
    employeeCounts?.forEach((e: any) => {
      if (e.office_id) {
        countMap[e.office_id] = (countMap[e.office_id] || 0) + 1;
      }
    });

    const officesWithCount = (officesData || []).map(office => ({
      ...office,
      employee_count: countMap[office.id] || 0,
    }));

    setOffices(officesWithCount);
    
    // Auto-select first office if none selected
    if (!selectedOfficeId && officesWithCount.length > 0) {
      setSelectedOfficeId(officesWithCount[0].id);
    }
    
    setLoading(false);
  };

  const handleOfficeCreated = (newOffice: Office) => {
    setOffices(prev => [...prev, { ...newOffice, employee_count: 0 }]);
    setSelectedOfficeId(newOffice.id);
  };

  const handleOfficeUpdated = (updatedOffice: Partial<Office>) => {
    setOffices(prev => prev.map(o => 
      o.id === updatedOffice.id ? { ...o, ...updatedOffice } : o
    ));
  };

  const handleOfficeDeleted = (officeId: string) => {
    setOffices(prev => prev.filter(o => o.id !== officeId));
    if (selectedOfficeId === officeId) {
      const remaining = offices.filter(o => o.id !== officeId);
      setSelectedOfficeId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Role-based access check
  if (!roleLoading && !isOwner && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const selectedOffice = offices.find(o => o.id === selectedOfficeId);
  const filteredOffices = offices.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.country || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manage Offices" 
        subtitle="Configure office locations, schedules, and team assignments"
      />

      <div className="flex gap-6 min-h-[calc(100vh-220px)]">
        {/* Left Content Area - 3/4 */}
        <div className="flex-1 min-w-0">
          {selectedOffice ? (
            <OfficeDetailView
              office={selectedOffice}
              onOfficeUpdated={handleOfficeUpdated}
              onOfficeDeleted={handleOfficeDeleted}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No office selected</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {offices.length === 0 
                  ? 'Add your first office to get started'
                  : 'Select an office from the sidebar to view details'}
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar - 1/4 */}
        <OfficeSidebar
          offices={filteredOffices}
          selectedOfficeId={selectedOfficeId}
          onSelectOffice={setSelectedOfficeId}
          onOfficeCreated={handleOfficeCreated}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ManageOffices;
