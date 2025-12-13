import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

const CRM = () => {
  return (
    <ComingSoon
      icon={Briefcase}
      title="CRM"
      description="Customer relationship management and sales pipeline."
      features={[
        "Contact and lead management",
        "Sales pipeline tracking",
        "Deal and opportunity management",
        "Customer interaction history",
      ]}
    />
  );
};

export default CRM;
