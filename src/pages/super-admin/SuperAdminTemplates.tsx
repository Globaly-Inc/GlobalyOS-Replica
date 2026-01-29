import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";
import { TemplateCategoryCard } from "@/components/super-admin/templates/TemplateCategoryCard";
import { TemplateDepartmentEditor } from "@/components/super-admin/templates/TemplateDepartmentEditor";
import { TemplatePositionEditor } from "@/components/super-admin/templates/TemplatePositionEditor";
import { TemplateLearningPanel } from "@/components/super-admin/templates/TemplateLearningPanel";
import { AITemplateTools } from "@/components/super-admin/templates/AITemplateTools";
import { TemplateHolidaysTab } from "@/components/super-admin/templates/TemplateHolidaysTab";
import { TemplateLeaveTypesTab } from "@/components/super-admin/templates/TemplateLeaveTypesTab";
import { TemplateEmploymentTypesTab } from "@/components/super-admin/templates/TemplateEmploymentTypesTab";
import { TemplateWikiTab } from "@/components/super-admin/templates/TemplateWikiTab";
import { BUSINESS_CATEGORIES } from "@/constants/businessCategories";
import { 
  Building2, 
  Users, 
  Lightbulb,
  Search,
  Loader2,
  LayoutTemplate,
  Calendar,
  CalendarDays,
  UserCheck,
  FileText
} from "lucide-react";
import { toast } from "sonner";

