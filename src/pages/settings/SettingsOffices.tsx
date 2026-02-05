 import { PageHeader } from "@/components/PageHeader";
 import { OfficesStructureSettings } from "@/components/settings/OfficesStructureSettings";
 
 const SettingsOffices = () => {
   return (
     <div className="space-y-6">
       <PageHeader
         title="Offices & Structure"
         subtitle="Manage your organization's offices, departments, and positions"
       />
       <OfficesStructureSettings />
     </div>
   );
 };
 
 export default SettingsOffices;