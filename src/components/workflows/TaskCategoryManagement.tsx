import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import {
  useWorkflowTaskCategories,
  useAddWorkflowTaskCategory,
  useUpdateWorkflowTaskCategory,
  useDeleteWorkflowTaskCategory,
  type WorkflowTaskCategoryCustom,
} from "@/services/useWorkflowStatusCategories";

interface TaskCategoryManagementProps {
  templateId: string;
  organizationId: string;
}

export function TaskCategoryManagement({ templateId, organizationId }: TaskCategoryManagementProps) {
  const { data: categories = [], isLoading } = useWorkflowTaskCategories(templateId);
  const addCategory = useAddWorkflowTaskCategory();
  const updateCategory = useUpdateWorkflowTaskCategory();
  const deleteCategory = useDeleteWorkflowTaskCategory();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WorkflowTaskCategoryCustom | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    emoji: "📋",
  });
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const handleOpenAdd = () => {
    setFormData({ name: "", emoji: "📋" });
    setAddDialogOpen(true);
  };

  const handleOpenEdit = (category: WorkflowTaskCategoryCustom) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      emoji: category.emoji,
    });
  };

  const handleAdd = () => {
    if (!formData.name.trim()) return;
    addCategory.mutate(
      {
        templateId,
        organizationId,
        name: formData.name.trim(),
        emoji: formData.emoji,
      },
      { onSuccess: () => setAddDialogOpen(false) }
    );
  };

  const handleUpdate = () => {
    if (!editingCategory || !formData.name.trim()) return;
    updateCategory.mutate(
      {
        categoryId: editingCategory.id,
        templateId,
        updates: {
          name: formData.name.trim(),
          emoji: formData.emoji,
        },
      },
      { onSuccess: () => setEditingCategory(null) }
    );
  };

  const handleDelete = (category: WorkflowTaskCategoryCustom) => {
    if (category.is_default) {
      return;
    }
    if (confirm(`Delete category "${category.name}"?`)) {
      deleteCategory.mutate({ categoryId: category.id, templateId });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setFormData({ ...formData, emoji });
    setEmojiPickerOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Loading categories...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Task Categories</CardTitle>
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No categories configured. Add some to organize your tasks.
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
              >
                <span className="text-xl">{category.emoji}</span>
                <span className="flex-1 text-sm font-medium">{category.name}</span>
                {category.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(category)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {!category.is_default && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Emoji Icon</Label>
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-2xl h-12">
                    {formData.emoji}
                    <span className="ml-2 text-sm text-muted-foreground font-normal">
                      Click to change
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <EmojiPicker
                    onSelect={handleEmojiSelect}
                    showSearch
                    showRecent
                    showCategories
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Finance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!formData.name.trim() || addCategory.isPending}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Emoji Icon</Label>
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-2xl h-12">
                    {formData.emoji}
                    <span className="ml-2 text-sm text-muted-foreground font-normal">
                      Click to change
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <EmojiPicker
                    onSelect={handleEmojiSelect}
                    showSearch
                    showRecent
                    showCategories
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name.trim() || updateCategory.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
