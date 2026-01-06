import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";
import { PlanManagement } from "@/components/super-admin/PlanManagement";
import { CouponManagement } from "@/components/super-admin/CouponManagement";
import { Package, Ticket, CheckCircle, Clock } from "lucide-react";

export default function SuperAdminPayments() {
  const [activeTab, setActiveTab] = useState("plans");

  // Fetch subscription plans for stats
  const { data: plans } = useQuery({
    queryKey: ["subscription-plans-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch coupons for stats
  const { data: coupons } = useQuery({
    queryKey: ["coupons-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*");
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    totalPlans: plans?.length || 0,
    activePlans: plans?.filter((p) => p.is_active).length || 0,
    totalCoupons: coupons?.length || 0,
    activeCoupons: coupons?.filter((c) => c.is_active).length || 0,
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <SuperAdminPageHeader
          title="Plans & Coupons"
          description="Manage subscription plans and discount codes"
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPlans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activePlans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCoupons}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCoupons}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="plans" className="gap-2">
              <Package className="h-4 w-4" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2">
              <Ticket className="h-4 w-4" />
              Coupons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-4">
            <PlanManagement />
          </TabsContent>

          <TabsContent value="coupons" className="mt-4">
            <CouponManagement />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
