import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { DocumentationManager } from '@/components/super-admin/DocumentationManager';

const SuperAdminDocumentation = () => {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">Manage support articles, screenshots, and API documentation</p>
        </div>
        <DocumentationManager />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDocumentation;
