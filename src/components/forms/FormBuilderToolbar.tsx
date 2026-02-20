import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Palette, Eye, Undo2, Redo2, Share2, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface FormBuilderToolbarProps {
  formName: string;
  onFormNameChange: (name: string) => void;
  onTheme: () => void;
  onPreview: () => void;
  onShare: () => void;
  onSave: () => void;
  onPublish: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
}

export function FormBuilderToolbar({
  formName,
  onFormNameChange,
  onTheme,
  onPreview,
  onShare,
  onSave,
  onPublish,
  onCancel,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDirty,
  isSaving,
  isPublishing,
}: FormBuilderToolbarProps) {
  return (
    <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={formName}
          onChange={(e) => onFormNameChange(e.target.value)}
          className="h-8 w-48 text-sm font-semibold border-transparent hover:border-border focus:border-border bg-transparent"
          placeholder="Form name..."
        />
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onTheme}>
          <Palette className="h-4 w-4 mr-1" />
          Theme
        </Button>
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="outline" size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button size="sm" onClick={onPublish} disabled={isPublishing}>
          {isPublishing ? 'Publishing...' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}
