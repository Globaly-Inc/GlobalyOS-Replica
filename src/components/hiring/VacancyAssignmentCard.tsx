import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Clock, FileUp, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssignmentTemplatesForPosition, AssignmentTemplateForPosition } from '@/hooks/useAssignmentTemplatesForPosition';
import { useUpdateAssignmentTemplate } from '@/services/useHiringMutations';
import { addHours, format } from 'date-fns';

interface VacancyAssignmentCardProps {
  jobTitle: string;
}

const getDeliverablesSummary = (deliverables: any) => {
  if (!deliverables) return [];
  const items: { icon: typeof FileUp; label: string }[] = [];

  const fileUploads = deliverables.file_uploads;
  if (fileUploads?.enabled) {
    items.push({ icon: FileUp, label: fileUploads.max_files > 1 ? `${fileUploads.max_files} Files` : 'File' });
  }
  const urlFields = deliverables.url_fields;
  if (Array.isArray(urlFields) && urlFields.length > 0) {
    items.push({ icon: Link2, label: urlFields.length > 1 ? `${urlFields.length} URLs` : '1 URL' });
  }
  return items;
};

export const VacancyAssignmentCard = ({ jobTitle }: VacancyAssignmentCardProps) => {
  const { data, isLoading } = useAssignmentTemplatesForPosition(jobTitle);
  const updateTemplate = useUpdateAssignmentTemplate();
  const templates = data?.templates ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deadlineHours, setDeadlineHours] = useState<number | ''>('');

  // Auto-select first template
  useEffect(() => {
    if (templates.length > 0 && !selectedId) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  // Sync deadline hours when selection changes
  useEffect(() => {
    if (selected) {
      setDeadlineHours(selected.default_deadline_hours ?? '');
    }
  }, [selected?.id]);

  if (isLoading) return null;
  if (!templates.length) return null;

  const handleDeadlineChange = (value: string) => {
    const num = value === '' ? '' : parseInt(value, 10);
    setDeadlineHours(num);
  };

  const handleDeadlineBlur = () => {
    if (!selected || deadlineHours === '' || deadlineHours === selected.default_deadline_hours) return;
    updateTemplate.mutate({ id: selected.id, input: { default_deadline_hours: deadlineHours as number } });
  };

  const deliverables = selected ? getDeliverablesSummary(selected.expected_deliverables) : [];
  const duePreview = deadlineHours !== '' ? format(addHours(new Date(), deadlineHours as number), 'MMM d, yyyy h:mm a') : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Assignment Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.length > 1 && (
          <Select value={selectedId ?? ''} onValueChange={setSelectedId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selected && (
          <div className="space-y-3">
            {templates.length === 1 && (
              <p className="font-medium text-sm">{selected.name}</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {selected.type && (
                <Badge variant="secondary" className="text-xs">{selected.type}</Badge>
              )}
              {selected.recommended_effort && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {selected.recommended_effort}
                </Badge>
              )}
            </div>

            {deliverables.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {deliverables.map((d, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-muted-foreground">
                    <d.icon className="h-3 w-3 mr-1" />
                    {d.label}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Deadline (hours)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={deadlineHours}
                  onChange={(e) => handleDeadlineChange(e.target.value)}
                  onBlur={handleDeadlineBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleDeadlineBlur()}
                  className="h-8 w-24"
                  placeholder="hrs"
                />
                <span className="text-xs text-muted-foreground">hours</span>
              </div>
              {duePreview && (
                <p className="text-xs text-muted-foreground">
                  Due: {duePreview}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
