import { useParams } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { WorkflowTemplateDetail } from "@/components/workflows/WorkflowTemplateDetail";

export default function WorkflowTemplateSettings() {
  const { templateId } = useParams<{ templateId: string }>();
  const { currentOrg } = useOrganization();

  if (!currentOrg?.id || !templateId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <WorkflowTemplateDetail organizationId={currentOrg.id} templateId={templateId} />
    </div>
  );
}
