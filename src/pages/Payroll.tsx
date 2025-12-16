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

const Payroll = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isOwner, isAdmin, isHR } = useUserRole();
  const { orgCode } = useOrgNavigation();

  // Only owner, admin, and HR can access payroll
  if (!isOwner && !isAdmin && !isHR) {
    return <Navigate to={`/org/${orgCode}`} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Payroll Management"
      />

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 gap-2 h-auto p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="runs" className="flex items-center gap-2 py-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Payroll Runs</span>
            </TabsTrigger>
            <TabsTrigger value="salaries" className="flex items-center gap-2 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Salaries</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-2 py-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Tax Config</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex items-center gap-2 py-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Profiles</span>
            </TabsTrigger>
            <TabsTrigger value="entities" className="flex items-center gap-2 py-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Legal Entities</span>
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
