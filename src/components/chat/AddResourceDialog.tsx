import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string | null;
  spaceId?: string | null;
}

const AddResourceDialog = ({
  open,
  onOpenChange,
  conversationId,
  spaceId,
}: AddResourceDialogProps) => {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("link");

  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();

  const handleClose = () => {
    setTitle("");
    setUrl("");
    setActiveTab("link");
    onOpenChange(false);
  };

  const handleAddLink = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error("Please enter both title and URL");
      return;
    }

    if (!currentOrg?.id || !currentEmployee?.id) {
      toast.error("Not authenticated");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("chat_pinned_resources").insert({
        organization_id: currentOrg.id,
        conversation_id: conversationId || null,
        space_id: spaceId || null,
        title: title.trim(),
        url: url.trim(),
        pinned_by: currentEmployee.id,
      });

      if (error) throw error;

      toast.success("Resource added successfully");
      queryClient.invalidateQueries({ queryKey: ["chat-pinned-resources"] });
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to add resource");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2" disabled>
              <FileText className="h-4 w-4" />
              File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Project Documentation"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleAddLink} disabled={isSubmitting || !title.trim() || !url.trim()}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Link
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>File upload coming soon</p>
              <p className="text-sm">Pin links for now</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddResourceDialog;
