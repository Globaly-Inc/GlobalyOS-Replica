import { Link } from 'react-router-dom';
import { Headphones, BookOpen } from 'lucide-react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { DocumentationManager } from '@/components/super-admin/DocumentationManager';

const SuperAdminDocumentation = () => {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1">
          <Link
            to="/super-admin/customer-success"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Headphones className="h-4 w-4" />
            Support Requests
          </Link>
          <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
            Documentation
          </div>
        </div>

        {/* Header */}
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
