 import { useOrganization } from "@/hooks/useOrganization";
 import { PageHeader } from "@/components/PageHeader";
 import { KpiGenerationSettings } from "@/components/settings/KpiGenerationSettings";
 
 const SettingsKpis = () => {
   const { currentOrg } = useOrganization();
 
   return (
     <div className="space-y-6">
       <PageHeader
         title="KPIs"
         subtitle="Configure KPI generation settings and templates"
       />
       <KpiGenerationSettings organizationId={currentOrg?.id} />
     </div>
   );
 };
 
 export default SettingsKpis;