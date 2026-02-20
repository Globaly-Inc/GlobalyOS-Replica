import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FormNode, FormNodeProperties } from '@/types/forms';

interface PropertiesTabProps {
  node: FormNode;
  onUpdate: (id: string, updates: Partial<FormNode>) => void;
}

function ImageVideoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowed.includes(file.type)) {
      toast.error('Unsupported file type. Use PNG, JPG, WEBP, GIF, MP4, or WEBM.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10 MB.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('form-media').upload(path, file);
    if (error) {
      toast.error('Upload failed: ' + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('form-media').getPublicUrl(path);
    onChange(urlData.publicUrl);
    setUploading(false);
    toast.success('Uploaded!');
  };

  const isVideo = value && /\.(mp4|webm)$/i.test(value);

  return (
    <div className="space-y-2">
      <Label className="text-xs">Image / Video</Label>

      {value ? (
        <div className="relative rounded-md border border-border overflow-hidden">
          {isVideo ? (
            <video src={value} controls className="w-full max-h-40 object-contain bg-muted" />
          ) : (
            <img src={value} alt="Preview" className="w-full max-h-40 object-contain bg-muted" />
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => onChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-full h-24 rounded-md border-2 border-dashed border-border hover:border-primary/50 transition-colors text-muted-foreground text-xs gap-1"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? 'Uploading...' : 'Click to upload'}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
        className="hidden"
        onChange={handleUpload}
      />

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Or paste URL</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export function PropertiesTab({ node, onUpdate }: PropertiesTabProps) {
  function updateProp(key: keyof FormNodeProperties, value: unknown) {
    onUpdate(node.id, {
      properties: { ...node.properties, [key]: value },
    });
  }

  const isElement = ['heading', 'subheading', 'paragraph', 'image', 'section', 'divider'].includes(node.type);

  const suggestedLabels: Record<string, string[]> = {
    text: ['Name', 'First Name', 'Last Name', 'Street', 'City', 'Company', 'Job Title', 'Address'],
    email: ['Email', 'Work Email', 'Secondary Email'],
    phone: ['Phone', 'Mobile', 'Work Phone'],
    dropdown: ['Country', 'State', 'Department', 'Gender', 'Category'],
    date: ['Date of Birth', 'Start Date', 'End Date', 'Due Date'],
    file: ['Resume', 'Cover Image', 'Logo', 'Attachment', 'Document'],
    number: ['Age', 'Quantity', 'Amount', 'Budget'],
    textarea: ['Message', 'Description', 'Notes', 'Comments', 'Feedback'],
    checkbox: ['I agree to terms', 'Subscribe to newsletter', 'Confirm'],
    radio: ['Gender', 'Priority', 'Rating', 'Category'],
    multi_select: ['Skills', 'Interests', 'Categories', 'Services'],
  };

  const currentSuggestions = suggestedLabels[node.type] || [];

  return (
    <div className="space-y-4">
      {/* Label / Content */}
      {isElement && node.type !== 'divider' ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Content</Label>
          {node.type === 'paragraph' ? (
            <Textarea
              value={(node.properties.content as string) || ''}
              onChange={(e) => updateProp('content', e.target.value)}
              placeholder="Enter text..."
              rows={3}
            />
          ) : (
            <Input
              value={(node.properties.content as string) || (node.properties.label as string) || ''}
              onChange={(e) => updateProp('content', e.target.value)}
              placeholder="Enter text..."
            />
          )}
        </div>
      ) : node.type !== 'divider' ? (
        <>
          {currentSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Suggested Labels</Label>
              <Select
                value={undefined}
                onValueChange={(v) => {
                  if (v === '__none__') return;
                  updateProp('label', v);
                  updateProp('placeholder', `Enter ${v.toLowerCase()}...`);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a system field..." />
                </SelectTrigger>
                <SelectContent>
                  {currentSuggestions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <Input
              value={node.properties.label || ''}
              onChange={(e) => updateProp('label', e.target.value)}
              placeholder="Field label"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={node.properties.description || ''}
              onChange={(e) => updateProp('description', e.target.value)}
              placeholder="Help text"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Placeholder</Label>
            <Input
              value={node.properties.placeholder || ''}
              onChange={(e) => updateProp('placeholder', e.target.value)}
              placeholder="Placeholder text"
            />
          </div>
        </>
      ) : null}

      {/* Column layout */}
      {!isElement && (
        <div className="space-y-1.5">
          <Label className="text-xs">Column Layout</Label>
          <Select
            value={String(node.properties.columns ?? 1)}
            onValueChange={(v) => updateProp('columns', Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Full Width</SelectItem>
              <SelectItem value="2">Half Width</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Image/Video Upload */}
      {node.type === 'image' && (
        <ImageVideoUploader
          value={node.properties.imageUrl || ''}
          onChange={(url) => updateProp('imageUrl', url)}
        />
      )}

      {/* Options for dropdown/radio/multi_select */}
      {['dropdown', 'multi_select', 'radio'].includes(node.type) && (
        <div className="space-y-1.5">
          <Label className="text-xs">Options (one per line)</Label>
          <Textarea
            value={(node.properties.options || []).map((o) => o.label).join('\n')}
            onChange={(e) => {
              const options = e.target.value.split('\n').filter(Boolean).map((label, i) => ({
                label: label.trim(),
                value: label.trim().toLowerCase().replace(/\s+/g, '_') || `option_${i}`,
              }));
              updateProp('options', options);
            }}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            rows={4}
          />
        </div>
      )}
    </div>
  );
}
