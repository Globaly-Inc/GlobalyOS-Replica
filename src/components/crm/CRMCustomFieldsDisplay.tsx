/**
 * CRM Custom Fields Display
 * Renders custom fields on profile pages as editable fields.
 */
import { EditableField } from '@/components/EditableField';
import { useCRMCustomFields } from '@/services/useCRMCustomFields';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

interface Props {
  entityType: 'contact' | 'company';
  customFieldValues: Record<string, any> | null;
  onSave: (customFields: Record<string, any>) => Promise<void>;
}

export const CRMCustomFieldsDisplay = ({ entityType, customFieldValues, onSave }: Props) => {
  const { data: fieldDefs = [] } = useCRMCustomFields(entityType);
  const values = customFieldValues || {};

  if (fieldDefs.length === 0) return null;

  const handleFieldSave = async (key: string, value: string) => {
    await onSave({ ...values, [key]: value });
  };

  const handleCheckboxChange = async (key: string, checked: boolean) => {
    await onSave({ ...values, [key]: checked });
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 bg-card border-b">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Custom Fields</h2>
      </div>
      <CardContent className="p-4 space-y-3">
        {fieldDefs.map((field) => {
          if (field.field_type === 'checkbox') {
            return (
              <div key={field.id} className="flex items-center gap-3">
                <Checkbox
                  checked={!!values[field.field_key]}
                  onCheckedChange={(checked) => handleCheckboxChange(field.field_key, !!checked)}
                />
                <span className="text-sm">{field.field_name}</span>
              </div>
            );
          }

          return (
            <EditableField
              key={field.id}
              label={field.field_name}
              value={values[field.field_key] ?? null}
              onSave={(val) => handleFieldSave(field.field_key, val)}
              placeholder={`Enter ${field.field_name.toLowerCase()}...`}
            />
          );
        })}
      </CardContent>
    </Card>
  );
};
