import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { EditPositionDescriptionDialog } from '@/components/dialogs/EditPositionDescriptionDialog';

interface PositionAIDescriptionProps {
  positionId?: string;
  positionName: string;
  department: string;
  organizationId: string;
  canEdit?: boolean;
  employeeName?: string;
  projectNames?: string[];
}

export const PositionAIDescription = ({
  positionId,
  positionName,
  department,
  organizationId,
  canEdit = false,
  employeeName,
  projectNames = []
}: PositionAIDescriptionProps) => {
  const [description, setDescription] = useState<string | null>(null);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const generateDescription = async (forceRegenerate = false) => {
    if (forceRegenerate) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('generate-position-description', {
        body: {
          positionId,
          positionName,
          department,
          organizationId,
          forceRegenerate
        }
      });

      if (error) throw error;

      if (data) {
        setDescription(data.description);
        setResponsibilities(data.responsibilities || []);
        setIsCached(data.cached);
        
        if (forceRegenerate && !data.cached) {
          toast.success('Position description regenerated');
        }
      }
    } catch (error) {
      console.error('Error generating position description:', error);
      if (forceRegenerate) {
        toast.error('Failed to regenerate description');
      }
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (positionName && organizationId) {
      generateDescription(false);
    }
  }, [positionId, positionName, organizationId]);

  const handleSaveEdit = (newDescription: string, newResponsibilities: string[]) => {
    setDescription(newDescription);
    setResponsibilities(newResponsibilities);
  };

  const getPersonalizedSummary = () => {
    const firstName = employeeName?.split(' ')[0] || 'This person';
    const departmentText = department ? ` in ${department}` : '';
    
    // Build responsibility context from first 3 responsibilities
    let responsibilityText = '';
    if (responsibilities.length > 0) {
      const topResponsibilities = responsibilities.slice(0, 3).map(r => 
        r.toLowerCase().replace(/\.$/, '')
      );
      responsibilityText = ` Key responsibilities include ${topResponsibilities.join(', ')}.`;
    }
    
    // Build project context
    const projectText = projectNames.length > 0
      ? ` Currently working on ${projectNames.slice(0, 3).join(', ')}${projectNames.length > 3 ? ' and more' : ''}.`
      : '';
    
    return `${firstName} is a ${positionName}${departmentText}.${responsibilityText}${projectText}`;
  };

  if (loading) {
    return (
      <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!description) {
    return null;
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
        <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">Role Description</span>
                  {!isOpen && description && (
                    <p className="text-xs text-muted-foreground line-clamp-5 mt-0.5">
                      {getPersonalizedSummary()}
                    </p>
                  )}
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
              
              {responsibilities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Key Responsibilities</h4>
                  <ul className="space-y-1.5">
                    {responsibilities.map((responsibility, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1.5">•</span>
                        <span>{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {canEdit && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateDescription(true)}
                    disabled={regenerating}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditDialogOpen(true)}
                    className="text-xs"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <EditPositionDescriptionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        positionId={positionId}
        positionName={positionName}
        department={department}
        currentDescription={description || ''}
        currentResponsibilities={responsibilities}
        onSave={handleSaveEdit}
        onRegenerate={() => generateDescription(true)}
      />
    </>
  );
};
