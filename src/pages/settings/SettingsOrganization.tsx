 import { useOrganization } from "@/hooks/useOrganization";
 import { PageHeader } from "@/components/PageHeader";
 import { OrganizationSettings } from "@/components/settings/OrganizationSettings";
 
 const SettingsOrganization = () => {
   const { orgRole } = useOrganization();
   const isOwner = orgRole === "owner";
 
   return (
     <div className="space-y-6">
       <PageHeader
         title="Organization"
         subtitle="Manage your organization's basic information and branding"
       />
       <OrganizationSettings isOwner={isOwner} />
     </div>
   );
 };
 
 export default SettingsOrganization;