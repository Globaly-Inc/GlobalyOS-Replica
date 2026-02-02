/**
 * Assign Assignment Dialog
 * Dialog to assign a task/assignment to a candidate
 */

import { useState } from 'react';
import { useAssignmentTemplates } from '@/services/useHiring';
import { useAssignAssignment } from '@/services/useHiringMutations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addHours, format } from 'date-fns';
import type { ExpectedDeliverables } from '@/types/hiring';

interface AssignAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
}

export function AssignAssignmentDialog({
  open,
  onOpenChange,
  applicationId,
}: AssignAssignmentDialogProps) {
  const { data: templates } = useAssignmentTemplates();
  const assignAssignment = useAssignAssignment();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadlineHours, setDeadlineHours] = useState(72);
  const [expectedDeliverables, setExpectedDeliverables] = useState<ExpectedDeliverables>({
    files: false,
    text_questions: [],
    url_fields: [],
  });

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setTitle(template.name);
      setInstructions(template.instructions);
      setDeadlineHours(template.default_deadline_hours);
      setExpectedDeliverables(template.expected_deliverables);
    }
  };

  const handleSubmit = async () => {
    const deadline = addHours(new Date(), deadlineHours);
    
    await assignAssignment.mutateAsync({
      candidate_application_id: applicationId,
      template_id: selectedTemplateId || undefined,
      title,
      instructions,
      expected_deliverables: expectedDeliverables,
      deadline: deadline.toISOString(),
    });

    onOpenChange(false);
    // Reset form
    setSelectedTemplateId('');
    setTitle('');
    setInstructions('');
    setDeadlineHours(72);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
          <DialogDescription>
            Send an assignment to the candidate. They'll receive a secure link to submit their work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Use Template (Optional)</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates?.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Technical Assessment"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions *</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={6}
              placeholder="Describe what the candidate needs to do..."
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (hours from now)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="deadline"
                type="number"
                min={1}
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(parseInt(e.target.value) || 72)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                Due: {format(addHours(new Date(), deadlineHours), 'PPp')}
              </span>
            </div>
          </div>

          {/* Expected Deliverables */}
          <div className="space-y-2">
            <Label>Expected Deliverables</Label>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={expectedDeliverables.files}
                  onChange={(e) => setExpectedDeliverables({
                    ...expectedDeliverables,
                    files: e.target.checked
                  })}
                  className="rounded"
                />
                File uploads
              </label>
              <div className="space-y-1">
                <Label className="text-xs">URL Fields (comma-separated)</Label>
                <Input
                  value={expectedDeliverables.url_fields.join(', ')}
                  onChange={(e) => setExpectedDeliverables({
                    ...expectedDeliverables,
                    url_fields: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="e.g., GitHub Repo, Live Demo"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title || !instructions || assignAssignment.isPending}
          >
            {assignAssignment.isPending ? 'Sending...' : 'Send Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
