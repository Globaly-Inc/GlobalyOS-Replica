/**
 * QuotationOptionEditor - Edit option name, description, reorder services, manage fees
 */
import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QuotationFeeEditor } from './QuotationFeeEditor';
import { AddFeeDialog } from './AddFeeDialog';
import { AddServiceDialog } from './AddServiceDialog';
import type { CRMQuotationOption, CRMQuotationOptionService, CRMQuotationServiceFee } from '@/types/crm-quotation';

interface QuotationOptionEditorProps {
  option: CRMQuotationOption;
  currency: string;
  isDraft: boolean;
  services: Array<{ id: string; name: string }>;
  dragHandleProps?: Record<string, any>;
  onDeleteOption: () => void;
  onAddService: (serviceId: string | null, serviceName: string, partnerId?: string | null, serviceDate?: string | null) => void;
  onDeleteService: (serviceId: string) => void;
  onAddFee: (optionServiceId: string, feeName: string, amount: number, taxMode: 'inclusive' | 'exclusive', taxRate: number, revenueType?: string, installmentType?: string, numInstallments?: number, installmentDetails?: any[]) => void;
  onDeleteFee: (feeId: string) => void;
  onUpdateOption: (data: { name?: string; description?: string }) => void;
  onUpdateFee?: (feeId: string, data: Partial<CRMQuotationServiceFee>) => void;
  onReorderServices?: (items: { id: string; sort_order: number }[]) => void;
}

// Sortable service row
const SortableServiceRow = ({ svc, isDraft, currency, expandedServiceId, setExpandedServiceId, onDeleteService, onDeleteFee, onUpdateFee, onAddFee }: {
  svc: CRMQuotationOptionService;
  isDraft: boolean;
  currency: string;
  expandedServiceId: string | null;
  setExpandedServiceId: (id: string | null) => void;
  onDeleteService: (id: string) => void;
  onDeleteFee: (id: string) => void;
  onUpdateFee?: (feeId: string, data: any) => void;
  onAddFee: (optionServiceId: string, feeName: string, amount: number, taxMode: 'inclusive' | 'exclusive', taxRate: number, revenueType?: string, installmentType?: string, numInstallments?: number, installmentDetails?: any[]) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: svc.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Collapsible
        open={expandedServiceId === svc.id}
        onOpenChange={open => setExpandedServiceId(open ? svc.id : null)}
      >
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                {isDraft && (
                  <span {...listeners} className="cursor-grab touch-none">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </span>
                )}
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
                  onUpdate={onUpdateFee ? (data) => onUpdateFee(fee.id, data) : undefined}
                />
              ))}
              {isDraft && (
                <AddFeeDialog
                  currency={currency}
                  onAdd={(data) => onAddFee(svc.id, data.fee_name, data.amount, data.tax_mode, data.tax_rate, data.revenue_type, data.installment_type, data.num_installments, data.installment_details)}
                />
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export const QuotationOptionEditor = ({
  option,
  currency,
  isDraft,
  services,
  dragHandleProps,
  onDeleteOption,
  onAddService,
  onDeleteService,
  onAddFee,
  onDeleteFee,
  onUpdateOption,
  onUpdateFee,
  onReorderServices,
}: QuotationOptionEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(option.name);
  const [editDescription, setEditDescription] = useState(option.description || '');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const serviceIds = (option.services || []).map(s => s.id);

  const handleSaveName = () => {
    if (editName.trim() && editName !== option.name) {
      onUpdateOption({ name: editName.trim() });
    }
    if (editDescription !== (option.description || '')) {
      onUpdateOption({ description: editDescription.trim() || undefined });
    }
    setIsEditing(false);
  };

  const handleServiceDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderServices) return;

    const oldIndex = serviceIds.indexOf(active.id);
    const newIndex = serviceIds.indexOf(over.id);
    const reordered = arrayMove(option.services || [], oldIndex, newIndex);
    onReorderServices(reordered.map((s, i) => ({ id: s.id, sort_order: i })));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isDraft && (
              <span {...(dragHandleProps || {})} className="cursor-grab touch-none">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              </span>
            )}
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
        {/* Services list with DnD */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleServiceDragEnd}>
          <SortableContext items={serviceIds} strategy={verticalListSortingStrategy}>
            {option.services?.map(svc => (
              <SortableServiceRow
                key={svc.id}
                svc={svc}
                isDraft={isDraft}
                currency={currency}
                expandedServiceId={expandedServiceId}
                setExpandedServiceId={setExpandedServiceId}
                onDeleteService={onDeleteService}
                onDeleteFee={onDeleteFee}
                onUpdateFee={onUpdateFee}
                onAddFee={onAddFee}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add service */}
        {isDraft && (
          <AddServiceDialog
            services={services}
            onAdd={(serviceId, serviceName, partnerId, serviceDate) =>
              onAddService(serviceId, serviceName, partnerId, serviceDate)
            }
          />
        )}
      </CardContent>
    </Card>
  );
};
