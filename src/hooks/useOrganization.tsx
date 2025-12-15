import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_url: string | null;
}

interface OrganizationMember {
  organization_id: string;
  role: string;
  organization: Organization;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  organizations: Organization[];
  orgRole: string | null;
  loading: boolean;
  switchOrganization: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const CURRENT_ORG_KEY = "globalyos_current_org";

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    // Don't set loading to false if user is not yet available
    // This prevents the OrgProtectedRoute from redirecting to /signup prematurely
    if (!user?.id) {
      // Only clear state if we're sure auth loading is complete
      // The useAuth hook sets loading to false after auth state is determined
      return;
    }

    try {
      const { data: members, error } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            slug,
            plan,
            logo_url
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const orgs = members
        ?.map((m: any) => m.organizations)
        .filter(Boolean) as Organization[];
      
      setOrganizations(orgs || []);

      // Get saved org from localStorage or use first org
      const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      const savedOrg = orgs?.find((o) => o.id === savedOrgId);
      const targetOrg = savedOrg || orgs?.[0] || null;

      if (targetOrg) {
        setCurrentOrg(targetOrg);
        const memberData = members?.find((m: any) => m.organization_id === targetOrg.id);
        setOrgRole(memberData?.role || null);
        localStorage.setItem(CURRENT_ORG_KEY, targetOrg.id);
      } else {
        setCurrentOrg(null);
        setOrgRole(null);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before doing anything
    if (authLoading) {
      return;
    }
    
    // Only fetch when we have a user
    if (user?.id) {
      fetchOrganizations();
    } else {
      // User explicitly not logged in (auth finished loading and no user)
      setOrganizations([]);
      setCurrentOrg(null);
      setOrgRole(null);
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem(CURRENT_ORG_KEY, orgId);
      // Refresh to get the role for the new org
      fetchOrganizations();
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        organizations,
        orgRole,
        loading,
        switchOrganization,
        refreshOrganizations: fetchOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
