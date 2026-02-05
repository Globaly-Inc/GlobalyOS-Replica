 import { useOrganization } from "@/hooks/useOrganization";
 import { PageHeader } from "@/components/PageHeader";
 import { AIKnowledgeSettings } from "@/components/AIKnowledgeSettings";
 
 const SettingsAI = () => {
   const { currentOrg } = useOrganization();
 
   return (
     <div className="space-y-6">
       <PageHeader
         title="AI"
         subtitle="Configure AI knowledge sources and model settings"
       />
       <AIKnowledgeSettings organizationId={currentOrg?.id} />
     </div>
   );
 };
 
 export default SettingsAI;