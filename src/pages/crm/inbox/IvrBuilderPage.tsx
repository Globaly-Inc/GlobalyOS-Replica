import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateIvrConfig } from '@/hooks/useTelephony';
import { useOrganization } from '@/hooks/useOrganization';
import { useIvrBuilder } from '@/components/ivr/useIvrBuilder';
import { IvrCanvas } from '@/components/ivr/IvrCanvas';
import { IvrNodeCard } from '@/components/ivr/IvrNode';
import { IvrEdges } from '@/components/ivr/IvrEdge';
import { IvrToolbar } from '@/components/ivr/IvrToolbar';
import { IvrNodeConfig } from '@/components/ivr/IvrNodeConfig';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone } from 'lucide-react';
import { toast } from 'sonner';
import type { IvrNodeType } from '@/components/ivr/ivrTypes';
import { OrgLink } from '@/components/OrgLink';

const IvrBuilderPage = () => {
  const { phoneId } = useParams<{ phoneId: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const updateIvr = useUpdateIvrConfig();

  const { data: phoneNumber, isLoading } = useQuery({
    queryKey: ['phone-number', phoneId],
    enabled: !!phoneId && !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_phone_numbers')
        .select('*')
        .eq('id', phoneId!)
        .eq('organization_id', currentOrg!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const ivr = useIvrBuilder(phoneNumber?.ivr_config as Record<string, unknown> | null);

  const handleSave = async () => {
    if (!phoneId) return;
    try {
      await updateIvr.mutateAsync({
        id: phoneId,
        ivr_config: ivr.toSavePayload(),
      });
      ivr.markSaved();
      toast.success('IVR configuration saved');
    } catch {
      toast.error('Failed to save IVR configuration');
    }
  };

  const handleAddFloatingNode = (type: IvrNodeType) => {
    ivr.addNode(type);
  };

  const handleAddChild = (parentId: string) => {
    const parent = ivr.findNode(parentId);
    if (!parent) return;

    if (parent.type === 'menu') {
      // Add a new menu option with a child node
      const usedDigits = new Set(parent.menu_options?.map((o) => o.digit) || []);
      const nextDigit = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].find((d) => !usedDigits.has(d));
      if (!nextDigit) {
        toast.error('All digits are used');
        return;
      }
      ivr.addNode('message', parentId, nextDigit);
    } else {
      // Add a child to a non-menu node
      ivr.addNode('message', parentId);
    }
  };

  const handleAddMenuOption = (nodeId: string, digit: string): string => {
    return ivr.addNode('message', nodeId, digit);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-4 border-b flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-64 w-96" />
        </div>
      </div>
    );
  }

  if (!phoneNumber) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Phone number not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Phone className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-foreground">IVR Builder</h1>
          <p className="text-xs text-muted-foreground font-mono">{phoneNumber.phone_number}</p>
        </div>
      </div>

      {/* Toolbar */}
      <IvrToolbar
        onAddNode={handleAddFloatingNode}
        onUndo={ivr.undo}
        canUndo={ivr.canUndo}
        onSave={handleSave}
        isSaving={updateIvr.isPending}
        isDirty={ivr.isDirty}
      />

      {/* Canvas + Config panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <IvrCanvas>
            <IvrEdges nodes={ivr.tree.nodes} />
            {ivr.tree.nodes.map((node) => (
              <IvrNodeCard
                key={node.id}
                node={node}
                isSelected={ivr.selectedNodeId === node.id}
                onSelect={ivr.setSelectedNodeId}
                onMove={ivr.moveNode}
                onDelete={ivr.removeNode}
                onAddChild={handleAddChild}
              />
            ))}
          </IvrCanvas>
        </div>

        {/* Config Panel */}
        {ivr.selectedNode && (
          <IvrNodeConfig
            node={ivr.selectedNode}
            onUpdate={ivr.updateNode}
            onClose={() => ivr.setSelectedNodeId(null)}
            onAddMenuOption={handleAddMenuOption}
            onRemoveNode={ivr.removeNode}
          />
        )}
      </div>
    </div>
  );
};

export default IvrBuilderPage;
