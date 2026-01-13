import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, BarChart3, Bug } from 'lucide-react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import ErrorLogsTable from '@/components/super-admin/ErrorLogsTable';
import ErrorAnalyticsDashboard from '@/components/super-admin/ErrorAnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { logErrorToDatabase } from '@/hooks/useErrorLogger';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const SuperAdminErrorLogs = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerateTestError = async () => {
    setIsGeneratingTest(true);
    try {
      await logErrorToDatabase({
        errorType: 'runtime',
        severity: 'error',
        errorMessage: `Test error generated at ${new Date().toISOString()}`,
        componentName: 'SuperAdminErrorLogs',
        actionAttempted: 'Generate test error',
        metadata: { testGenerated: true, timestamp: Date.now() },
      });
      
      // Refetch error logs
      await queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      
      toast.success('Test error logged successfully. Refresh the table to see it.');
    } catch (error) {
      console.error('Failed to generate test error:', error);
      toast.error('Failed to generate test error');
    } finally {
      setIsGeneratingTest(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Error Logs</h1>
            <p className="text-muted-foreground">
              Monitor and resolve application errors across all users and organizations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateTestError}
            disabled={isGeneratingTest}
            className="gap-2"
          >
            <Bug className="h-4 w-4" />
            {isGeneratingTest ? 'Generating...' : 'Generate Test Error'}
          </Button>
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
