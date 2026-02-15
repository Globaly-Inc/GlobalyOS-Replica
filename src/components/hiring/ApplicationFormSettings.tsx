/**
 * Application Form Settings
 * Configure which fields appear on the public application form for a job
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock, Plus, Trash2, X } from 'lucide-react';
import type { ApplicationFormConfig, CustomFieldConfig } from '@/types/hiring';

interface ApplicationFormSettingsProps {
  config: ApplicationFormConfig;
  onChange: (config: ApplicationFormConfig) => void;
}

const DEFAULT_SOURCE_OPTIONS = ['LinkedIn', 'Referral', 'Job Board', 'Company Website', 'Other'];

const REQUIRED_FIELDS = [
  'Full Name',
  'Email',
  'Phone Number',
  'Resume Upload',
  'Source',
];

export function ApplicationFormSettings({ config, onChange }: ApplicationFormSettingsProps) {
  const optionalFields = config.optional_fields ?? { linkedin_url: true, cover_letter: false };
  const customFields = config.custom_fields ?? [];
  const sourceOptions = config.source_options ?? DEFAULT_SOURCE_OPTIONS;

  const updateOptionalField = (field: string, enabled: boolean) => {
    onChange({
      ...config,
      optional_fields: { ...optionalFields, [field]: enabled },
    });
  };

  const addCustomField = () => {
    const newField: CustomFieldConfig = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: '',
      type: 'text',
      required: false,
    };
    onChange({
      ...config,
      custom_fields: [...customFields, newField],
    });
  };

  const updateCustomField = (index: number, updates: Partial<CustomFieldConfig>) => {
    const updated = customFields.map((f, i) => (i === index ? { ...f, ...updates } : f));
    onChange({ ...config, custom_fields: updated });
  };

  const removeCustomField = (index: number) => {
    onChange({ ...config, custom_fields: customFields.filter((_, i) => i !== index) });
  };

  const addSourceOption = () => {
    onChange({ ...config, source_options: [...sourceOptions, ''] });
  };

  const updateSourceOption = (index: number, value: string) => {
    const updated = sourceOptions.map((o, i) => (i === index ? value : o));
    onChange({ ...config, source_options: updated });
  };

  const removeSourceOption = (index: number) => {
    onChange({ ...config, source_options: sourceOptions.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Application Form</CardTitle>
        <CardDescription>Configure fields shown to applicants</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Fields */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Required Fields
          </Label>
          <div className="space-y-1.5">
            {REQUIRED_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/50">
                <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{field}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Fields */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Optional Fields
          </Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">LinkedIn / Personal URL</span>
              <Switch
                checked={optionalFields.linkedin_url ?? true}
                onCheckedChange={(checked) => updateOptionalField('linkedin_url', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cover Letter</span>
              <Switch
                checked={optionalFields.cover_letter ?? false}
                onCheckedChange={(checked) => updateOptionalField('cover_letter', checked)}
              />
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Custom Fields
          </Label>
          {customFields.length > 0 && (
            <div className="space-y-2">
              {customFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-2 rounded-md border bg-background">
                  <Input
                    value={field.label}
                    onChange={(e) => updateCustomField(index, { label: e.target.value })}
                    placeholder="Field label"
                    className="h-8 text-sm flex-1"
                  />
                  <Select
                    value={field.type}
                    onValueChange={(value) => updateCustomField(index, { type: value as 'text' | 'file' })}
                  >
                    <SelectTrigger className="h-8 w-[80px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={field.required ? 'default' : 'outline'}
                      className="cursor-pointer text-[10px] px-1.5 py-0"
                      onClick={() => updateCustomField(index, { required: !field.required })}
                    >
                      Req
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCustomField(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomField}
            className="w-full text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Field
          </Button>
        </div>

        {/* Source Options */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Source Options
          </Label>
          <p className="text-xs text-muted-foreground">Options for &quot;How did you hear about us?&quot;</p>
          <div className="space-y-1.5">
            {sourceOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Input
                  value={option}
                  onChange={(e) => updateSourceOption(index, e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Option label"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSourceOption(index)}
                  disabled={sourceOptions.length <= 1}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSourceOption}
            className="w-full text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Option
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
