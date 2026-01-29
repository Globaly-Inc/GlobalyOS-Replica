import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Loader2, Eye, Code } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/countries";
import { BUSINESS_CATEGORIES } from "@/constants/businessCategories";
import { TemplateWikiDocument, WIKI_CATEGORIES, WikiTemplateCategory } from "./TemplateWikiTab";

interface WikiTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateWikiDocument | null;
  onSuccess: () => void;
}

export const WikiTemplateEditor = ({
  open,
  onOpenChange,
  template,
  onSuccess,
}: WikiTemplateEditorProps) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "policies" as WikiTemplateCategory,
    subcategory: "",
    description: "",
    content: "",
    business_category: "" as string | null,
    country_code: "" as string | null,
    icon_name: "FileText",
    tags: [] as string[],
    sort_order: 0,
    is_active: true,
  });

  const [tagsInput, setTagsInput] = useState("");
  const [contentView, setContentView] = useState<"edit" | "preview">("edit");

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        category: template.category,
        subcategory: template.subcategory || "",
        description: template.description || "",
        content: template.content || "",
        business_category: template.business_category,
        country_code: template.country_code,
        icon_name: template.icon_name || "FileText",
        tags: template.tags || [],
        sort_order: template.sort_order,
        is_active: template.is_active,
      });
      setTagsInput((template.tags || []).join(", "));
    } else {
      setFormData({
        name: "",
        category: "policies",
        subcategory: "",
        description: "",
        content: "",
        business_category: null,
        country_code: null,
        icon_name: "FileText",
        tags: [],
        sort_order: 0,
        is_active: true,
      });
      setTagsInput("");
    }
    setContentView("edit");
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      // Parse tags from comma-separated input
      const tags = tagsInput
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const payload = {
        ...data,
        tags,
        business_category: data.business_category || null,
        country_code: data.country_code || null,
      };

      if (data.id) {
        const { error } = await supabase
          .from("template_wiki_documents")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("template_wiki_documents")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(template ? "Template updated" : "Template created");
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error("Error saving template: " + error.message);
    },
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate({ ...formData, id: template?.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Wiki Template" : "Add Wiki Template"}
          </DialogTitle>
          <DialogDescription>
            Configure wiki template settings and content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Annual Leave Policy"
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as WikiTemplateCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIKI_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="e.g., Leave, Conduct, Privacy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon Name</Label>
              <Input
                id="icon"
                value={formData.icon_name}
                onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                placeholder="Lucide icon name"
              />
            </div>
          </div>

          {/* Targeting */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Category</Label>
              <Select
                value={formData.business_category || "universal"}
                onValueChange={(v) => setFormData({ ...formData, business_category: v === "universal" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="universal">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Universal (All Industries)
                    </span>
                  </SelectItem>
                  {BUSINESS_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formData.country_code || "global"}
                onValueChange={(v) => setFormData({ ...formData, country_code: v === "global" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Global (All Countries)
                    </span>
                  </SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this template"
              rows={2}
            />
          </div>

          {/* Content with Preview Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Content (HTML)</Label>
              <Tabs value={contentView} onValueChange={(v) => setContentView(v as "edit" | "preview")}>
                <TabsList className="h-8">
                  <TabsTrigger value="edit" className="text-xs gap-1 px-2 h-6">
                    <Code className="h-3 w-3" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs gap-1 px-2 h-6">
                    <Eye className="h-3 w-3" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {contentView === "edit" ? (
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Template content in HTML format..."
                rows={12}
                className="font-mono text-sm"
              />
            ) : (
              <ScrollArea className="h-[300px] border rounded-md p-4 bg-background">
                {formData.content ? (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: formData.content }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm italic">No content to preview</p>
                )}
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground">
              Use HTML formatting. This content will be used when users create a wiki page from this template.
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Comma-separated tags (e.g., hr, policy, leave)"
            />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between pt-7">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {template ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
