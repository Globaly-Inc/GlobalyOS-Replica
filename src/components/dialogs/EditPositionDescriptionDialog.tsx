import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditPositionDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId?: string;
  positionName: string;
  department: string;
  currentDescription: string;
  currentResponsibilities: string[];
  onSave: (description: string, responsibilities: string[]) => void;
  onRegenerate: () => void;
}

export const EditPositionDescriptionDialog = ({
  open,
  onOpenChange,
  positionId,
  positionName,
  department,
  currentDescription,
  currentResponsibilities,
  onSave,
  onRegenerate
}: EditPositionDescriptionDialogProps) => {
  const [description, setDescription] = useState(currentDescription);
  const [responsibilities, setResponsibilities] = useState<string[]>(currentResponsibilities);
  const [keywords, setKeywords] = useState('');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    setDescription(currentDescription);
    setResponsibilities(currentResponsibilities);
  }, [currentDescription, currentResponsibilities, open]);

  const handleAddResponsibility = () => {
    setResponsibilities([...responsibilities, '']);
  };

  const handleRemoveResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  const handleResponsibilityChange = (index: number, value: string) => {
    const updated = [...responsibilities];
    updated[index] = value;
    setResponsibilities(updated);
  };

  const handleRegenerateWithKeywords = async () => {
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-position-description', {
        body: {
          positionId,
          positionName,
          department,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          organizationId: session.user.id,
          forceRegenerate: true
        }
      });

      if (error) throw error;

      if (data) {
        setDescription(data.description);
        setResponsibilities(data.responsibilities || []);
        toast.success('Description regenerated with new keywords');
      }
    } catch (error) {
      console.error('Error regenerating:', error);
      toast.error('Failed to regenerate description');
    } finally {
      setRegenerating(false);
    }
  };

  const handleSave = async () => {
    if (!positionId) {
      toast.error('Position ID is required');
      return;
    }

    setSaving(true);
    try {
      const filteredResponsibilities = responsibilities.filter(r => r.trim() !== '');
      
      const { error } = await supabase
        .from('positions')
        .update({
          description,
          responsibilities: filteredResponsibilities,
          ai_generated_at: new Date().toISOString()
        })
        .eq('id', positionId);

      if (error) throw error;

      onSave(description, filteredResponsibilities);
      toast.success('Position description updated');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Edit Position Description
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{positionName}</span>
            {department && <span className="ml-2">• {department}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter position description..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {description.split(' ').filter(w => w).length} words
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Key Responsibilities</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddResponsibility}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {responsibilities.map((responsibility, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm w-4">{index + 1}.</span>
                  <Input
                    value={responsibility}
                    onChange={(e) => handleResponsibilityChange(index, e.target.value)}
                    placeholder="Enter responsibility..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveResponsibility(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {responsibilities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No responsibilities added. Click "Add" to add one.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <Label htmlFor="keywords">Regenerate with Keywords (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., leadership, data analysis, project management"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleRegenerateWithKeywords}
                disabled={regenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter comma-separated keywords to guide AI generation
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
