 import { useOrganization } from "@/hooks/useOrganization";
 import { PageHeader } from "@/components/PageHeader";
 import { ProjectsSettings } from "@/components/settings/ProjectsSettings";
 
 const SettingsProjects = () => {
   const { currentOrg } = useOrganization();
 
   return (
     <div className="space-y-6">
       <PageHeader
         title="Projects"
         subtitle="Manage projects and tags for your organization"
       />
       <ProjectsSettings organizationId={currentOrg?.id} />
     </div>
   );
 };
 
 export default SettingsProjects;