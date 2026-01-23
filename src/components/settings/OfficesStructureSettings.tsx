import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Briefcase } from "lucide-react";
import { OfficesSettings } from "./OfficesSettings";
import { DepartmentsSettings } from "./DepartmentsSettings";
import { PositionsSettings } from "./PositionsSettings";

export const OfficesStructureSettings = () => {
  const [activeTab, setActiveTab] = useState("offices");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="offices" className="gap-2">
            <Building2 className="h-4 w-4" />
            Offices
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Users className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Positions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offices" className="mt-4">
          <OfficesSettings />
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <DepartmentsSettings />
        </TabsContent>

        <TabsContent value="positions" className="mt-4">
          <PositionsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
