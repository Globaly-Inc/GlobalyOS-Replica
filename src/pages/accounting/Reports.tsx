import { useState } from 'react';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, FileText, DollarSign, TrendingUp, Users, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportItem {
  id: string;
  name: string;
  description: string;
  icon: typeof BarChart3;
  category: string;
}

const ALL_REPORTS: ReportItem[] = [
  { id: 'profit-loss', name: 'Profit & Loss', description: 'Revenue minus expenses for a period', icon: TrendingUp, category: 'Business Overview' },
  { id: 'balance-sheet', name: 'Balance Sheet', description: 'Assets, liabilities & equity at a point in time', icon: BarChart3, category: 'Business Overview' },
  { id: 'cash-flow', name: 'Cash Flow Statement', description: 'Cash movements by operating/investing/financing', icon: DollarSign, category: 'Business Overview' },
  { id: 'trial-balance', name: 'Trial Balance', description: 'All account balances — debits must equal credits', icon: FileText, category: 'For My Accountant' },
  { id: 'general-ledger', name: 'General Ledger', description: 'Complete transaction list by account', icon: FileText, category: 'For My Accountant' },
  { id: 'journal-list', name: 'Journal List', description: 'All journal entries with details', icon: FileText, category: 'For My Accountant' },
  { id: 'ar-aging', name: 'AR Aging Summary', description: 'Outstanding invoices by age bucket', icon: Users, category: 'Who Owes You' },
  { id: 'open-invoices', name: 'Open Invoices', description: 'All unpaid & partially paid invoices', icon: FileText, category: 'Who Owes You' },
  { id: 'ap-aging', name: 'AP Aging Summary', description: 'Outstanding bills by age bucket', icon: Users, category: 'What You Owe' },
  { id: 'unpaid-bills', name: 'Unpaid Bills', description: 'All unpaid & partially paid bills', icon: FileText, category: 'What You Owe' },
];

const Reports = () => {
  const { isSetupComplete, loading } = useAccountingSetup();
  const { navigateOrg } = useOrgNavigation();
  const [favourites, setFavourites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('accounting-report-favs') || '[]');
    } catch { return []; }
  });

  const toggleFav = (id: string) => {
    const next = favourites.includes(id) ? favourites.filter((f) => f !== id) : [...favourites, id];
    setFavourites(next);
    localStorage.setItem('accounting-report-favs', JSON.stringify(next));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  const categories = ['Business Overview', 'Who Owes You', 'What You Owe', 'For My Accountant'];
  const favReports = ALL_REPORTS.filter((r) => favourites.includes(r.id));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Reports</h1>

      {favReports.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Favourites
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {favReports.map((r) => (
              <Card key={r.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigateOrg(`/accounting/reports/${r.id}`)}>
                <CardContent className="pt-4 pb-3 flex items-start gap-3">
                  <r.icon className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {categories.map((cat) => {
        const items = ALL_REPORTS.filter((r) => r.category === cat);
        return (
          <div key={cat}>
            <h2 className="text-lg font-semibold mb-3">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((r) => (
                <Card key={r.id} className="cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => navigateOrg(`/accounting/reports/${r.id}`)}>
                  <CardContent className="pt-4 pb-3 flex items-start gap-3">
                    <r.icon className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); toggleFav(r.id); }}
                    >
                      {favourites.includes(r.id) ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Reports;
