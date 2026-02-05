 import { useOrganization } from "@/hooks/useOrganization";
 import { PageHeader } from "@/components/PageHeader";
 import { WorkflowsSettings } from "@/components/workflows/WorkflowsSettings";
 
 const SettingsWorkflows = () => {
   const { currentOrg } = useOrganization();
 
   return (
     <div className="space-y-6">
       <PageHeader
         title="Workflows"
         subtitle="Manage workflow templates for onboarding and offboarding"
       />
       <WorkflowsSettings organizationId={currentOrg?.id} />
     </div>
   );
 };
 
 export default SettingsWorkflows;