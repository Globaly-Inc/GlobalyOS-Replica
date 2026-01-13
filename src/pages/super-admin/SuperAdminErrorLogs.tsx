import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, BarChart3 } from 'lucide-react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import ErrorLogsTable from '@/components/super-admin/ErrorLogsTable';
import ErrorAnalyticsDashboard from '@/components/super-admin/ErrorAnalyticsDashboard';

const SuperAdminErrorLogs = () => {
  const [activeTab, setActiveTab] = useState('logs');

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Error Logs</h1>
          <p className="text-muted-foreground">
            Monitor and resolve application errors across all users and organizations
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="logs" className="gap-2">
              <List className="h-4 w-4" />
              Error Logs
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="mt-6">
            <ErrorLogsTable />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <ErrorAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminErrorLogs;
