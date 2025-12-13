import { BookOpen } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ComingSoon } from "@/components/ComingSoon";

const Wiki = () => {
  return (
    <Layout>
      <ComingSoon
        icon={BookOpen}
        title="Wiki"
        description="Company knowledge base and documentation center."
        features={[
          "Create and organize documentation",
          "Company policies and procedures",
          "Searchable knowledge articles",
          "Collaborative editing",
        ]}
      />
    </Layout>
  );
};

export default Wiki;
