import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Helper to get plain text length from HTML
const getTextLength = (html: string): number => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim().length;
};

const updateSchema = z.object({
  content: z.string()
    .refine((val) => getTextLength(val) >= 10, { message: "Content must be at least 10 characters" })
    .refine((val) => getTextLength(val) <= 5000, { message: "Content must be less than 5000 characters" }),
});

interface EditUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateId: string;
  initialContent: string;
  type: "win" | "announcement" | "achievement";
  onSuccess?: () => void;
}

export const EditUpdateDialog = ({
  open,
  onOpenChange,
  updateId,
  initialContent,
  type,
  onSuccess,
}: EditUpdateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const validated = updateSchema.parse({ content });
      setLoading(true);

      const { error: updateError } = await supabase
        .from("updates")
        .update({ content: validated.content })
        .eq("id", updateId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Post updated",
        description: "Your post has been successfully updated.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0]?.message || "Validation error");
      } else if (err instanceof Error) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case "win":
        return "Edit Win";
      case "announcement":
        return "Edit Announcement";
      case "achievement":
        return "Edit Achievement";
      default:
        return "Edit Post";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Content *</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Edit your post..."
              minHeight="120px"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
