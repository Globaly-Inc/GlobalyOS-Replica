import type { IvrNodeType } from './ivrTypes';
import { NODE_LABELS } from './ivrTypes';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Volume2, Grid3X3, PhoneForwarded, Voicemail, MessageSquare, PhoneOff, Undo2, Save, Loader2, Users,
} from 'lucide-react';

const TOOLBAR_ITEMS: { type: IvrNodeType; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'greeting', icon: Volume2 },
  { type: 'menu', icon: Grid3X3 },
  { type: 'forward', icon: PhoneForwarded },
  { type: 'queue', icon: Users },
  { type: 'voicemail', icon: Voicemail },
  { type: 'message', icon: MessageSquare },
  { type: 'hangup', icon: PhoneOff },
];

interface IvrToolbarProps {
  onAddNode: (type: IvrNodeType) => void;
  onUndo: () => void;
  canUndo: boolean;
  onSave: () => void;
  isSaving: boolean;
  isDirty: boolean;
}

export function IvrToolbar({ onAddNode, onUndo, canUndo, onSave, isSaving, isDirty }: IvrToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-background border-b">
      <span className="text-xs font-medium text-muted-foreground mr-2">Add Node:</span>
      {TOOLBAR_ITEMS.map(({ type, icon: Icon }) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={() => onAddNode(type)}
        >
          <Icon className="h-3.5 w-3.5" />
          {NODE_LABELS[type]}
        </Button>
      ))}

      <Separator orientation="vertical" className="h-6 mx-2" />

      <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} className="h-8 gap-1.5 text-xs">
        <Undo2 className="h-3.5 w-3.5" /> Undo
      </Button>

      <div className="flex-1" />

      <Button size="sm" onClick={onSave} disabled={isSaving || !isDirty} className="h-8 gap-1.5 text-xs">
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {isDirty ? 'Save Changes' : 'Saved'}
      </Button>
    </div>
  );
}
