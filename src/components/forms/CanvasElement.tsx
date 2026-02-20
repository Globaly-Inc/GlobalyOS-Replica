import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, Type, Heading1, Heading2, AlignLeft, Image, LayoutList, Minus, Mail, Phone, Calendar, FileText, Hash, ChevronDown, CheckSquare, CircleDot, Upload, Calculator, CreditCard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormNode } from '@/types/forms';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  heading: Heading1,
  subheading: Heading2,
  paragraph: AlignLeft,
  image: Image,
  section: LayoutList,
  divider: Minus,
  text: User,
  email: Mail,
  phone: Phone,
  date: Calendar,
  textarea: FileText,
  number: Hash,
  dropdown: ChevronDown,
  multi_select: CheckSquare,
  checkbox: CheckSquare,
  radio: CircleDot,
  file: Upload,
  formula: Calculator,
  payment: CreditCard,
};

interface CanvasElementProps {
  node: FormNode;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  isHalfWidth?: boolean;
}

export function CanvasElement({ node, isSelected, onSelect, onRemove, onDuplicate, isHalfWidth }: CanvasElementProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = iconMap[node.type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={cn(
        'group relative flex items-start gap-2 p-3 rounded-lg border bg-card transition-all cursor-pointer',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        {node.type === 'divider' ? (
          <hr className="border-border my-2" />
        ) : node.type === 'heading' ? (
          <h2 className="text-lg font-semibold">{node.properties.content || node.properties.label || 'Heading'}</h2>
        ) : node.type === 'subheading' ? (
          <h3 className="text-base font-medium">{node.properties.content || node.properties.label || 'Subheading'}</h3>
        ) : node.type === 'paragraph' ? (
          <p className="text-sm text-muted-foreground">{node.properties.content || 'Paragraph text...'}</p>
        ) : node.type === 'image' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image className="h-8 w-8" />
            <span>Image block</span>
          </div>
        ) : node.type === 'section' ? (
          <div className="border border-dashed border-border rounded p-3">
            <span className="text-xs text-muted-foreground uppercase font-medium">Section: {node.properties.label || 'Untitled'}</span>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{node.properties.label || 'Untitled Field'}</span>
              {node.validation.required && <span className="text-xs text-destructive">*</span>}
            </div>
            {node.properties.description && (
              <p className="text-xs text-muted-foreground mb-1">{node.properties.description}</p>
            )}
            {/* Field preview */}
            <div className="bg-muted/40 rounded px-3 py-1.5 text-sm text-muted-foreground border border-border/50">
              {node.properties.placeholder || `Enter ${node.properties.label?.toLowerCase() || 'value'}...`}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isHalfWidth && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-1">½</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="text-muted-foreground hover:text-foreground p-1 rounded"
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-muted-foreground hover:text-destructive p-1 rounded"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
