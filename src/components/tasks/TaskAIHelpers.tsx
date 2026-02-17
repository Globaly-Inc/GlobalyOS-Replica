import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIDescriptionHelperProps {
  taskTitle: string;
  onGenerated: (description: string) => void;
}

export const AIDescriptionHelper = ({ taskTitle, onGenerated }: AIDescriptionHelperProps) => {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!taskTitle.trim()) {
      toast.error('Enter a task title first');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('task-ai-helper', {
        body: { action: 'generate_description', title: taskTitle },
      });
      if (error) throw error;
      if (data?.description) {
        onGenerated(data.description);
        toast.success('Description generated');
      }
    } catch {
      toast.error('Failed to generate description');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-xs gap-1 text-muted-foreground"
      onClick={generate}
      disabled={loading || !taskTitle.trim()}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      AI Generate
    </Button>
  );
};

interface AISubtaskHelperProps {
  taskTitle: string;
  taskDescription: string;
  onGenerated: (subtasks: string[]) => void;
}

export const AISubtaskHelper = ({ taskTitle, taskDescription, onGenerated }: AISubtaskHelperProps) => {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!taskTitle.trim()) {
      toast.error('Enter a task title first');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('task-ai-helper', {
        body: { action: 'suggest_subtasks', title: taskTitle, description: taskDescription },
      });
      if (error) throw error;
      if (data?.subtasks?.length) {
        onGenerated(data.subtasks);
        toast.success(`${data.subtasks.length} subtasks suggested`);
      }
    } catch {
      toast.error('Failed to suggest subtasks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-xs gap-1 text-muted-foreground"
      onClick={generate}
      disabled={loading || !taskTitle.trim()}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      AI Suggest Subtasks
    </Button>
  );
};
