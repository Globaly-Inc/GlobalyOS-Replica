import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

const Wiki = () => {
  return (
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
  );
};

export default Wiki;
