import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropertiesTab } from './PropertiesTab';
import { SpacingTab } from './SpacingTab';
import { ValidationTab } from './ValidationTab';
import type { FormNode } from '@/types/forms';

interface SettingsPanelProps {
  selectedNode: FormNode | null;
  onUpdateNode: (id: string, updates: Partial<FormNode>) => void;
}

export function SettingsPanel({ selectedNode, onUpdateNode }: SettingsPanelProps) {
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

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Settings</h3>
        <p className="text-xs text-muted-foreground capitalize">{selectedNode.type.replace('_', ' ')}</p>
      </div>

      <Tabs defaultValue="properties" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 grid grid-cols-3 shrink-0">
          <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
          <TabsTrigger value="spacing" className="text-xs">Spacing</TabsTrigger>
          {!isElement && <TabsTrigger value="validation" className="text-xs">Validation</TabsTrigger>}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="properties" className="p-4 mt-0">
            <PropertiesTab node={selectedNode} onUpdate={onUpdateNode} />
          </TabsContent>
          <TabsContent value="spacing" className="p-4 mt-0">
            <SpacingTab node={selectedNode} onUpdate={onUpdateNode} />
          </TabsContent>
          {!isElement && (
            <TabsContent value="validation" className="p-4 mt-0">
              <ValidationTab node={selectedNode} onUpdate={onUpdateNode} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
