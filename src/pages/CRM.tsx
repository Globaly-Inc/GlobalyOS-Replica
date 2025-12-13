import { Briefcase } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ComingSoon } from "@/components/ComingSoon";

const CRM = () => {
  return (
    <Layout>
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
    </Layout>
  );
};

export default CRM;
