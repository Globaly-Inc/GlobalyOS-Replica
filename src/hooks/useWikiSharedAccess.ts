import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface SharedMember {
  employee_id: string;
  full_name: string;
  avatar_url: string | null;
  permission: 'view' | 'edit';
}

export interface SharedGroup {
  type: 'company' | 'office' | 'department' | 'project';
  id?: string;
  name: string;
}

export interface WikiSharedAccessData {
  accessScope: 'company' | 'offices' | 'departments' | 'projects' | 'members';
  members: SharedMember[];
  groups: SharedGroup[];
  owner: {
    employee_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  isLoading: boolean;
}

export const useWikiSharedAccess = (
  itemType: 'folder' | 'page' | null,
  itemId: string | null
): WikiSharedAccessData => {
  const { currentOrg } = useOrganization();
  const [data, setData] = useState<WikiSharedAccessData>({
    accessScope: 'members',
    members: [],
    groups: [],
    owner: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!itemId || !itemType || !currentOrg?.id) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchAccess = async () => {
      setData(prev => ({ ...prev, isLoading: true }));

      try {
        let accessScope: WikiSharedAccessData['accessScope'] = 'members';
        let owner: WikiSharedAccessData['owner'] = null;
        const groups: SharedGroup[] = [];

        // Fetch item details
        const table = itemType === 'folder' ? 'wiki_folders' : 'wiki_pages';
        const { data: item } = await supabase
          .from(table)
          .select('access_scope, created_by')
          .eq('id', itemId)
          .single();

        if (item) {
          accessScope = ((item as { access_scope?: string }).access_scope || 'members') as WikiSharedAccessData['accessScope'];
          
          // Fetch owner info
          const createdBy = (item as { created_by?: string }).created_by;
          if (createdBy) {
            const { data: ownerEmployee } = await supabase
              .from('employees')
              .select('id, profiles(full_name, avatar_url)')
              .eq('id', createdBy)
              .single();
            
            if (ownerEmployee) {
              const profiles = ownerEmployee.profiles as { full_name: string; avatar_url: string | null } | null;
              owner = {
                employee_id: ownerEmployee.id,
                full_name: profiles?.full_name || 'Unknown',
                avatar_url: profiles?.avatar_url || null,
              };
            }
          }

          // Add group based on access scope
          if (accessScope === 'company') {
            groups.push({ type: 'company', name: 'Everyone' });
          }
        }

        setData({
          accessScope,
          members: [], // Members fetched via share dialog
          groups,
          owner,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching wiki shared access:', error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchAccess();
  }, [itemId, itemType, currentOrg?.id]);

  return data;
};
