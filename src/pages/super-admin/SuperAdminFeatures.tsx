import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Shield, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { FeatureAuditDialog } from "@/components/super-admin/FeatureAuditDialog";
import { MASTER_FEATURE_REGISTRY, CORE_FEATURES, FLAGGED_FEATURES } from "@/constants/features";

const SuperAdminFeatures = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [auditOpen, setAuditOpen] = useState(false);
  const [orgCount, setOrgCount] = useState(0);
  const [featureCounts, setFeatureCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orgsRes, featuresRes] = await Promise.all([
          supabase.from("organizations").select("id", { count: "exact", head: true }),
          supabase.from("organization_features").select("feature_name, is_enabled").eq("is_enabled", true),
        ]);

        if (orgsRes.error) throw orgsRes.error;
        if (featuresRes.error) throw featuresRes.error;

        setOrgCount(orgsRes.count || 0);

        const counts: Record<string, number> = {};
        featuresRes.data?.forEach((f) => {
          counts[f.feature_name] = (counts[f.feature_name] || 0) + 1;
        });
        setFeatureCounts(counts);
      } catch (err) {
        console.error("Error fetching features data:", err);
        toast.error("Failed to load features data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredFeatures = useMemo(() => {
    let features = MASTER_FEATURE_REGISTRY;
    if (tab === "core") features = CORE_FEATURES;
    else if (tab === "flagged") features = FLAGGED_FEATURES;

    if (search) {
      const q = search.toLowerCase();
      features = features.filter(
        (f) => f.label.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
      );
    }
    return features;
  }, [tab, search]);

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Features</h1>
            <p className="text-sm text-muted-foreground">
              {MASTER_FEATURE_REGISTRY.length} features · {CORE_FEATURES.length} core · {FLAGGED_FEATURES.length} flagged
            </p>
          </div>
          <Button variant="outline" onClick={() => setAuditOpen(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Audit System
          </Button>
        </div>

        <FeatureAuditDialog open={auditOpen} onOpenChange={setAuditOpen} />

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search features..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All ({MASTER_FEATURE_REGISTRY.length})</TabsTrigger>
              <TabsTrigger value="core">Core ({CORE_FEATURES.length})</TabsTrigger>
              <TabsTrigger value="flagged">Flagged ({FLAGGED_FEATURES.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredFeatures.map((feature) => {
            const Icon = feature.icon;
            const isCore = feature.category === "core";
            const count = isCore ? orgCount : (featureCounts[feature.name] || 0);

            return (
              <Card
                key={feature.name}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/super-admin/features/${feature.name}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isCore ? "secondary" : "default"} className="text-[10px]">
                      {isCore ? "Core" : "Flagged"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{feature.label}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{feature.description}</p>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {isCore ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">All {orgCount} orgs</span>
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">{count}</span>
                        <span>/{orgCount} orgs enabled</span>
                      </>
                    )}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredFeatures.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No features match your search.</p>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminFeatures;
