/**
 * QuotationOptionEditor - Edit option name, description, reorder services, manage fees
 */
import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QuotationFeeEditor } from './QuotationFeeEditor';
import type { CRMQuotationOption, CRMQuotationOptionService } from '@/types/crm-quotation';

interface QuotationOptionEditorProps {
  option: CRMQuotationOption;
  currency: string;
  isDraft: boolean;
  services: Array<{ id: string; name: string }>;
  onDeleteOption: () => void;
  onAddService: (serviceId: string, serviceName: string) => void;
  onDeleteService: (serviceId: string) => void;
  onAddFee: (optionServiceId: string, feeName: string, amount: number, taxMode: 'inclusive' | 'exclusive', taxRate: number) => void;
  onDeleteFee: (feeId: string) => void;
  onUpdateOption: (data: { name?: string; description?: string }) => void;
}

export const QuotationOptionEditor = ({
  option,
  currency,
  isDraft,
  services,
  onDeleteOption,
  onAddService,
  onDeleteService,
  onAddFee,
  onDeleteFee,
  onUpdateOption,
}: QuotationOptionEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(option.name);
  const [editDescription, setEditDescription] = useState(option.description || '');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const handleSaveName = () => {
    if (editName.trim() && editName !== option.name) {
      onUpdateOption({ name: editName.trim() });
    }
    if (editDescription !== (option.description || '')) {
      onUpdateOption({ description: editDescription.trim() || undefined });
    }
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isDraft && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />}
            {isEditing ? (
              <div className="flex-1 space-y-2">
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="h-8 text-sm font-semibold"
                  onBlur={handleSaveName}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                />
                <Textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Option description (optional)"
                  rows={2}
                  className="text-sm"
                />
              </div>
            ) : (
              <div
                className={`flex-1 min-w-0 ${isDraft ? 'cursor-pointer' : ''}`}
                onClick={() => isDraft && setIsEditing(true)}
              >
                <CardTitle className="text-base truncate">{option.name}</CardTitle>
                {option.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{option.description}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {option.is_approved && (
              <Badge variant="default" className="bg-emerald-600 text-white">Approved</Badge>
            )}
            <span className="text-sm font-semibold tabular-nums">
              {currency} {option.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            {isDraft && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDeleteOption}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Services list */}
        {option.services?.map(svc => (
          <Collapsible
            key={svc.id}
            open={expandedServiceId === svc.id}
            onOpenChange={open => setExpandedServiceId(open ? svc.id : null)}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">{svc.service_name}</span>
                    {svc.partner && <Badge variant="outline" className="text-xs shrink-0">{svc.partner.name}</Badge>}
                    <span className="text-xs text-muted-foreground">
                      ({svc.fees?.length || 0} fee{(svc.fees?.length || 0) !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isDraft && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={e => { e.stopPropagation(); onDeleteService(svc.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    {expandedServiceId === svc.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-2 border-t pt-2">
                  {svc.fees?.map(fee => (
                    <QuotationFeeEditor
                      key={fee.id}
                      fee={fee}
                      currency={currency}
                      isDraft={isDraft}
                      onDelete={() => onDeleteFee(fee.id)}
                    />
                  ))}
                  {isDraft && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs w-full justify-start"
                      onClick={() => onAddFee(svc.id, 'Service Fee', 0, 'exclusive', 10)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Fee
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}

        {/* Add service */}
        {isDraft && (
          <Select
            onValueChange={val => {
              const svc = services.find(s => s.id === val);
              if (svc) onAddService(svc.id, svc.name);
            }}
          >
            <SelectTrigger className="border-dashed">
              <SelectValue placeholder="+ Add a service..." />
            </SelectTrigger>
            <SelectContent>
              {services.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
};
