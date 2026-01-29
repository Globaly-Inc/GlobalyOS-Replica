import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Pencil, Trash2, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";
import { BUSINESS_CATEGORIES } from "@/constants/businessCategories";
import { WikiTemplateEditor } from "./WikiTemplateEditor";
import { AIWikiTemplateTools } from "./AIWikiTemplateTools";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Category labels for display
const WIKI_CATEGORIES = [
  { value: "policies", label: "Policies" },
  { value: "sops", label: "SOPs" },
  { value: "business_plans", label: "Business Plans" },
  { value: "hr_documents", label: "HR Documents" },
  { value: "compliance", label: "Compliance" },
  { value: "operations", label: "Operations" },
] as const;

export type WikiTemplateCategory = typeof WIKI_CATEGORIES[number]["value"];

export interface TemplateWikiDocument {
  id: string;
  category: WikiTemplateCategory;
  subcategory: string | null;
  name: string;
  description: string | null;
  content: string | null;
  business_category: string | null;
  country_code: string | null;
  icon_name: string | null;
  tags: string[] | null;
  sort_order: number;
  is_active: boolean;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export const TemplateWikiTab = () => {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [businessCategoryFilter, setBusinessCategoryFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWikiDocument | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch wiki templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["template-wiki-documents", categoryFilter, businessCategoryFilter, countryFilter],
    queryFn: async () => {
      let query = supabase
        .from("template_wiki_documents")
        .select("*")
        .order("category")
        .order("sort_order");

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter as WikiTemplateCategory);
      }

      if (businessCategoryFilter !== "all") {
        if (businessCategoryFilter === "universal") {
          query = query.is("business_category", null);
        } else {
          query = query.eq("business_category", businessCategoryFilter);
        }
      }

      if (countryFilter !== "all") {
        if (countryFilter === "global") {
          query = query.is("country_code", null);
        } else {
          query = query.eq("country_code", countryFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TemplateWikiDocument[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_wiki_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-wiki-documents"] });
      toast.success("Template deleted");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error("Error deleting template: " + error.message);
    },
  });

  const openEdit = (template: TemplateWikiDocument) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const getCategoryLabel = (value: string) => {
    return WIKI_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  // Get unique countries from data for filter
  const countriesInData = [...new Set(templates.map(t => t.country_code).filter(Boolean))] as string[];
  const businessCategoriesInData = [...new Set(templates.map(t => t.business_category).filter(Boolean))] as string[];

  // Calculate stats
  const stats = {
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    withContent: templates.filter(t => t.content && t.content.length > 0).length,
    byCategory: WIKI_CATEGORIES.reduce((acc, cat) => {
      acc[cat.value] = templates.filter(t => t.category === cat.value).length;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <>
      {/* AI Tools Section */}
      <AIWikiTemplateTools templates={templates} />

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Wiki Document Templates
            </CardTitle>
            <CardDescription>
              Manage wiki templates available to all organizations
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {WIKI_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label} ({stats.byCategory[cat.value] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={businessCategoryFilter} onValueChange={setBusinessCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Business Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Types</SelectItem>
                <SelectItem value="universal">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Universal
                  </span>
                </SelectItem>
                {businessCategoriesInData.map(bc => (
                  <SelectItem key={bc} value={bc}>{bc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="global">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Global
                  </span>
                </SelectItem>
                {countriesInData.map(code => {
                  const country = COUNTRIES.find(c => c.code === code);
                  return (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2">
                        {getFlagEmoji(code)} {country?.name || code}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
              <p className="text-sm mt-1">Create your first wiki template or use AI to generate templates</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const country = template.country_code
                    ? COUNTRIES.find(c => c.code === template.country_code)?.name || template.country_code
                    : "Global";
                  const hasContent = template.content && template.content.length > 0;
                  
                  return (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{template.name}</div>
                          {template.subcategory && (
                            <div className="text-xs text-muted-foreground">{template.subcategory}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.business_category ? "outline" : "secondary"}>
                          {template.business_category || "Universal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.country_code ? "outline" : "secondary"}>
                          {template.country_code ? (
                            <span className="flex items-center gap-1">
                              {getFlagEmoji(template.country_code)} {country}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" /> Global
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={hasContent ? "default" : "secondary"}>
                          {hasContent ? "Yes" : "Empty"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(template.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <WikiTemplateEditor
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editingTemplate}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["template-wiki-documents"] });
          setDialogOpen(false);
          setEditingTemplate(null);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this wiki template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { WIKI_CATEGORIES };
