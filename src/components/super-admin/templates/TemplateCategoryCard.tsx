import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, Users, Lightbulb, Check } from "lucide-react";
import { BusinessCategory } from "@/constants/businessCategories";

interface TemplateCategoryCardProps {
  category: BusinessCategory;
  departmentCount: number;
  positionCount: number;
  pendingCount: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function TemplateCategoryCard({
  category,
  departmentCount,
  positionCount,
  pendingCount,
  isSelected,
  onSelect,
}: TemplateCategoryCardProps) {
  const Icon = category.icon;
  const hasData = departmentCount > 0 || positionCount > 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        !hasData && "opacity-60"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              hasData ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{category.label}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {departmentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {positionCount}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {hasData && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700">
                <Lightbulb className="h-3 w-3 mr-1" />
                {pendingCount} pending
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
