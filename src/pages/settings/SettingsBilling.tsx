 import { PageHeader } from "@/components/PageHeader";
 import BillingSettings from "@/components/BillingSettings";
 
 const SettingsBilling = () => {
   return (
     <div className="space-y-6">
       <PageHeader
         title="Billing"
         subtitle="Manage your subscription and billing information"
       />
       <BillingSettings />
     </div>
   );
 };
 
 export default SettingsBilling;