interface TemplateDepartment {
  id: string;
  business_category: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplatePosition {
  id: string;
  business_category: string;
  department_name: string;
  name: string;
  description: string | null;
  responsibilities: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LearningRecord {
  id: string;
  business_category: string;
  department_name: string | null;
  position_name: string | null;
  position_department: string | null;
  action: string;
  organization_id: string;
  created_at: string;
  processed_at: string | null;
  added_to_templates: boolean;
}

export default function SuperAdminTemplates() {
  const [activeTab, setActiveTab] = useState("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentEditorOpen, setDepartmentEditorOpen] = useState(false);
  const [positionEditorOpen, setPositionEditorOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<TemplateDepartment | null>(null);
  const [editingPosition, setEditingPosition] = useState<TemplatePosition | null>(null);
  const queryClient = useQueryClient();

  // Fetch template departments
  const { data: departments = [], isLoading: loadingDepartments } = useQuery({
    queryKey: ["template-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_departments")
        .select("*")
        .order("business_category")
        .order("sort_order");
      if (error) throw error;
      return data as TemplateDepartment[];
    },
  });

  // Fetch template positions
  const { data: positions = [], isLoading: loadingPositions } = useQuery({
    queryKey: ["template-positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_positions")
        .select("*")
        .order("business_category")
        .order("department_name")
        .order("sort_order");
      if (error) throw error;
      return data as TemplatePosition[];
    },
  });

  // Fetch pending learning records - only custom additions (action: 'added')
  const { data: learningRecords = [], isLoading: loadingLearning } = useQuery({
    queryKey: ["template-learning"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_structure_learning")
        .select("*")
        .eq("added_to_templates", false)
        .eq("action", "added")
        .is("processed_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LearningRecord[];
    },
  });

  // Group data by category
  const getCategoryStats = (category: string) => {
    const deptCount = departments.filter(d => d.business_category === category).length;
    const posCount = positions.filter(p => p.business_category === category).length;
    const pendingCount = learningRecords.filter(
      l => l.business_category === category && !l.added_to_templates
    ).length;
    return { deptCount, posCount, pendingCount };
  };

  // Filter categories based on search
  const filteredCategories = BUSINESS_CATEGORIES.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter departments for selected category
  const filteredDepartments = selectedCategory
    ? departments.filter(d => d.business_category === selectedCategory)
    : departments;

  // Filter positions for selected category
  const filteredPositions = selectedCategory
    ? positions.filter(p => p.business_category === selectedCategory)
    : positions;

  // Calculate stats
  const stats = {
    totalCategories: BUSINESS_CATEGORIES.length,
    categoriesWithData: new Set([
      ...departments.map(d => d.business_category),
      ...positions.map(p => p.business_category)
    ]).size,
    totalDepartments: departments.length,
    totalPositions: positions.length,
    pendingAdditions: learningRecords.filter(l => !l.added_to_templates).length,
  };

  const handleEditDepartment = (dept: TemplateDepartment) => {
    setEditingDepartment(dept);
    setDepartmentEditorOpen(true);
  };

  const handleEditPosition = (pos: TemplatePosition) => {
    setEditingPosition(pos);
    setPositionEditorOpen(true);
  };

  const handleAddDepartment = () => {
    setEditingDepartment(null);
    setDepartmentEditorOpen(true);
  };

  const handleAddPosition = () => {
    setEditingPosition(null);
    setPositionEditorOpen(true);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <SuperAdminPageHeader
          title="Templates Management"
          description="Manage business category templates for departments and positions"
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categoriesWithData}</div>
              <p className="text-xs text-muted-foreground">of {stats.totalCategories} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDepartments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Positions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPositions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Lightbulb className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAdditions}</div>
              <p className="text-xs text-muted-foreground">from users</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Tools Card */}
        <AITemplateTools
          selectedCategory={selectedCategory}
          departments={departments}
          positions={positions}
        />

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="categories" className="gap-2">
                <LayoutTemplate className="h-4 w-4" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="departments" className="gap-2">
                <Building2 className="h-4 w-4" />
                Departments
              </TabsTrigger>
              <TabsTrigger value="positions" className="gap-2">
                <Users className="h-4 w-4" />
                Positions
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Pending
                {stats.pendingAdditions > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.pendingAdditions}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="holidays" className="gap-2">
                <Calendar className="h-4 w-4" />
                Holidays
              </TabsTrigger>
              <TabsTrigger value="leave-types" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Leave Types
              </TabsTrigger>
              <TabsTrigger value="employment-types" className="gap-2">
                <UserCheck className="h-4 w-4" />
                Employment Types
              </TabsTrigger>
              <TabsTrigger value="wiki-templates" className="gap-2">
                <FileText className="h-4 w-4" />
                Wiki Templates
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              {activeTab === "departments" && (
                <Button onClick={handleAddDepartment}>Add Department</Button>
              )}
              {activeTab === "positions" && (
                <Button onClick={handleAddPosition}>Add Position</Button>
              )}
            </div>
          </div>

          {/* Categories Tab */}
          <TabsContent value="categories" className="mt-4">
            {loadingDepartments || loadingPositions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCategories.map((category) => {
                  const stats = getCategoryStats(category.value);
                  return (
                    <TemplateCategoryCard
                      key={category.value}
                      category={category}
                      departmentCount={stats.deptCount}
                      positionCount={stats.posCount}
                      pendingCount={stats.pendingCount}
                      isSelected={selectedCategory === category.value}
                      onSelect={() => {
                        setSelectedCategory(
                          selectedCategory === category.value ? null : category.value
                        );
                        setActiveTab("departments");
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="mt-4">
            <TemplateDepartmentEditor
              open={departmentEditorOpen}
              onOpenChange={setDepartmentEditorOpen}
              department={editingDepartment}
              selectedCategory={selectedCategory}
              departments={filteredDepartments}
              onEdit={handleEditDepartment}
            />
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions" className="mt-4">
            <TemplatePositionEditor
              open={positionEditorOpen}
              onOpenChange={setPositionEditorOpen}
              position={editingPosition}
              selectedCategory={selectedCategory}
              positions={filteredPositions}
              departments={departments}
              onEdit={handleEditPosition}
            />
          </TabsContent>

          {/* Pending Tab */}
          <TabsContent value="pending" className="mt-4">
            <TemplateLearningPanel
              learningRecords={learningRecords}
              isLoading={loadingLearning}
            />
          </TabsContent>

          {/* Holidays Tab */}
          <TabsContent value="holidays" className="mt-4">
            <TemplateHolidaysTab />
          </TabsContent>

          {/* Leave Types Tab */}
          <TabsContent value="leave-types" className="mt-4">
            <TemplateLeaveTypesTab />
          </TabsContent>

          {/* Employment Types Tab */}
          <TabsContent value="employment-types" className="mt-4">
            <TemplateEmploymentTypesTab />
          </TabsContent>

          {/* Wiki Templates Tab */}
          <TabsContent value="wiki-templates" className="mt-4">
            <TemplateWikiTab />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
