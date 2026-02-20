import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropertiesTab } from './PropertiesTab';
import { SpacingTab } from './SpacingTab';
import { ValidationTab } from './ValidationTab';
import { LogicTab } from './LogicTab';
import type { FormNode } from '@/types/forms';

interface SettingsPanelProps {
  selectedNode: FormNode | null;
  onUpdateNode: (id: string, updates: Partial<FormNode>) => void;
  allNodes?: FormNode[];
}

export function SettingsPanel({ selectedNode, onUpdateNode, allNodes = [] }: SettingsPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-border bg-card p-6 flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">
          Select an element to edit its settings
        </p>
      </div>
    );
  }

  const isElement = ['heading', 'subheading', 'paragraph', 'image', 'section', 'divider'].includes(selectedNode.type);
  const isField = !isElement;

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Settings</h3>
        <p className="text-xs text-muted-foreground capitalize">{selectedNode.type.replace('_', ' ')}</p>
      </div>

      <Tabs defaultValue="properties" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className={`mx-4 mt-2 grid shrink-0 ${isField ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
          <TabsTrigger value="spacing" className="text-xs">Spacing</TabsTrigger>
          {isField && <TabsTrigger value="validation" className="text-xs">Validation</TabsTrigger>}
          {isField && <TabsTrigger value="logic" className="text-xs">Logic</TabsTrigger>}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="properties" className="p-4 mt-0">
            <PropertiesTab node={selectedNode} onUpdate={onUpdateNode} />
          </TabsContent>
          <TabsContent value="spacing" className="p-4 mt-0">
            <SpacingTab node={selectedNode} onUpdate={onUpdateNode} />
          </TabsContent>
          {isField && (
            <TabsContent value="validation" className="p-4 mt-0">
              <ValidationTab node={selectedNode} onUpdate={onUpdateNode} />
            </TabsContent>
          )}
          {isField && (
            <TabsContent value="logic" className="p-4 mt-0">
              <LogicTab node={selectedNode} allNodes={allNodes} onUpdate={onUpdateNode} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
