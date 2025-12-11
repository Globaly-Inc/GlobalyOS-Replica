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

const kudosSchema = z.object({
  comment: z.string()
    .refine((val) => getTextLength(val) >= 10, { message: "Message must be at least 10 characters" })
    .refine((val) => getTextLength(val) <= 1000, { message: "Message must be less than 1000 characters" }),
});

interface EditKudosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kudosId: string;
  batchId?: string;
  initialComment: string;
  onSuccess?: () => void;
}

export const EditKudosDialog = ({
  open,
  onOpenChange,
  kudosId,
  batchId,
  initialComment,
  onSuccess,
}: EditKudosDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const validated = kudosSchema.parse({ comment });
      setLoading(true);

      // If there's a batch_id, update all kudos in the batch
      // Otherwise, just update this single kudos
      const query = batchId
        ? supabase.from("kudos").update({ comment: validated.comment }).eq("batch_id", batchId)
        : supabase.from("kudos").update({ comment: validated.comment }).eq("id", kudosId);

      const { error: updateError } = await query;

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Kudos updated",
        description: "The kudos message has been successfully updated.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Kudos</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Message *</Label>
            <RichTextEditor
              value={comment}
              onChange={setComment}
              placeholder="Edit your kudos message..."
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
