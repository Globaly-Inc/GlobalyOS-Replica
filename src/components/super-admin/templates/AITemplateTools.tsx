import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { AIGenerateCategoryStructure } from "./AIGenerateCategoryStructure";
import { AIGenerateDepartmentPositions } from "./AIGenerateDepartmentPositions";
import { AIGenerateDescriptions } from "./AIGenerateDescriptions";
import { BUSINESS_CATEGORIES } from "@/constants/businessCategories";

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

interface AITemplateToolsProps {
  selectedCategory: string | null;
  departments: TemplateDepartment[];
  positions: TemplatePosition[];
}

export function AITemplateTools({
  selectedCategory,
  departments,
  positions,
}: AITemplateToolsProps) {
  // Get all category values
  const allCategoryValues = BUSINESS_CATEGORIES.map(c => c.value);
  
  // Find categories without any departments
  const categoriesWithDepts = new Set(departments.map(d => d.business_category));
  const emptyCategoriesCount = selectedCategory 
    ? (categoriesWithDepts.has(selectedCategory) ? 0 : 1)
    : allCategoryValues.filter(c => !categoriesWithDepts.has(c)).length;

  // Find departments without positions
  const deptsWithPositions = new Set(positions.map(p => `${p.business_category}:${p.department_name}`));
  const deptsNeedingPositions = selectedCategory
    ? departments.filter(d => 
        d.business_category === selectedCategory && 
        !deptsWithPositions.has(`${d.business_category}:${d.name}`)
      )
    : departments.filter(d => !deptsWithPositions.has(`${d.business_category}:${d.name}`));

  // Find items needing descriptions
  const deptsNeedingDesc = selectedCategory
    ? departments.filter(d => d.business_category === selectedCategory && !d.description)
    : departments.filter(d => !d.description);
  
  const positionsNeedingDesc = selectedCategory
    ? positions.filter(p => 
        p.business_category === selectedCategory && 
        (!p.description || !p.responsibilities?.length)
      )
    : positions.filter(p => !p.description || !p.responsibilities?.length);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AIGenerateCategoryStructure
          selectedCategory={selectedCategory}
          emptyCategoriesCount={emptyCategoriesCount}
          allCategories={BUSINESS_CATEGORIES}
          existingDepartmentCategories={categoriesWithDepts}
        />
        
        <AIGenerateDepartmentPositions
          selectedCategory={selectedCategory}
          departmentsNeedingPositions={deptsNeedingPositions}
        />
        
        <AIGenerateDescriptions
          selectedCategory={selectedCategory}
          departments={deptsNeedingDesc}
          positions={positionsNeedingDesc}
        />
      </CardContent>
    </Card>
  );
}
