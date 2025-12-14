import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, GripVertical } from 'lucide-react';

interface FeatureHighlightsEditorProps {
  highlights: string[];
  onChange: (highlights: string[]) => void;
}

export function FeatureHighlightsEditor({ highlights, onChange }: FeatureHighlightsEditorProps) {
  const [newHighlight, setNewHighlight] = useState('');

  const addHighlight = () => {
    if (newHighlight.trim()) {
      onChange([...highlights, newHighlight.trim()]);
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    onChange(highlights.filter((_, i) => i !== index));
  };

  const updateHighlight = (index: number, value: string) => {
    const updated = [...highlights];
    updated[index] = value;
    onChange(updated);
  };

  const moveHighlight = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= highlights.length) return;
    const updated = [...highlights];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Feature Highlights</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Add bullet points that will appear on the pricing page for this plan.
        </p>
      </div>

      <div className="space-y-2">
        {highlights.map((highlight, index) => (
          <div key={index} className="flex items-center gap-2 group">
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={() => moveHighlight(index, index - 1)}
                disabled={index === 0}
              >
                <span className="text-xs">↑</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={() => moveHighlight(index, index + 1)}
                disabled={index === highlights.length - 1}
              >
                <span className="text-xs">↓</span>
              </Button>
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <div className="flex-1 flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <Input
                value={highlight}
                onChange={(e) => updateHighlight(index, e.target.value)}
                className="flex-1"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeHighlight(index)}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newHighlight}
          onChange={(e) => setNewHighlight(e.target.value)}
          placeholder="Add a feature highlight..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addHighlight();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addHighlight}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mt-4">
        <h4 className="font-medium mb-2">Preview</h4>
        <ul className="space-y-1">
          {highlights.length > 0 ? (
            highlights.map((highlight, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                {highlight}
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">No highlights added yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}
