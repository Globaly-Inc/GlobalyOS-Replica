import { useState } from 'react';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { OfficeSelector } from '@/components/accounting/OfficeSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileText, Receipt, Landmark, BarChart3 } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';

const AccountingDashboard = () => {
  const { isSetupComplete, loading } = useAccountingSetup();
  const { navigateOrg } = useOrgNavigation();
  const [selectedOffice, setSelectedOffice] = useState<string | 'all'>('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSetupComplete) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Landmark className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Set Up Accounting</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Get started with double-entry accounting for your organisation. Choose which offices to include, set your currency, and select a chart of accounts template.
        </p>
        <Button size="lg" onClick={() => navigateOrg('/accounting/setup')}>
          Start Setup <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounting</h1>
        <OfficeSelector value={selectedOffice} onChange={setSelectedOffice} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receivable</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payable</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <OrgLink to="/accounting/invoices" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Create Invoice</p>
                <p className="text-xs text-muted-foreground">Send invoices to your customers</p>
              </div>
            </OrgLink>
            <OrgLink to="/accounting/bills" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <Receipt className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Enter a Bill</p>
                <p className="text-xs text-muted-foreground">Record bills from suppliers</p>
              </div>
            </OrgLink>
            <OrgLink to="/accounting/banking" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <Landmark className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Reconcile Bank</p>
                <p className="text-xs text-muted-foreground">Match transactions to your books</p>
              </div>
            </OrgLink>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <OrgLink to="/accounting/reports" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Profit & Loss</p>
                <p className="text-xs text-muted-foreground">Income vs expenses over time</p>
              </div>
            </OrgLink>
            <OrgLink to="/accounting/reports" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Balance Sheet</p>
                <p className="text-xs text-muted-foreground">Snapshot of assets, liabilities, equity</p>
              </div>
            </OrgLink>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountingDashboard;
