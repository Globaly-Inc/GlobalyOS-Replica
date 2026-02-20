import { Search, Type, AlignLeft, Image, LayoutList, Minus, User, Mail, Phone, Calendar, FileText, Hash, ChevronDown, CheckSquare, CircleDot, Upload, Calculator, CreditCard, Heading1, Heading2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import type { FormNodeType, PaletteItem, FormNode } from '@/types/forms';

const PALETTE_ITEMS: PaletteItem[] = [
  // Basic Elements
  { type: 'heading', label: 'Heading', icon: 'Heading1', category: 'basic' },
  { type: 'subheading', label: 'Subheading', icon: 'Heading2', category: 'basic' },
  { type: 'paragraph', label: 'Paragraph', icon: 'AlignLeft', category: 'basic' },
  { type: 'image', label: 'Image', icon: 'Image', category: 'basic' },
  { type: 'section', label: 'Section', icon: 'LayoutList', category: 'basic' },
  { type: 'divider', label: 'Divider', icon: 'Minus', category: 'basic' },
  // Fields
  { type: 'text', label: 'Name', icon: 'User', category: 'field', defaultProperties: { label: 'Name', placeholder: 'Enter your name' } },
  { type: 'email', label: 'Email', icon: 'Mail', category: 'field', defaultProperties: { label: 'Email', placeholder: 'Enter your email' } },
  { type: 'phone', label: 'Phone', icon: 'Phone', category: 'field', defaultProperties: { label: 'Phone', placeholder: 'Enter phone number' } },
  { type: 'text', label: 'Street', icon: 'AlignLeft', category: 'field', defaultProperties: { label: 'Street Address', placeholder: 'Enter street address' } },
  { type: 'text', label: 'City', icon: 'AlignLeft', category: 'field', defaultProperties: { label: 'City', placeholder: 'Enter city' } },
  { type: 'dropdown', label: 'Country', icon: 'ChevronDown', category: 'field', defaultProperties: { label: 'Country', placeholder: 'Select country' } },
  { type: 'date', label: 'Date of Birth', icon: 'Calendar', category: 'field', defaultProperties: { label: 'Date of Birth' } },
  { type: 'file', label: 'File Upload', icon: 'Upload', category: 'field', defaultProperties: { label: 'Upload File' } },
  { type: 'textarea', label: 'Text Area', icon: 'FileText', category: 'field', defaultProperties: { label: 'Message', placeholder: 'Enter text...' } },
  { type: 'number', label: 'Number', icon: 'Hash', category: 'field', defaultProperties: { label: 'Number' } },
  { type: 'dropdown', label: 'Dropdown', icon: 'ChevronDown', category: 'field', defaultProperties: { label: 'Select', options: [{ label: 'Option 1', value: 'option_1' }] } },
  { type: 'multi_select', label: 'Multi Select', icon: 'CheckSquare', category: 'field', defaultProperties: { label: 'Multi Select', options: [{ label: 'Option 1', value: 'option_1' }] } },
  { type: 'checkbox', label: 'Checkbox', icon: 'CheckSquare', category: 'field', defaultProperties: { label: 'Checkbox' } },
  { type: 'radio', label: 'Radio', icon: 'CircleDot', category: 'field', defaultProperties: { label: 'Radio', options: [{ label: 'Option 1', value: 'option_1' }] } },
  { type: 'formula', label: 'Formula', icon: 'Calculator', category: 'field', defaultProperties: { label: 'Calculated Field' } },
  { type: 'payment', label: 'Payment', icon: 'CreditCard', category: 'field', defaultProperties: { label: 'Payment' } },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heading1, Heading2, AlignLeft, Image, LayoutList, Minus, User, Mail, Phone, Calendar,
  FileText, Hash, ChevronDown, CheckSquare, CircleDot, Upload, Calculator, CreditCard,
};

interface ElementsPaletteProps {
  onAddNode: (node: FormNode) => void;
}

export function ElementsPalette({ onAddNode }: ElementsPaletteProps) {
  const [search, setSearch] = useState('');

  const filtered = PALETTE_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const basic = filtered.filter((i) => i.category === 'basic');
  const fields = filtered.filter((i) => i.category === 'field');

  function handleAdd(item: PaletteItem) {
    const node: FormNode = {
      id: crypto.randomUUID(),
      type: item.type,
      properties: { label: item.label, ...item.defaultProperties },
      validation: item.defaultValidation ?? {},
      spacing: {},
      logicRules: [],
    };
    onAddNode(node);
  }

  return (
    <div className="w-60 border-r border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search elements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {basic.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Basic Elements
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {basic.map((item) => {
                const Icon = iconMap[item.icon] || Type;
                return (
                  <button
                    key={`${item.type}-${item.label}`}
                    onClick={() => handleAdd(item)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate w-full text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {fields.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Fields
            </h4>
            <div className="space-y-1">
              {fields.map((item, idx) => {
                const Icon = iconMap[item.icon] || Type;
                return (
                  <button
                    key={`${item.type}-${item.label}-${idx}`}
                    onClick={() => handleAdd(item)}
                    className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm text-left"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
