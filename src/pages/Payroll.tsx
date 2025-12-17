import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Building2, Settings, Users, Calculator, FileText, DollarSign } from "lucide-react";
import { PayrollDashboard } from "@/components/payroll/PayrollDashboard";
import { LegalEntitiesTab } from "@/components/payroll/LegalEntitiesTab";
import { PayrollProfilesTab } from "@/components/payroll/PayrollProfilesTab";
import { SalaryStructuresTab } from "@/components/payroll/SalaryStructuresTab";
import { TaxConfigTab } from "@/components/payroll/TaxConfigTab";
import { PayrollRunsTab } from "@/components/payroll/PayrollRunsTab";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const Payroll = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode } = useOrgNavigation();

  // Show loading skeleton while role is being determined
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Payroll Management" />
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-10 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Only redirect AFTER loading is complete
  if (!isOwner && !isAdmin && !isHR) {
    return <Navigate to={`/org/${orgCode}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Payroll Management" />

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap w-full gap-1 h-auto p-1.5 bg-muted/50">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 py-2 px-3 flex-1 min-w-[80px]">
              <DollarSign className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="runs" className="flex items-center gap-1.5 py-2 px-3 flex-1 min-w-[80px]">
              <Calculator className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Runs</span>
            </TabsTrigger>
            <TabsTrigger value="salaries" className="flex items-center gap-1.5 py-2 px-3 flex-1 min-w-[80px]">
              <Users className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Salaries</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-1.5 py-2 px-3 flex-1 min-w-[80px]">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Tax</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex items-center gap-1.5 py-2 px-3 flex-1 min-w-[80px]">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Profiles</span>
            </TabsTrigger>
            <TabsTrigger value="entities" className="flex items-center gap-1.5 py-2 px-3 flex-1 min-w-[80px]">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Entities</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <PayrollDashboard />
          </TabsContent>

          <TabsContent value="runs">
            <PayrollRunsTab />
          </TabsContent>

          <TabsContent value="salaries">
            <SalaryStructuresTab />
          </TabsContent>

          <TabsContent value="tax">
            <TaxConfigTab />
          </TabsContent>

          <TabsContent value="profiles">
            <PayrollProfilesTab />
          </TabsContent>

          <TabsContent value="entities">
            <LegalEntitiesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Payroll;
